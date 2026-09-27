from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.schemas import UserOut, UserPatch


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_profile(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_profile(payload: UserPatch, user: CurrentUser, session: DbSession) -> UserOut:
    if payload.full_name is not None:
        full_name = payload.full_name.strip()
        if not full_name:
            raise HTTPException(status_code=422, detail="Name cannot be blank")
        user.full_name = full_name
    await session.commit()
    await session.refresh(user)
    return UserOut.model_validate(user)