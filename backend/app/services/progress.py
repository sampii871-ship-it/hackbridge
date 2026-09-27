from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Milestone, Project, Task
from app.schemas import ProgressOut
from app.services.validator import validate_submission


async def calculate_project_progress(session: AsyncSession, project: Project) -> ProgressOut:
    task_result = await session.execute(
        select(func.count(Task.id), func.sum(case((Task.status == "COMPLETED", 1), else_=0))).where(
            Task.project_id == project.id
        )
    )
    tasks_total, tasks_completed = task_result.one()
    milestone_result = await session.execute(
        select(func.count(Milestone.id), func.sum(case((Milestone.is_completed.is_(True), 1), else_=0))).where(
            Milestone.project_id == project.id
        )
    )
    milestones_total, milestones_completed = milestone_result.one()
    validation = await validate_submission(session, project)
    total = int(tasks_total or 0)
    completed = int(tasks_completed or 0)
    total_milestones = int(milestones_total or 0)
    completed_milestones = int(milestones_completed or 0)
    return ProgressOut(
        tasks_total=total,
        tasks_completed=completed,
        milestones_total=total_milestones,
        milestones_completed=completed_milestones,
        completion_percent=round(completed * 100 / total) if total else 0,
        submission_ready=validation.ready,
    )