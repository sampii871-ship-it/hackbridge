from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Milestone, Project, Submission
from app.schemas import MilestoneCreate, MilestoneOut, MilestonePatch
from app.services.access import ensure_hackathon_open, get_member_project, get_project_hackathon


router = APIRouter(tags=["milestones"])


async def ensure_project_editable(session: DbSession, project: Project) -> None:
    ensure_hackathon_open(await get_project_hackathon(session, project))
    submitted = await session.scalar(
        select(Submission.id).where(Submission.project_id == project.id, Submission.is_submitted)
    )
    if submitted:
        raise HTTPException(status_code=409, detail="A submitted project can no longer be edited")


@router.get("/projects/{project_id}/milestones", response_model=list[MilestoneOut])
async def list_milestones(project_id: str, session: DbSession, user: CurrentUser) -> list[Milestone]:
    await get_member_project(session, user.id, project_id)
    result = await session.scalars(
        select(Milestone).where(Milestone.project_id == project_id).order_by(Milestone.target_date)
    )
    return list(result)


@router.post(
    "/projects/{project_id}/milestones",
    response_model=MilestoneOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_milestone(
    project_id: str,
    payload: MilestoneCreate,
    session: DbSession,
    user: CurrentUser,
) -> Milestone:
    project = await get_member_project(session, user.id, project_id)
    await ensure_project_editable(session, project)
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Milestone title cannot be blank")
    milestone = Milestone(project_id=project_id, title=title, target_date=payload.target_date)
    session.add(milestone)
    await session.commit()
    await session.refresh(milestone)
    return milestone


@router.patch("/milestones/{milestone_id}", response_model=MilestoneOut)
async def update_milestone(
    milestone_id: str,
    payload: MilestonePatch,
    session: DbSession,
    user: CurrentUser,
) -> Milestone:
    milestone = await session.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    project = await get_member_project(session, user.id, milestone.project_id)
    await ensure_project_editable(session, project)
    updates = payload.model_dump(exclude_unset=True)
    if "target_date" in updates and updates["target_date"] is None:
        raise HTTPException(status_code=422, detail="Milestone target date cannot be null")
    if "title" in updates:
        if updates["title"] is None:
            raise HTTPException(status_code=422, detail="Milestone title cannot be blank")
        updates["title"] = updates["title"].strip()
        if not updates["title"]:
            raise HTTPException(status_code=422, detail="Milestone title cannot be blank")
    for field, value in updates.items():
        setattr(milestone, field, value)
    await session.commit()
    await session.refresh(milestone)
    return milestone