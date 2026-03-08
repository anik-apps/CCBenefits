Architecture
============

Overview
--------

CCBenefits is a full-stack application with a FastAPI backend and React frontend.

.. code-block:: text

   backend/
     ccbenefits/
       main.py          # FastAPI app, lifespan, static file serving
       models.py         # SQLAlchemy ORM models
       schemas.py        # Pydantic request/response schemas
       database.py       # Engine, session, base
       utils.py          # Period calculation, helpers
       seed.py           # Card template seed data
       routers/
         card_templates.py  # GET card templates
         user_cards.py      # CRUD user cards, usage logging, summaries
         usage.py           # PUT/DELETE individual usage records

   frontend/
     src/
       pages/            # Dashboard, CardDetail, AllCredits, AddCard
       components/       # BenefitRow, UsageModal, UtilizationBar, etc.
       services/api.ts   # Axios API client
       types.ts          # TypeScript interfaces
       constants.ts      # Shared constants

Data Model
----------

- **CardTemplate** — credit card definition (name, issuer, annual fee)
- **BenefitTemplate** — a benefit belonging to a card (name, max value, period type, redemption type)
- **UserCard** — a user's instance of a card template
- **BenefitUsage** — usage record per benefit per period
- **UserBenefitSetting** — user's perceived value override per benefit

Key Concepts
------------

**Period Types**: monthly, quarterly, semiannual, annual. Each benefit resets on
its period boundary.

**Redemption Types**: ``binary`` (used or not) and ``continuous`` (partial amounts).

**Perceived Value**: Users can override the face value of benefits with their
personal valuation, which flows into ROI calculations.
