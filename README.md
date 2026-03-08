# CCBenefits

[![CI](https://github.com/anik-apps/CCBenefits/actions/workflows/ci.yml/badge.svg)](https://github.com/anik-apps/CCBenefits/actions/workflows/ci.yml)
![Backend Coverage](https://raw.githubusercontent.com/anik-apps/CCBenefits/master/badges/backend-coverage.svg)
![Frontend Coverage](https://raw.githubusercontent.com/anik-apps/CCBenefits/master/badges/frontend-coverage.svg)
[![Docs](https://github.com/anik-apps/CCBenefits/actions/workflows/docs.yml/badge.svg)](https://anik-apps.github.io/CCBenefits/)

Track utilization of credit card benefits (monthly, quarterly, semiannual, annual) across multiple cards. See how much value you're actually getting vs. the annual fee.

## Features

- **Multi-user authentication**: Email/password registration, JWT access/refresh tokens, user profiles
- **11 pre-seeded cards**: Amex Platinum, Amex Business Platinum, Amex Gold, Hilton Surpass, Hilton Aspire, Chase Sapphire Reserve, CSR for Business, Capital One Venture X, Citi Strata Elite, Bilt Palladium, BofA Premium Rewards Elite
- **Perceived value tracking**: Set your own valuation per benefit (e.g., value a $25 Equinox credit at $10 if you rarely go)
- **Period segments**: Visual grid showing usage across all months/quarters/halves of the year
- **Binary vs continuous benefits**: Toggle for all-or-nothing credits, dollar input for partial-use credits
- **ROI dashboard**: Net value = perceived value redeemed - annual fee
- **All Credits view**: See every benefit across all your cards in one place
- **Data isolation**: Each user sees only their own cards and benefits

## Tech Stack

- **Backend**: Python 3.12+ / FastAPI / SQLAlchemy 2.0 / SQLite
- **Auth**: bcrypt / PyJWT / OAuth2 Bearer tokens
- **Frontend**: React / Vite / TypeScript / TanStack Query
- **Package management**: Poetry (backend), npm (frontend)

## Quick Start

### Backend

```bash
cd backend
poetry install
poetry run uvicorn ccbenefits.main:app --reload
```

The API runs at `http://localhost:8000` and serves the frontend if built.

**Environment variables** (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `CCB_SECRET_KEY` | dev default (insecure) | JWT signing key. **Required in production** (`CCB_ENV=production`). |
| `CCB_ENV` | `development` | Set to `production` to enforce secret key requirement. |
| `CCB_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8000` | Comma-separated CORS origins. |

### Frontend

```bash
cd frontend
npm install
npm run build
```

The built frontend is served by FastAPI at `http://localhost:8000`.

For development with hot reload:

```bash
npm run dev
```

This starts Vite at `http://localhost:5173` with API proxy to the backend.

### Run Tests

```bash
cd backend
poetry run pytest -v
```

## Project Structure

```
CCBenefits/
├── backend/
│   ├── pyproject.toml          # Poetry config
│   ├── ccbenefits/
│   │   ├── main.py             # FastAPI app + static file serving
│   │   ├── config.py           # Environment config (secrets, CORS, token expiry)
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── auth.py             # Password hashing, JWT tokens, token resolution
│   │   ├── dependencies.py     # get_current_user FastAPI dependency
│   │   ├── email.py            # Pluggable email sender (console default)
│   │   ├── models.py           # 6 ORM models (User, CardTemplate, etc.)
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── seed.py             # 11 pre-seeded cards with benefits
│   │   ├── utils.py            # Period calculation helpers
│   │   └── routers/
│   │       ├── auth.py         # Register, login, refresh, password reset
│   │       ├── users.py        # User profile CRUD
│   │       ├── card_templates.py
│   │       ├── user_cards.py
│   │       └── usage.py
│   └── tests/                  # 79 tests (95% coverage)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx             # Router, auth guard, user menu
│       ├── types.ts            # TypeScript interfaces
│       ├── contexts/
│       │   └── AuthContext.tsx  # Auth state, login/logout/register
│       ├── styles/form.ts      # Shared form styles
│       ├── services/api.ts     # Axios client + token interceptor
│       ├── pages/
│       │   ├── Dashboard.tsx   # Card list + ROI summary
│       │   ├── AllCredits.tsx  # All benefits across cards
│       │   ├── AddCard.tsx     # Add from templates
│       │   ├── CardDetail.tsx  # Per-card benefit tracking
│       │   ├── LoginPage.tsx   # Sign in
│       │   ├── RegisterPage.tsx # Create account
│       │   └── ProfilePage.tsx # Profile settings + password change
│       └── components/
│           ├── CardSummary.tsx
│           ├── BenefitRow.tsx
│           ├── UtilizationBar.tsx
│           ├── UsageModal.tsx
│           └── ROISummary.tsx
├── docs/plans/                 # Design docs and implementation plans
└── README.md
```

## API Endpoints

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account, returns user + tokens |
| POST | `/api/auth/login` | Login, returns access + refresh tokens |
| POST | `/api/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/auth/password-reset-request` | Request password reset (email pluggable) |
| POST | `/api/auth/password-reset` | Reset password with token |

### User Profile (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update profile settings |
| PUT | `/api/users/me/password` | Change password |
| DELETE | `/api/users/me` | Deactivate account |

### Card Templates (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/card-templates` | List all pre-seeded cards |
| GET | `/api/card-templates/{id}` | Card with all benefits |

### User Cards & Usage (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/user-cards/` | Add card to your collection |
| GET | `/api/user-cards/` | Your cards with ROI summary |
| GET | `/api/user-cards/{id}` | Card detail with period segments |
| DELETE | `/api/user-cards/{id}` | Remove a card |
| POST | `/api/user-cards/{id}/usage` | Log benefit usage |
| PUT | `/api/user-cards/{id}/benefits/{bid}/setting` | Set perceived value |
| GET | `/api/user-cards/{id}/summary` | ROI summary |
| PUT | `/api/usage/{id}` | Update usage |
| DELETE | `/api/usage/{id}` | Delete usage |
