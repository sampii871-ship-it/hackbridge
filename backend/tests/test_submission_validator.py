from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.access import ensure_hackathon_open
from app.services.validator import validate_submission, valid_url


class FakeResult:
    def __init__(self, has_task: bool):
        self.has_task = has_task

    def first(self):
        return ("task-id",) if self.has_task else None


class FakeSession:
    def __init__(self, has_task: bool):
        self.has_task = has_task

    async def execute(self, statement):
        del statement
        return FakeResult(self.has_task)


def test_valid_url_requires_http_scheme_and_host():
    assert valid_url("https://github.com/team/project")
    assert valid_url("http://localhost:8000")
    assert not valid_url("github.com/team/project")
    assert not valid_url("javascript:alert(1)")


@pytest.mark.asyncio
async def test_validation_passes_with_required_project_fields_and_a_task():
    project = SimpleNamespace(
        id="project-id",
        title="Neighborhood Map",
        description="A map of useful local places",
        repository_url="https://github.com/team/project",
        demo_url=None,
    )

    result = await validate_submission(FakeSession(has_task=True), project)

    assert result.ready
    assert result.errors == []
    assert result.warnings


@pytest.mark.asyncio
async def test_validation_blocks_missing_repository_and_task():
    project = SimpleNamespace(
        id="project-id",
        title="Neighborhood Map",
        description="A map of useful local places",
        repository_url=None,
        demo_url=None,
    )

    result = await validate_submission(FakeSession(has_task=False), project)

    assert not result.ready
    assert {check.key for check in result.checks if not check.passed} == {"repository_url", "task_created"}


def test_writes_are_rejected_after_event_end():
    ended = SimpleNamespace(end_time=datetime.now(timezone.utc) - timedelta(seconds=1))

    with pytest.raises(HTTPException) as exc_info:
        ensure_hackathon_open(ended)

    assert exc_info.value.status_code == 409