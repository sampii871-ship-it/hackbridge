from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models import AIInteraction
from app.schemas import AIBreakdownIn, AIBreakdownOut, AIReviewOut
from app.services.access import get_member_project
from app.services.ai import get_ai_provider
from app.services.validator import validate_submission


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/breakdown", response_model=AIBreakdownOut)
async def generate_project_breakdown(payload: AIBreakdownIn, session: DbSession, user: CurrentUser) -> AIBreakdownOut:
    provider = get_ai_provider(settings.ai_provider)
    response = await provider.generate_project_breakdown(payload.idea_description)
    session.add(
        AIInteraction(
            user_id=user.id,
            prompt=payload.idea_description,
            response=response.model_dump_json(),
            provider=provider.name,
        )
    )
    await session.commit()
    return response


@router.post("/projects/{project_id}/review", response_model=AIReviewOut)
async def review_project(project_id: str, session: DbSession, user: CurrentUser) -> AIReviewOut:
    project = await get_member_project(session, user.id, project_id)
    validation = await validate_submission(session, project)
    provider = get_ai_provider(settings.ai_provider)
    feedback = await provider.review_submission(validation)
    response = AIReviewOut(ready=validation.ready, feedback=feedback, validation=validation)
    session.add(
        AIInteraction(
            user_id=user.id,
            project_id=project.id,
            prompt="Review project submission readiness",
            response=response.model_dump_json(),
            provider=provider.name,
        )
    )
    await session.commit()
    return response