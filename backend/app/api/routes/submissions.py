from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Submission
from app.schemas import SubmissionOut, SubmissionPatch, ValidationOut
from app.services.access import ensure_hackathon_open, get_member_project, get_project_hackathon
from app.services.validator import validate_submission


router = APIRouter(tags=["submissions"])


async def get_or_create_submission(session: DbSession, project_id: str) -> Submission:
    submission = await session.scalar(select(Submission).where(Submission.project_id == project_id))
    if submission is None:
        submission = Submission(project_id=project_id)
        session.add(submission)
        await session.flush()
    return submission


@router.patch("/projects/{project_id}/submission", response_model=SubmissionOut)
async def update_submission(
    project_id: str,
    payload: SubmissionPatch,
    session: DbSession,
    user: CurrentUser,
) -> Submission:
    project = await get_member_project(session, user.id, project_id)
    ensure_hackathon_open(await get_project_hackathon(session, project))
    submission = await get_or_create_submission(session, project_id)
    if submission.is_submitted:
        raise HTTPException(status_code=409, detail="A submitted project can no longer be edited")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(submission, field, str(value) if field == "video_url" and value is not None else value)
    await session.commit()
    await session.refresh(submission)
    return submission


@router.post("/projects/{project_id}/submission/validate", response_model=ValidationOut)
async def validate_project_submission(project_id: str, session: DbSession, user: CurrentUser) -> ValidationOut:
    project = await get_member_project(session, user.id, project_id)
    return await validate_submission(session, project)


@router.post("/projects/{project_id}/submission/submit", response_model=SubmissionOut)
async def submit_project(project_id: str, session: DbSession, user: CurrentUser) -> Submission:
    project = await get_member_project(session, user.id, project_id)
    ensure_hackathon_open(await get_project_hackathon(session, project))
    submission = await get_or_create_submission(session, project_id)
    if submission.is_submitted:
        raise HTTPException(status_code=409, detail="This project has already been submitted")
    validation = await validate_submission(session, project)
    if not validation.ready:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "VALIDATION_FAILED",
                "message": "Submission requirements are not complete",
                "errors": validation.errors,
            },
        )
    submission.is_submitted = True
    submission.submitted_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(submission)
    return submission


@router.get("/projects/{project_id}/submission", response_model=SubmissionOut | None)
async def get_submission(project_id: str, session: DbSession, user: CurrentUser) -> Submission | None:
    await get_member_project(session, user.id, project_id)
    return await session.scalar(select(Submission).where(Submission.project_id == project_id))