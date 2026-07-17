## [Unreleased]

### 2026-07-17

#### Changed
- Training sessions associated with authenticated users (`user_id` on `TrainingSession`).
- Frontend updated to show a profile icon/link when logged in.

#### Chore
- Added Ruff + Black and ran both for consistent linting/formatting.

### 2026-07-16

#### Added
- Training next-item selection and persisted correctness/feedback.

#### Changed
- Frontend layout/structure: pages moved to `src/pages`, components to `src/components`.
- Added and applied a reusable Header component across pages.

#### Fixed
- Nginx configuration and frontend proxy/websocket endpoint (`/ws`) adjustments.

#### Chore
- README, ARCHITECTURE.md, and nginx-related formatting/doc updates.

### 2026-07-14

#### Added
- Docker/service resilience improvements (health checks, restart policies).
- Openings table/model and enriched opening import (including ECO + move index metadata).

#### Changed
- Alembic setup improvements (env bootstrapping, model auto-import, safer migrations).
- Improved migration/table creation safety (guards, explicit types, safer downgrades).

### 2026-07-08

#### Added
- Auth + training MVP wiring: login/register + redirect to dashboard.
- Training UI and session flow routed to `/training/:id`.
- JWT auth integration for training routes.
- Training progression logic updates (next item selection + response upsert behavior).

#### Fixed
- Register validation and auth/router wiring.
