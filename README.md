# CCBenefits

[![CI](https://github.com/anik-apps/CCBenefits/actions/workflows/ci.yml/badge.svg)](https://github.com/anik-apps/CCBenefits/actions/workflows/ci.yml)
![Backend Coverage](https://raw.githubusercontent.com/anik-apps/CCBenefits/master/badges/backend-coverage.svg)
![Frontend Coverage](https://raw.githubusercontent.com/anik-apps/CCBenefits/master/badges/frontend-coverage.svg)
[![Docs](https://github.com/anik-apps/CCBenefits/actions/workflows/docs.yml/badge.svg)](https://anik-apps.github.io/CCBenefits/)

Track utilization of credit card benefits (monthly, quarterly, semiannual, annual) across multiple cards. See how much value you're actually getting vs. the annual fee.

**Live:** [https://ccb.kumaranik.com](https://ccb.kumaranik.com)

## Features

- **Multi-user authentication**: Email/password + Google OAuth (Apple coming soon), JWT access/refresh tokens
- **Email verification**: Verification emails via Resend, unverified users blocked until verified
- **Forgot password**: Reset via email link (web + mobile)
- **11 pre-seeded cards**: Amex Platinum, Amex Business Platinum, Amex Gold, Hilton Surpass, Hilton Aspire, Chase Sapphire Reserve, CSR for Business, Capital One Venture X, Citi Strata Elite, Bilt Palladium, BofA Premium Rewards Elite
- **Perceived value tracking**: Set your own valuation per benefit (e.g., value a $25 Equinox credit at $10 if you rarely go)
- **Period segments**: Visual grid showing usage across all months/quarters/halves of the year
- **Binary vs continuous benefits**: Toggle for all-or-nothing credits, dollar input for partial-use credits
- **Analytics dashboard**: SVG donut/bar charts, summary stats, per-card utilization
- **All Credits view**: By Period / By Card / Sheet tabs with collapsible sections and issuer color coding
- **Notifications**: 5 types (expiring credits, period start, unused recap, fee approaching, utilization summary) via email + push
- **Notification inbox**: Bell icon with unread count on web and mobile
- **Feedback system**: Submit feedback via modal, admin API to review
- **Mobile app**: React Native (Expo SDK 55) Android app with full feature parity
- **Observability**: Structured logging + metrics via OpenTelemetry → Grafana Cloud
- **Integration tests**: API smoke tests + Playwright E2E with deploy approval gate
- **Data isolation**: Each user sees only their own cards and benefits

## Tech Stack

- **Backend**: Python 3.12+ / FastAPI / SQLAlchemy 2.0 / PostgreSQL (SQLite for dev)
- **Auth**: bcrypt / PyJWT / Google OAuth (google-auth) / Resend (email)
- **Frontend**: React / Vite 8 / TypeScript / TanStack Query
- **Mobile**: React Native / Expo SDK 55 / React Navigation v7
- **Notifications**: APScheduler / Resend (email) / Expo Push API (mobile)
- **Observability**: OpenTelemetry SDK → Grafana Cloud (Loki + Prometheus via OTLP)
- **Testing**: pytest (190+) / vitest (70+) / Playwright E2E / ruff + ESLint
- **Deployment**: Docker / Docker Compose / Caddy (HTTPS) / Oracle Cloud VM
- **CI/CD**: GitHub Actions → integration tests → manual approval → GHCR → SSH deploy
- **Package management**: Poetry (backend), npm (frontend/mobile)

## Quick Start

### Backend

```bash
cd backend
poetry install
poetry run uvicorn ccbenefits.main:app --reload
```

The API runs at `http://localhost:8000` and serves the frontend if built.

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

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your Android phone. The app connects to the live API at `https://ccb.kumaranik.com`.

**Emulators:**
- **Android:** Install Java 17 + Android SDK via Homebrew, create AVD, run `npx expo start --android --lan` (see `docs/getting-started.rst` for full setup)
- **iOS:** Install Xcode, run `npx expo start --ios`, or build via `eas build --profile simulator --platform ios`
- **Standalone APK:** `eas build --profile preview --platform android`

### Run Tests

```bash
# Backend lint + tests (190+ tests, 87%+ coverage)
cd backend
poetry run ruff check ccbenefits/ tests/
poetry run pytest -v

# Frontend lint + tests (70+ tests)
cd frontend
npm run lint
npx vitest run

# Integration tests (requires Docker)
docker build -t ccbenefits:test .
docker compose -f docker-compose.test.yml up -d
cd backend && poetry run pytest tests/integration/ -v --no-cov
cd tests/e2e && npx playwright install chromium --with-deps && npx playwright test
docker compose -f docker-compose.test.yml down -v
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CCB_SECRET_KEY` | dev default (insecure) | JWT signing key. **Required in production** (`CCB_ENV=production`). |
| `CCB_ENV` | `development` | Set to `production` to enforce secret key requirement. |
| `CCB_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8000` | Comma-separated CORS origins. |
| `DATABASE_URL` | `sqlite:///./ccbenefits.db` | Database connection string. |
| `RESEND_API_KEY` | _(empty)_ | Resend API key for email verification + password reset. |
| `CCB_EMAIL_FROM` | `noreply@kumaranik.com` | From address for emails. |
| `CCB_FRONTEND_URL` | `http://localhost:5173` | Base URL for email links (verification, reset). |
| `CCB_ADMIN_EMAILS` | _(empty)_ | Comma-separated admin emails (for feedback access). |
| `GRAFANA_OTLP_ENDPOINT` | _(empty)_ | Grafana Cloud OTLP endpoint (leave empty to disable). |
| `GRAFANA_INSTANCE_ID` | _(empty)_ | Grafana Cloud instance ID. |
| `GRAFANA_OTLP_TOKEN` | _(empty)_ | Grafana Cloud API token. |
| `CCB_SCHEDULER_ENABLED` | `false` | Enable APScheduler for notification jobs. Set `true` in production. |
| `GOOGLE_CLIENT_ID` | _(empty)_ | Google OAuth web client ID. |
| `GOOGLE_CLIENT_ID_ANDROID` | _(empty)_ | Google OAuth Android client ID. |
| `GOOGLE_CLIENT_ID_IOS` | _(empty)_ | Google OAuth iOS client ID. |

## Project Structure

```
CCBenefits/
├── backend/
│   ├── pyproject.toml          # Poetry config
│   ├── prestart.sh             # DB init script (runs before uvicorn)
│   ├── ccbenefits/
│   │   ├── main.py             # FastAPI app + static file serving
│   │   ├── config.py           # Environment config
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── auth.py             # Password hashing, JWT tokens, token resolution
│   │   ├── dependencies.py     # get_current_user FastAPI dependency
│   │   ├── email.py            # Email sender (Console / Resend)
│   │   ├── observability.py    # OpenTelemetry setup for Grafana Cloud
│   │   ├── metrics.py          # Business metric counters
│   │   ├── middleware.py        # Request logging with PII masking
│   │   ├── models.py           # 8 ORM models (User, UserOAuthAccount, CardTemplate, etc.)
│   │   ├── oauth.py            # Google/Apple token verification
│   │   ├── oauth_helpers.py    # Shared OAuth account resolution
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── seed.py             # 11 pre-seeded cards with benefits
│   │   ├── utils.py            # Period calculation helpers
│   │   └── routers/
│   │       ├── auth.py         # Register, login, verify, refresh, password reset, OAuth
│   │       ├── users.py        # User profile CRUD
│   │       ├── feedback.py     # Feedback submit + admin list
│   │       ├── card_templates.py
│   │       ├── user_cards.py
│   │       └── usage.py
│   └── tests/                  # 190+ tests (87%+ coverage)
│       └── integration/        # API smoke tests (run against Docker stack)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx             # Router, auth guard, user menu
│       ├── types.ts            # TypeScript interfaces
│       ├── contexts/
│       │   └── AuthContext.tsx  # Auth state, login/logout/register
│       ├── hooks/useAuth.ts    # Auth hook
│       ├── styles/form.ts      # Shared form styles
│       ├── services/api.ts     # Axios client + token interceptor
│       ├── pages/
│       │   ├── Dashboard.tsx   # Card list + ROI summary
│       │   ├── AllCredits.tsx  # All benefits across cards
│       │   ├── AddCard.tsx     # Add from templates (inline buttons)
│       │   ├── CardDetail.tsx  # Per-card benefit tracking
│       │   ├── LoginPage.tsx   # Sign in
│       │   ├── RegisterPage.tsx # Create account
│       │   ├── ProfilePage.tsx # Profile settings + password change
│       │   ├── VerifyEmailPage.tsx # Email verification handler
│       │   ├── VerifyPendingPage.tsx # "Check your email" gate
│       │   └── AdminFeedback.tsx # Admin: view all feedback
│       └── components/
│           ├── CardSummary.tsx
│           ├── BenefitRow.tsx
│           ├── UtilizationBar.tsx
│           ├── UsageModal.tsx
│           ├── FeedbackModal.tsx
│           ├── ProtectedRoute.tsx
│           ├── TabLink.tsx
│           ├── UserMenu.tsx
│           └── ROISummary.tsx
├── mobile/                     # React Native (Expo) Android app
│   ├── app.json                # Expo config
│   ├── App.tsx                 # Root navigator (auth/verify/app)
│   └── src/
│       ├── services/api.ts     # API client (async SecureStore + token cache)
│       ├── contexts/           # AuthContext
│       ├── hooks/              # useAuth
│       ├── navigation/         # Auth stack + App stack
│       ├── screens/            # Login, Register, VerifyPending, Dashboard,
│       │                       # CardDetail, AddCard, AllCredits, Profile, Feedback
│       ├── components/         # UsageModal, ScreenWrapper, LoadingScreen
│       └── theme.ts            # Dark theme colors/spacing
├── tests/e2e/                  # Playwright E2E tests
├── Dockerfile                  # Multi-stage (Node build + Python slim)
├── docker-compose.prod.yml     # App + Postgres + Caddy (production)
├── docker-compose.test.yml     # App + Postgres (integration tests)
├── .env.example                # Production env var template
└── README.md
```

## API Endpoints

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account, returns user + tokens |
| POST | `/api/auth/login` | Login, returns access + refresh tokens |
| POST | `/api/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/auth/verify-email` | Verify email with token from link |
| POST | `/api/auth/resend-verification` | Resend verification email (auth required) |
| POST | `/api/auth/password-reset-request` | Request password reset email |
| POST | `/api/auth/password-reset` | Reset password with token |
| POST | `/api/auth/oauth` | OAuth sign-in (Google/Apple) |
| GET | `/api/auth/oauth/providers` | List linked OAuth providers |
| POST | `/api/auth/oauth/link` | Link OAuth provider to account |
| DELETE | `/api/auth/oauth/link/{provider}` | Unlink OAuth provider |

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
| GET | `/api/card-templates/` | List all pre-seeded cards |
| GET | `/api/card-templates/{id}/` | Card with all benefits |

### User Cards & Usage (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/user-cards/` | Add card to your collection |
| GET | `/api/user-cards/` | Your cards with ROI summary |
| GET | `/api/user-cards/{id}` | Card detail with period segments |
| DELETE | `/api/user-cards/{id}` | Remove a card |
| POST | `/api/user-cards/{id}/usage` | Log benefit usage |
| PUT | `/api/user-cards/{id}/benefits/{bid}/setting` | Set perceived value |
| GET | `/api/user-cards/details` | Batch detail (all cards + benefits) |
| GET | `/api/user-cards/{id}/summary` | ROI summary |
| PUT | `/api/usage/{id}` | Update usage |
| DELETE | `/api/usage/{id}` | Delete usage |

### Feedback (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/feedback/` | Submit feedback (bug report, feature request, general) |
| GET | `/api/feedback/` | List all feedback (admin only, paginated) |

## Deployment

Deployed on Oracle Cloud Always Free tier with Docker Compose:

```
Caddy (HTTPS) → FastAPI (app) → PostgreSQL
```

CI/CD pipeline:
1. Push to master → integration tests (Docker stack + API smoke + Playwright E2E)
2. Manual approval via GitHub Environments → build + push to GHCR → SSH deploy to Oracle VM
3. Emergency deploys available via "Deploy (Emergency)" workflow (manual trigger)

See `.env.example` for production configuration.

## Observability

Metrics and logs are exported to Grafana Cloud via OpenTelemetry:

- **Auto-instrumented**: HTTP request duration/count, DB query timing, active requests
- **Business metrics**: logins, registrations, verifications, cards added, feedback, email delivery
- **Structured logs**: JSON format with action names, user context (masked email), request bodies (PII masked)
- **Dashboard**: [Grafana Cloud](https://anikapps.grafana.net) with request rate, error rate, latency percentiles, auth events, and live logs

## Scaling Notes

The app runs with a single uvicorn worker to avoid duplicate APScheduler job execution.
If scaling to multiple workers, switch to PostgreSQL advisory locks for scheduler
job dedup (see `backend/ccbenefits/scheduler.py`).

## Mobile App

React Native (Expo SDK 55) Android app with full feature parity:

- **10+ screens**: Login, Register, Verify Pending, Dashboard, Card Detail, Add Card, All Credits (3 tabs), Notifications, Feedback, Profile
- **Usage logging**: Tap any benefit to log/update/delete usage with period selector and binary/continuous support
- **Dark theme**: Matches web frontend with gold accents
- **Safe area handling**: Content properly inset for notch/status bar on all devices
- **Offline-ready**: TanStack Query with netinfo detection and AppState-based refetching
- **Secure storage**: Tokens stored in encrypted expo-secure-store with in-memory cache
