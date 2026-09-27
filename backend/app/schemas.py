from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("full_name")
    @classmethod
    def trim_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

    @field_validator("password")
    @classmethod
    def bcrypt_password_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPatch(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)


class UserOut(ORMModel):
    id: str
    email: EmailStr
    full_name: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class HackathonCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    start_time: datetime
    end_time: datetime
    is_active: bool = True


class HackathonPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    is_active: bool | None = None


class HackathonOut(ORMModel):
    id: str
    title: str
    description: str | None
    start_time: datetime
    end_time: datetime
    is_active: bool


class HackathonAnalytics(BaseModel):
    participants: int
    teams: int
    projects: int
    submitted_projects: int
    onboarding_dropoff: int


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    project_title: str = Field(default="Untitled project", min_length=1, max_length=255)


class TeamPatch(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class TeamJoin(BaseModel):
    invite_code: str = Field(min_length=4, max_length=32)


class TeamOut(ORMModel):
    id: str
    hackathon_id: str
    name: str
    invite_code: str
    leader_id: str


class TeamWorkspaceOut(TeamOut):
    project_id: str


class ProjectPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    tagline: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=10000)
    repository_url: HttpUrl | None = None
    demo_url: HttpUrl | None = None
    tech_stack: list[str] | None = None


class ProjectOut(ORMModel):
    id: str
    team_id: str
    title: str
    tagline: str | None
    description: str | None
    repository_url: str | None
    demo_url: str | None
    tech_stack: list[str] | None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    due_date: datetime | None = None
    assignee_id: str | None = None


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    status: Literal["TODO", "IN_PROGRESS", "COMPLETED"] | None = None
    due_date: datetime | None = None
    assignee_id: str | None = None


class TaskOut(ORMModel):
    id: str
    project_id: str
    title: str
    status: str
    due_date: datetime | None
    assignee_id: str | None


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    target_date: datetime


class MilestonePatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    target_date: datetime | None = None
    is_completed: bool | None = None


class MilestoneOut(ORMModel):
    id: str
    project_id: str
    title: str
    target_date: datetime
    is_completed: bool


class ProgressOut(BaseModel):
    tasks_total: int
    tasks_completed: int
    milestones_total: int
    milestones_completed: int
    completion_percent: int
    submission_ready: bool


class SubmissionPatch(BaseModel):
    video_url: HttpUrl | None = None
    documentation: str | None = Field(default=None, max_length=20000)


class CheckOut(BaseModel):
    key: str
    passed: bool


class ValidationOut(BaseModel):
    ready: bool
    errors: list[str]
    warnings: list[str]
    checks: list[CheckOut]


class SubmissionOut(ORMModel):
    id: str
    project_id: str
    video_url: str | None
    documentation: str | None
    is_submitted: bool
    submitted_at: datetime | None


class OnboardingOut(BaseModel):
    current_step: str
    next_step: str | None
    progress_percent: int
    blockers: list[str]


class AIBreakdownIn(BaseModel):
    idea_description: str = Field(min_length=10, max_length=5000)


class AITaskSuggestion(BaseModel):
    title: str
    status: Literal["TODO"] = "TODO"


class AIBreakdownOut(BaseModel):
    summary: str
    tasks: list[AITaskSuggestion]
    provider: str


class AIReviewOut(BaseModel):
    ready: bool
    feedback: list[str]
    validation: ValidationOut