from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Submission
from app.schemas import ProgressOut, ProjectOut, ProjectPatch
from app.services.access import ensure_hackathon_open, get_member_project, get_project_hackathon
from app.services.progress import calculate_project_progress


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, session: DbSession, user: CurrentUser):
    return await get_member_project(session, user.id, project_id)


@router.get("/{project_id}/progress", response_model=ProgressOut)
async def get_project_progress(project_id: str, session: DbSession, user: CurrentUser) -> ProgressOut:
    project = await get_member_project(session, user.id, project_id)
    return await calculate_project_progress(session, project)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, payload: ProjectPatch, session: DbSession, user: CurrentUser):
    project = await get_member_project(session, user.id, project_id)
    hackathon = await get_project_hackathon(session, project)
    ensure_hackathon_open(hackathon)
    submission = await session.scalar(select(Submission).where(Submission.project_id == project.id))
    if submission is not None and submission.is_submitted:
        raise HTTPException(status_code=409, detail="A submitted project can no longer be edited")
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates and (updates["title"] is None or not updates["title"].strip()):
        raise HTTPException(status_code=422, detail="Project title cannot be blank")
    for field, value in updates.items():
        if field == "title":
            value = value.strip()
        setattr(project, field, str(value) if field in {"repository_url", "demo_url"} and value is not None else value)
    await session.commit()
    await session.refresh(project)
    return project