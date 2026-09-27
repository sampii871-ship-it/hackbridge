from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Hackathon, Project, Team, TeamMember


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def ensure_hackathon_open(hackathon: Hackathon) -> None:
    if datetime.now(timezone.utc) > as_utc(hackathon.end_time):
        raise HTTPException(status_code=409, detail="The hackathon has ended; writes are closed")


async def get_member_project(session: AsyncSession, user_id: str, project_id: str) -> Project:
    result = await session.execute(
        select(Project)
        .join(Team, Team.id == Project.team_id)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(Project.id == project_id, TeamMember.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def get_project_hackathon(session: AsyncSession, project: Project) -> Hackathon:
    team = await session.get(Team, project.team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Project not found")
    hackathon = await session.get(Hackathon, team.hackathon_id)
    if hackathon is None:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return hackathon