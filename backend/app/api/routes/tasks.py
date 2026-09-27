from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Project, Submission, Task, Team, TeamMember
from app.schemas import TaskCreate, TaskOut, TaskPatch
from app.services.access import ensure_hackathon_open, get_member_project, get_project_hackathon


router = APIRouter(tags=["tasks"])


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
async def list_tasks(project_id: str, session: DbSession, user: CurrentUser) -> list[Task]:
    await get_member_project(session, user.id, project_id)
    result = await session.scalars(select(Task).where(Task.project_id == project_id).order_by(Task.created_at))
    return list(result)


@router.post("/projects/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(project_id: str, payload: TaskCreate, session: DbSession, user: CurrentUser) -> Task:
    project = await get_member_project(session, user.id, project_id)
    ensure_hackathon_open(await get_project_hackathon(session, project))
    submitted = await session.scalar(select(Submission.id).where(Submission.project_id == project_id, Submission.is_submitted))
    if submitted:
        raise HTTPException(status_code=409, detail="A submitted project can no longer be edited")
    if payload.assignee_id:
        valid_assignee = await session.scalar(
            select(TeamMember.id)
            .join(Team, Team.id == TeamMember.team_id)
            .where(Team.id == project.team_id, TeamMember.user_id == payload.assignee_id)
        )
        if valid_assignee is None:
            raise HTTPException(status_code=422, detail="Assignee must be a member of this team")
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Task title cannot be blank")
    task = Task(project_id=project_id, title=title, **payload.model_dump(exclude={"title"}))
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, payload: TaskPatch, session: DbSession, user: CurrentUser) -> Task:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    project = await get_member_project(session, user.id, task.project_id)
    ensure_hackathon_open(await get_project_hackathon(session, project))
    submitted = await session.scalar(select(Submission.id).where(Submission.project_id == project.id, Submission.is_submitted))
    if submitted:
        raise HTTPException(status_code=409, detail="A submitted project can no longer be edited")
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates and (updates["title"] is None or not updates["title"].strip()):
        raise HTTPException(status_code=422, detail="Task title cannot be blank")
    if updates.get("assignee_id"):
        valid_assignee = await session.scalar(
            select(TeamMember.id)
            .join(Team, Team.id == TeamMember.team_id)
            .where(Team.id == project.team_id, TeamMember.user_id == updates["assignee_id"])
        )
        if valid_assignee is None:
            raise HTTPException(status_code=422, detail="Assignee must be a member of this team")
    for field, value in updates.items():
        setattr(task, field, value.strip() if field == "title" and value is not None else value)
    await session.commit()
    await session.refresh(task)
    return task