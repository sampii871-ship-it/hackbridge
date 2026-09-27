from abc import ABC, abstractmethod

from app.schemas import AIBreakdownOut, AITaskSuggestion, ValidationOut


class BaseAIProvider(ABC):
    name: str

    @abstractmethod
    async def generate_project_breakdown(self, idea_description: str) -> AIBreakdownOut:
        raise NotImplementedError

    @abstractmethod
    async def review_submission(self, validation: ValidationOut) -> list[str]:
        raise NotImplementedError


class MockAIProvider(BaseAIProvider):
    name = "mock"

    async def generate_project_breakdown(self, idea_description: str) -> AIBreakdownOut:
        return AIBreakdownOut(
            summary=f"A starter plan for: {idea_description[:180].strip()}",
            tasks=[
                AITaskSuggestion(title="Define the first users and their main need"),
                AITaskSuggestion(title="Sketch the smallest useful user journey"),
                AITaskSuggestion(title="Build a working version of the core flow"),
                AITaskSuggestion(title="Test the prototype and capture feedback"),
            ],
            provider=self.name,
        )

    async def review_submission(self, validation: ValidationOut) -> list[str]:
        if validation.ready:
            return ["The required project details are present. Add a demo link if you have time."]
        return [f"Address this before submission: {error}" for error in validation.errors]


def get_ai_provider(provider_name: str) -> BaseAIProvider:
    if provider_name != "mock":
        raise ValueError(f"AI provider '{provider_name}' is not configured")
    return MockAIProvider()