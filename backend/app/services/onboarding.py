from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HackathonParticipant, Project, Submission, Task, Team, TeamMember, User
from app.schemas import OnboardingOut
from app.services.validator import validate_submission


async def get_onboarding_status(session: AsyncSession, user: User, hackathon_id: str) -> OnboardingOut:
    participant = await session.scalar(
        select(HackathonParticipant.id).where(
            HackathonParticipant.hackathon_id == hackathon_id,
            HackathonParticipant.user_id == user.id,
        )
    )
    team = await session.scalar(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(Team.hackathon_id == hackathon_id, TeamMember.user_id == user.id)
    )
    project = await session.scalar(select(Project).where(Project.team_id == team.id)) if team else None
    tasks = list(await session.scalars(select(Task).where(Task.project_id == project.id))) if project else []
    submission = await session.scalar(select(Submission).where(Submission.project_id == project.id)) if project else None
    validation = await validate_submission(session, project) if project else None

    states = [
        ("REGISTERED", True, "Complete your account profile"),
        ("PROFILE_COMPLETED", bool(user.full_name.strip()), "Complete your profile"),
        ("HACKATHON_JOINED", participant is not None, "Join this hackathon"),
        ("TEAM_JOINED", team is not None, "Create or join a team"),
        ("PROJECT_CREATED", project is not None, "Create a project workspace"),
        (
            "IDEATION_DONE",
            bool(project and project.title.strip() and project.tagline and project.description),
            "Add your project title, tagline, and description",
        ),
        ("FIRST_TASK_CREATED", bool(tasks), "Create your first task"),
        ("DEVELOPMENT_ACTIVE", any(task.status == "COMPLETED" for task in tasks), "Complete at least one task"),
        ("SUBMISSION_READY", bool(validation and validation.ready), "Clear the submission checklist"),
        ("SUBMITTED", bool(submission and submission.is_submitted), "Submit your project"),
    ]
    completed = sum(1 for _, done, _ in states if done)
    first_incomplete = next((index for index, (_, done, _) in enumerate(states) if not done), len(states))
    current_index = max(0, first_incomplete - 1)
    current_index = min(current_index, len(states) - 1)
    blockers = [message for _, done, message in states if not done]
    return OnboardingOut(
        current_step=states[current_index][0],
        next_step=states[first_incomplete][0] if first_incomplete < len(states) else None,
        progress_percent=round(completed * 100 / len(states)),
        blockers=blockers,
    )