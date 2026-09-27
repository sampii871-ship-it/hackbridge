from fastapi import APIRouter

from app.api.routes.ai import router as ai_router
from app.api.routes.auth import router as auth_router
from app.api.routes.hackathons import router as hackathons_router
from app.api.routes.milestones import router as milestones_router
from app.api.routes.projects import router as projects_router
from app.api.routes.submissions import router as submissions_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.teams import router as teams_router
from app.api.routes.users import router as users_router


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(hackathons_router)
api_router.include_router(teams_router)
api_router.include_router(projects_router)
api_router.include_router(tasks_router)
api_router.include_router(milestones_router)
api_router.include_router(submissions_router)
api_router.include_router(ai_router)