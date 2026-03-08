Architecture
============

Overview
--------

CCBenefits is a full-stack application with a FastAPI backend and React frontend.

.. code-block:: text

   backend/
     ccbenefits/
       main.py            # FastAPI app, lifespan, static file serving
       config.py          # Environment config (secrets, CORS, token expiry)
       auth.py            # Password hashing, JWT tokens, shared token resolution
       dependencies.py    # get_current_user FastAPI dependency
       email.py           # Pluggable email sender interface
       models.py          # SQLAlchemy ORM models (6 models)
       schemas.py         # Pydantic request/response schemas
       database.py        # Engine, session, base
       utils.py           # Period calculation, helpers
       seed.py            # Card template seed data
       routers/
         auth.py            # Register, login, refresh, password reset
         users.py           # User profile CRUD
         card_templates.py  # GET card templates
         user_cards.py      # CRUD user cards, usage logging, summaries
         usage.py           # PUT/DELETE individual usage records

   frontend/
     src/
       contexts/         # AuthContext (auth state, login/logout)
       styles/            # Shared form styles
       pages/            # Dashboard, CardDetail, AllCredits, AddCard, Login, Register, Profile
       components/       # BenefitRow, UsageModal, UtilizationBar, etc.
       services/api.ts   # Axios API client with token interceptor

Data Model
----------

- **User** — registered user (email, password hash, profile settings)
- **CardTemplate** — credit card definition (name, issuer, annual fee)
- **BenefitTemplate** — a benefit belonging to a card (name, max value, period type, redemption type)
- **UserCard** — a user's instance of a card template (linked to User via ``user_id`` FK)
- **BenefitUsage** — usage record per benefit per period
- **UserBenefitSetting** — user's perceived value override per benefit

Authentication
--------------

JWT-based authentication with email/password. Access tokens (30 min) are sent
as ``Authorization: Bearer`` headers. Refresh tokens (7 days) are used to obtain
new access tokens without re-login.

All ``/api/user-cards/`` and ``/api/usage/`` endpoints require authentication and
filter data by the authenticated user. Card templates remain public.

Password reset uses opaque random tokens (SHA-256 hashed in DB) with a pluggable
email sender interface (defaults to console logging in development).

Key Concepts
------------

**Period Types**: monthly, quarterly, semiannual, annual. Each benefit resets on
its period boundary.

**Redemption Types**: ``binary`` (used or not) and ``continuous`` (partial amounts).

**Perceived Value**: Users can override the face value of benefits with their
personal valuation, which flows into ROI calculations.
