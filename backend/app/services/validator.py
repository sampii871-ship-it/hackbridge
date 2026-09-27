from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project, Task
from app.schemas import CheckOut, ValidationOut


def valid_url(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


async def validate_submission(session: AsyncSession, project: Project) -> ValidationOut:
    task_result = await session.execute(select(Task.id).where(Task.project_id == project.id).limit(1))
    has_task = task_result.first() is not None
    checks = [
        CheckOut(key="project_title", passed=bool(project.title.strip())),
        CheckOut(key="project_description", passed=bool((project.description or "").strip())),
        CheckOut(key="repository_url", passed=valid_url(project.repository_url)),
        CheckOut(key="task_created", passed=has_task),
    ]
    errors = [check.key.replace("_", " ").capitalize() + " is required" for check in checks if not check.passed]
    warnings = [] if valid_url(project.demo_url) else ["A demo link can help reviewers understand your project"]
    return ValidationOut(ready=not errors, errors=errors, warnings=warnings, checks=checks)