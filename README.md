# Hackbridge

Hackbridge is a multi-file React and FastAPI workspace for hackathon teams. The frontend lives in `frontend/src`; the async SQLAlchemy API and MySQL models live in `backend/app`.

## Run with Docker

1. Copy `.env.example` to `.env` and set a unique `JWT_SECRET`.
2. From the workspace root, run `docker compose up --build`.
3. In another terminal, run `docker compose exec api python -m app.seed --demo` to add fictional hackathon event details only.
4. Open `http://localhost:5173`. API documentation is at `http://localhost:8000/docs`.

The frontend is built by its Node/Nginx image and served separately from FastAPI. Nginx proxies `/api` requests to the API container. The API applies the initial Alembic migration on startup.

## Local Frontend Development

Install Node.js 22 or newer. Start the API and database with `docker compose up --build db api`, then run `npm install` and `npm run dev` from `frontend`. Vite serves the UI at `http://localhost:5173` and proxies API requests to port 8000.

## Share on the Same Wi-Fi

Run the frontend with `npm run dev -- --host 0.0.0.0` from `frontend`. Vite prints a `Network` URL; share that URL with devices connected to the same Wi-Fi. The API requests use Vite's proxy, so only the frontend port needs to be reachable. If Windows Firewall asks, allow Node.js on private networks. This LAN URL is not a public internet link; public access requires deploying the frontend and API to an internet host.

For local development without Docker, install `backend/requirements-dev.txt`, set `DATABASE_URL=sqlite+aiosqlite:///./hackbridge.db`, then run `alembic upgrade head` and `uvicorn app.main:app --reload` from `backend`. SQLite is a local development convenience; the Compose deployment uses MySQL 8.

Run backend tests from `backend` with `pip install -r requirements-dev.txt` followed by `pytest`.

## Demo Events

For a local SQLite demo, run the following from the workspace root in PowerShell:

```powershell
Push-Location backend
$env:DATABASE_URL = 'sqlite+aiosqlite:///./hackbridge.db'
python -m app.seed --demo
Pop-Location
```

The demo seeder creates two fictional hackathons and does not create or modify user profiles. It removes only the older sample accounts and teams from previous demo runs. Sign in with your existing account; if needed, register normally, then join an event and create or join a team from onboarding.

## API Surface

- `/api/v1/auth`: register and login
- `/api/v1/users`: current profile
- `/api/v1/hackathons`: browse, join, onboarding status, organizer timeline, and analytics
- `/api/v1/teams`: create a team, join by invite code, update team profile, and view roster
- `/api/v1/projects`, `/api/v1/tasks`, `/api/v1/milestones`: membership-protected workspace and planning operations
- `/api/v1/projects/{id}/submission`: metadata, validation, and final submission
- `/api/v1/ai`: mock project breakdown and submission review

Every protected endpoint requires `Authorization: Bearer <access_token>`. Team and project writes verify membership and reject after the associated hackathon ends. A submission is finalized only when server-side validation passes.