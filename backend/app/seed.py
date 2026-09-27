import argparse
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update

from app.core.config import settings
from app.core.database import SessionFactory
from app.core.security import hash_password
from app.models import (
    AIInteraction,
    Activity,
    Hackathon,
    HackathonParticipant,
    Milestone,
    Notification,
    Project,
    Submission,
    Task,
    Team,
    TeamMember,
    User,
)


DEMO_NAMES = ("alex", "jamie", "sam", "priya", "devon", "omar", "lena", "nia", "mateo", "organizer")
DEMO_DOMAINS = ("example.com", "hackbridge-demo.com", "demo.hackbridge.test")
DEMO_EMAILS = tuple(f"{name}@{domain}" for name in DEMO_NAMES for domain in DEMO_DOMAINS)
DEMO_TEAM_CODES = ("GROUND26", "PANTRY26", "SIDEWALK26")


async def seed() -> None:
    if not settings.admin_email or not settings.admin_password:
        raise SystemExit("Set ADMIN_EMAIL and ADMIN_PASSWORD in the workspace .env before seeding")

    async with SessionFactory() as session:
        email = settings.admin_email.lower()
        admin = await session.scalar(select(User).where(User.email == email))
        if admin is None:
            session.add(
                User(
                    email=email,
                    full_name="Hackbridge Organizer",
                    hashed_password=hash_password(settings.admin_password),
                    role="admin",
                )
            )

        hackathon = await session.scalar(select(Hackathon).where(Hackathon.title == "Fieldnotes Hack"))
        if hackathon is None:
            start_time = datetime.now(timezone.utc) + timedelta(days=14)
            session.add(
                Hackathon(
                    title="Fieldnotes Hack",
                    description="Build small tools that bring your neighborhood closer together.",
                    start_time=start_time,
                    end_time=start_time + timedelta(days=2),
                    is_active=True,
                )
            )
        await session.commit()
    print("Organizer and Fieldnotes Hack seed data are ready.")


async def remove_previous_demo_profiles(session) -> None:
    user_ids = list(await session.scalars(select(User.id).where(User.email.in_(DEMO_EMAILS))))
    teams = list(await session.scalars(select(Team).where(Team.invite_code.in_(DEMO_TEAM_CODES))))
    team_ids = [team.id for team in teams]
    project_ids = list(await session.scalars(select(Project.id).where(Project.team_id.in_(team_ids)))) if team_ids else []

    if user_ids:
        protected_user_ids = set(
            await session.scalars(
                select(Team.leader_id).where(
                    Team.leader_id.in_(user_ids),
                    Team.invite_code.not_in(DEMO_TEAM_CODES),
                )
            )
        )
        user_ids = list(set(user_ids) - protected_user_ids)

    if project_ids:
        await session.execute(delete(Task).where(Task.project_id.in_(project_ids)))
        await session.execute(delete(Milestone).where(Milestone.project_id.in_(project_ids)))
        await session.execute(delete(Submission).where(Submission.project_id.in_(project_ids)))
        await session.execute(delete(AIInteraction).where(AIInteraction.project_id.in_(project_ids)))
        await session.execute(delete(Project).where(Project.id.in_(project_ids)))

    if user_ids:
        await session.execute(update(Task).where(Task.assignee_id.in_(user_ids)).values(assignee_id=None))
        await session.execute(delete(HackathonParticipant).where(HackathonParticipant.user_id.in_(user_ids)))
        await session.execute(delete(Notification).where(Notification.user_id.in_(user_ids)))
        await session.execute(delete(AIInteraction).where(AIInteraction.user_id.in_(user_ids)))
        await session.execute(delete(TeamMember).where(TeamMember.user_id.in_(user_ids)))
        await session.execute(delete(Activity).where(Activity.user_id.in_(user_ids)))

    if team_ids:
        await session.execute(delete(TeamMember).where(TeamMember.team_id.in_(team_ids)))
        await session.execute(delete(Activity).where(Activity.team_id.in_(team_ids)))

    if team_ids:
        await session.execute(delete(Team).where(Team.id.in_(team_ids)))
    if user_ids:
        await session.execute(delete(User).where(User.id.in_(user_ids)))


async def upsert_event(session, title: str, description: str, start_time: datetime, end_time: datetime) -> None:
    event = await session.scalar(select(Hackathon).where(Hackathon.title == title))
    if event is None:
        session.add(
            Hackathon(
                title=title,
                description=description,
                start_time=start_time,
                end_time=end_time,
                is_active=True,
            )
        )
    else:
        event.description = description
        event.start_time = start_time
        event.end_time = end_time
        event.is_active = True


async def seed_demo() -> None:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    async with SessionFactory() as session:
        await remove_previous_demo_profiles(session)
        await upsert_event(
            session,
            "Civic Futures Weekend",
            "Build practical tools that make neighborhoods more connected, resilient, and welcoming.",
            now - timedelta(hours=6),
            now + timedelta(days=5),
        )
        await upsert_event(
            session,
            "Open Source for Good",
            "A collaborative sprint for useful, open tools with a measurable community impact.",
            now + timedelta(days=8),
            now + timedelta(days=10),
        )
        await session.commit()

    print("Fictional hackathon details are ready; no profiles or teams were created.")
    print("Existing user accounts and profiles were preserved.")
    print("Events: Civic Futures Weekend, Open Source for Good")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Hackbridge organizer or event-only demo records")
    parser.add_argument("--demo", action="store_true", help="Create fictional hackathon events without creating profiles")
    arguments = parser.parse_args()
    asyncio.run(seed_demo() if arguments.demo else seed())
