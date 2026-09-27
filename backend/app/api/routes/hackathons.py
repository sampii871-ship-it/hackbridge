from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models import Hackathon, HackathonParticipant, Project, Submission, Team, TeamMember
from app.schemas import HackathonAnalytics, HackathonCreate, HackathonOut, HackathonPatch, OnboardingOut
from app.services.access import as_utc, ensure_hackathon_open
from app.services.onboarding import get_onboarding_status


router = APIRouter(prefix="/hackathons", tags=["hackathons"])


@router.get("", response_model=list[HackathonOut])
async def list_hackathons(session: DbSession) -> list[Hackathon]:
    result = await session.scalars(select(Hackathon).where(Hackathon.is_active).order_by(Hackathon.start_time))
    return list(result)


@router.post("", response_model=HackathonOut, status_code=status.HTTP_201_CREATED)
async def create_hackathon(payload: HackathonCreate, session: DbSession, _: AdminUser) -> Hackathon:
    if as_utc(payload.end_time) <= as_utc(payload.start_time):
        raise HTTPException(status_code=422, detail="The end time must be after the start time")
    values = payload.model_dump()
    values["title"] = payload.title.strip()
    if not values["title"]:
        raise HTTPException(status_code=422, detail="Hackathon title cannot be blank")
    hackathon = Hackathon(**values)
    session.add(hackathon)
    await session.commit()
    await session.refresh(hackathon)
    return hackathon


@router.post("/{hackathon_id}/join", status_code=status.HTTP_201_CREATED)
async def join_hackathon(hackathon_id: str, session: DbSession, user: CurrentUser) -> dict[str, str]:
    hackathon = await session.get(Hackathon, hackathon_id)
    if hackathon is None or not hackathon.is_active:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    ensure_hackathon_open(hackathon)
    existing = await session.scalar(
        select(HackathonParticipant).where(
            HackathonParticipant.hackathon_id == hackathon_id,
            HackathonParticipant.user_id == user.id,
        )
    )
    if existing is not None:
        return {"status": "already_joined"}
    session.add(HackathonParticipant(hackathon_id=hackathon_id, user_id=user.id))
    await session.commit()
    return {"status": "joined"}


@router.get("/{hackathon_id}/onboarding", response_model=OnboardingOut)
async def onboarding_status(hackathon_id: str, session: DbSession, user: CurrentUser) -> OnboardingOut:
    if await session.get(Hackathon, hackathon_id) is None:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return await get_onboarding_status(session, user, hackathon_id)


@router.patch("/{hackathon_id}", response_model=HackathonOut)
async def update_hackathon(
    hackathon_id: str,
    payload: HackathonPatch,
    session: DbSession,
    _: AdminUser,
) -> Hackathon:
    hackathon = await session.get(Hackathon, hackathon_id)
    if hackathon is None:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    updates = payload.model_dump(exclude_unset=True)
    for field in ("start_time", "end_time", "is_active"):
        if field in updates and updates[field] is None:
            raise HTTPException(status_code=422, detail=f"{field} cannot be null")
    title = updates.get("title")
    if "title" in updates:
        if title is None or not title.strip():
            raise HTTPException(status_code=422, detail="Hackathon title cannot be blank")
        updates["title"] = title.strip()
    start_time = updates.get("start_time", hackathon.start_time)
    end_time = updates.get("end_time", hackathon.end_time)
    if as_utc(end_time) <= as_utc(start_time):
        raise HTTPException(status_code=422, detail="The end time must be after the start time")
    for field, value in updates.items():
        setattr(hackathon, field, value)
    await session.commit()
    await session.refresh(hackathon)
    return hackathon


@router.get("/{hackathon_id}/analytics", response_model=HackathonAnalytics)
async def hackathon_analytics(hackathon_id: str, session: DbSession, _: AdminUser) -> HackathonAnalytics:
    if await session.get(Hackathon, hackathon_id) is None:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    participants = await session.scalar(
        select(func.count(HackathonParticipant.id)).where(HackathonParticipant.hackathon_id == hackathon_id)
    ) or 0
    teams = await session.scalar(select(func.count(Team.id)).where(Team.hackathon_id == hackathon_id)) or 0
    projects = await session.scalar(
        select(func.count(Project.id)).join(Team, Team.id == Project.team_id).where(Team.hackathon_id == hackathon_id)
    ) or 0
    submissions = await session.scalar(
        select(func.count(Submission.id))
        .join(Project, Project.id == Submission.project_id)
        .join(Team, Team.id == Project.team_id)
        .where(Team.hackathon_id == hackathon_id, Submission.is_submitted.is_(True))
    ) or 0
    teamed_participants = await session.scalar(
        select(func.count(func.distinct(TeamMember.user_id)))
        .where(TeamMember.hackathon_id == hackathon_id)
    ) or 0
    return HackathonAnalytics(
        participants=int(participants),
        teams=int(teams),
        projects=int(projects),
        submitted_projects=int(submissions),
        onboarding_dropoff=max(0, int(participants) - int(teamed_participants)),
    )