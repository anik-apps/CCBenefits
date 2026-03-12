Architecture
============

Interactive Diagram
-------------------

.. raw:: html

   <p><a href="_static/architecture.html" target="_blank"
      style="display:inline-block;padding:10px 20px;background:#c9a84c;color:#0a0a0f;
      text-decoration:none;border-radius:6px;font-weight:600;">
      Open Interactive Architecture Diagram →</a></p>
   <p style="color:#888;font-size:0.9em;">Click any system in the diagram to view details,
   commands, and configuration.</p>

Overview
--------

CCBenefits is a full-stack application with a FastAPI backend, React web frontend,
and React Native mobile app, deployed on Oracle Cloud with Docker Compose and Caddy
for HTTPS.

.. code-block:: text

   backend/
     ccbenefits/
       main.py            # FastAPI app, lifespan, static file serving
       config.py          # Environment config (secrets, CORS, token expiry, Grafana)
       auth.py            # Password hashing, JWT tokens, shared token resolution
       dependencies.py    # get_current_user FastAPI dependency
       email.py           # Email sender (Console / Resend)
       observability.py   # OpenTelemetry setup for Grafana Cloud
       metrics.py         # Business metric counters
       middleware.py       # Request logging with PII masking
       models.py          # SQLAlchemy ORM models (7 models)
       schemas.py         # Pydantic request/response schemas
       database.py        # Engine, session, base (Postgres/SQLite)
       utils.py           # Period calculation, helpers
       seed.py            # Card template seed data
       routers/
         auth.py            # Register, login, verify, refresh, password reset
         users.py           # User profile CRUD
         feedback.py        # Feedback submit + admin list
         card_templates.py  # GET card templates
         user_cards.py      # CRUD user cards, usage logging, summaries
         usage.py           # PUT/DELETE individual usage records

   frontend/
     src/
       contexts/         # AuthContext (auth state, login/logout)
       hooks/            # useAuth hook
       styles/           # Shared form styles
       pages/            # Dashboard, CardDetail, AllCredits, AddCard, Login, Register,
                         # Profile, VerifyEmail, VerifyPending, AdminFeedback
       components/       # BenefitRow, UsageModal, FeedbackModal, ProtectedRoute, etc.
       services/api.ts   # Axios API client with token interceptor

   mobile/                  # React Native (Expo) Android app
     src/
       services/api.ts    # API client (async SecureStore + memory cache)
       contexts/           # AuthContext (token hydration, auth state)
       navigation/         # Auth stack + App stack
       screens/            # 9 screens matching web functionality
       components/         # UsageModal, ScreenWrapper, LoadingScreen
       theme.ts            # Dark theme (colors, spacing, radius)

Data Model
----------

- **User** — registered user (email, password hash, profile settings, verification status)
- **Feedback** — user feedback (category, message, timestamp)
- **CardTemplate** — credit card definition (name, issuer, annual fee)
- **BenefitTemplate** — a benefit belonging to a card (name, max value, period type, redemption type)
- **UserCard** — a user's instance of a card template (linked to User via ``user_id`` FK)
- **BenefitUsage** — usage record per benefit per period
- **UserBenefitSetting** — user's perceived value override per benefit

Authentication
--------------

JWT-based authentication with email/password. Access tokens (30 min) are sent
as ``Authorization: Bearer`` headers. Refresh tokens (7 days) are used to obtain
new access tokens without re-login. JWTs include user email for logging.

Email verification is required after registration. Unverified users are blocked
from accessing the app until they click the verification link sent via Resend.

All ``/api/user-cards/``, ``/api/usage/``, and ``/api/feedback/`` endpoints require
authentication and filter data by the authenticated user. Card templates remain public.

Password reset and email verification use opaque random tokens (SHA-256 hashed in DB)
with the pluggable email sender interface (Resend in production, console in development).

Notifications
-------------

Users receive notifications about expiring credits, new periods, unused recaps,
upcoming card renewals, and weekly utilization summaries.

- **Email**: via Resend API. Transactional emails from ``noreply@``, notifications from ``notifications@``
- **Push**: via Expo Push API → Firebase FCM → Android devices
- **Scheduling**: APScheduler (BackgroundScheduler) runs hourly, timezone-aware user matching
- **Dedup**: ``NotificationLog`` table with channel-based dedup (email and push independent)
- **Unsubscribe**: One-click opaque token endpoint (CAN-SPAM compliant, 60-day expiry)
- **Preferences**: Per-user toggles for each notification type × channel, stored as JSON

Observability
-------------

Metrics and structured logs are exported to Grafana Cloud via OpenTelemetry OTLP:

- **Auto-instrumented**: HTTP request duration/count (FastAPI), DB connections (SQLAlchemy)
- **Business counters**: auth events, verifications, cards added, feedback, emails, notifications, scheduler jobs
- **Structured logging**: JSON to stdout + OTel bridge to Grafana Loki
- **Request middleware**: logs method, path, status, duration, action name, user context (masked)
- **PII masking**: emails and sensitive fields masked before cloud export

Disabled when ``GRAFANA_OTLP_ENDPOINT`` is not set (development mode).

**Dashboards** (managed as code via ``grafanactl``):

- `Service Health <https://anikapps.grafana.net/d/ccb-service-health>`_: request rate, latency, error rate, endpoints, status codes, downstream deps, logs
- `Business Metrics <https://anikapps.grafana.net/d/ccb-business-metrics>`_: registrations, logins, auth failures, cards, feedback, notifications

Dashboard YAML files live in ``grafana/dashboards/`` and are synced to Grafana Cloud
on push to master via the ``grafana-sync.yml`` workflow.

Deployment
----------

Production runs on Oracle Cloud Always Free tier (E2.1.Micro VM, 1 OCPU, 1GB RAM):

.. code-block:: text

   Cloudflare (DNS + SSL) → FastAPI app (1 worker) → PostgreSQL

   GitHub Actions CI/CD:
   Push to master → build Docker image → push to GHCR → SSH deploy to VM

   Grafana dashboards:
   Push to master (grafana/**) → grafanactl push → Grafana Cloud

Mobile App
----------

React Native (Expo SDK 54) Android app with full feature parity to the web frontend.

- **9 screens**: Login, Register, Verify Pending, Dashboard, Card Detail, Add Card,
  All Credits, Feedback, Profile
- **Push notifications**: expo-notifications + Firebase FCM, token registration on startup
- **Notification preferences**: per-type email/push toggles with timezone selector
- **Shared API client**: adapted from the web frontend's ``api.ts`` with async
  ``expo-secure-store`` for token persistence and in-memory cache for fast access
- **Usage logging**: tap any benefit to log/update/delete with period selector,
  binary toggle, and full/partial color coding (gold = partial, green = fully used)
- **Auth flow**: conditional root navigator renders Auth stack, Verify Pending gate,
  or App stack based on user state and verification status
- **TanStack Query**: same server-state management as web, with React Native-specific
  ``netinfo`` (online/offline) and ``AppState`` (focus/refetch) listeners

Key Concepts
------------

**Period Types**: monthly, quarterly, semiannual, annual. Each benefit resets on
its period boundary.

**Redemption Types**: ``binary`` (used or not) and ``continuous`` (partial amounts).

**Perceived Value**: Users can override the face value of benefits with their
personal valuation, which flows into ROI calculations.
