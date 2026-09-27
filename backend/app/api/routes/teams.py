import secrets

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.models import (
    Hackathon,
    HackathonParticipant,
    Project,
    Team,
    TeamMember,
    User,
)
from app.schemas import TeamCreate, TeamJoin, TeamOut, TeamPatch, TeamWorkspaceOut, UserOut
from app.services.access import ensure_hackathon_open


router = APIRouter(prefix="/teams", tags=["teams"])


async def user_team(session, user_id: str, hackathon_id: str) -> Team | None:
    return await session.scalar(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(Team.hackathon_id == hackathon_id, TeamMember.user_id == user_id)
    )


@router.post("/join", response_model=TeamOut)
async def join_team(payload: TeamJoin, session: DbSession, user: CurrentUser) -> Team:
    team = await session.scalar(select(Team).where(Team.invite_code == payload.invite_code.upper()))
    if team is None:
        raise HTTPException(status_code=404, detail="Invite code not found")
    hackathon = await session.get(Hackathon, team.hackathon_id)
    if hackathon is None:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    ensure_hackathon_open(hackathon)
    participant = await session.scalar(
        select(HackathonParticipant.id).where(
            HackathonParticipant.hackathon_id == team.hackathon_id,
            HackathonParticipant.user_id == user.id,
        )
    )
    if participant is None:
        raise HTTPException(status_code=409, detail="Join the hackathon before joining a team")
    if await user_team(session, user.id, team.hackathon_id):
        raise HTTPException(status_code=409, detail="You already belong to a team in this hackathon")
    session.add(TeamMember(hackathon_id=team.hackathon_id, team_id=team.id, user_id=user.id))
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="You already belong to a team in this hackathon") from exc
    return team


@router.post("/hackathons/{hackathon_id}", response_model=TeamWorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_team(
    hackathon_id: str,
    payload: TeamCreate,
    session: DbSession,
    user: CurrentUser,
) -> TeamWorkspaceOut:
    hackathon = await session.get(Hackathon, hackathon_id)
    if hackathon is None or not hackathon.is_active:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    ensure_hackathon_open(hackathon)
    participant = await session.scalar(
        select(HackathonParticipant.id).where(
            HackathonParticipant.hackathon_id == hackathon_id,
            HackathonParticipant.user_id == user.id,
        )
    )
    if participant is None:
        raise HTTPException(status_code=409, detail="Join the hackathon before creating a team")
    if await user_team(session, user.id, hackathon_id):
        raise HTTPException(status_code=409, detail="You already belong to a team in this hackathon")
    if not payload.name.strip() or not payload.project_title.strip():
        raise HTTPException(status_code=422, detail="Team and project names cannot be blank")
    team = Team(
        hackathon_id=hackathon_id,
        name=payload.name.strip(),
        invite_code=secrets.token_urlsafe(9).replace("-", "A").replace("_", "B").upper(),
        leader_id=user.id,
    )
    session.add(team)
    await session.flush()
    session.add(TeamMember(hackathon_id=hackathon_id, team_id=team.id, user_id=user.id))
    project = Project(team_id=team.id, title=payload.project_title.strip(), tech_stack=[])
    session.add(project)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="You already belong to a team in this hackathon") from exc
    await session.refresh(team)
    return TeamWorkspaceOut.model_validate({**TeamOut.model_validate(team).model_dump(), "project_id": project.id})


@router.get("/me", response_model=TeamWorkspaceOut)
async def get_my_team(hackathon_id: str, session: DbSession, user: CurrentUser) -> TeamWorkspaceOut:
    team = await user_team(session, user.id, hackathon_id)
    if team is None:
        raise HTTPException(status_code=404, detail="You are not on a team in this hackathon")
    project = await session.scalar(select(Project).where(Project.team_id == team.id))
    if project is None:
        raise HTTPException(status_code=404, detail="Team project not found")
    return TeamWorkspaceOut.model_validate({**TeamOut.model_validate(team).model_dump(), "project_id": project.id})


@router.get("/{team_id}/members", response_model=list[UserOut])
async def list_members(team_id: str, session: DbSession, user: CurrentUser) -> list[User]:
    is_member = await session.scalar(
        select(TeamMember.id).where(TeamMember.team_id == team_id, TeamMember.user_id == user.id)
    )
    if is_member is None:
        raise HTTPException(status_code=404, detail="Team not found")
    result = await session.scalars(
        select(User).join(TeamMember, TeamMember.user_id == User.id).where(TeamMember.team_id == team_id)
    )
    return list(result)


@router.patch("/{team_id}", response_model=TeamOut)
async def update_team(team_id: str, payload: TeamPatch, session: DbSession, user: CurrentUser) -> Team:
    team = await session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.leader_id != user.id:
        raise HTTPException(status_code=403, detail="Only the team leader can update the team profile")
    hackathon = await session.get(Hackathon, team.hackathon_id)
    if hackathon is None:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    ensure_hackathon_open(hackathon)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Team name cannot be blank")
    team.name = name
    await session.commit()
    await session.refresh(team)
    return team