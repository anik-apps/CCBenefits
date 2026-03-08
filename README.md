# CCBenefits

Track utilization of credit card benefits (monthly, quarterly, semiannual, annual) across multiple cards. See how much value you're actually getting vs. the annual fee.

## Features

- **11 pre-seeded cards**: Amex Platinum, Amex Business Platinum, Amex Gold, Hilton Surpass, Hilton Aspire, Chase Sapphire Reserve, CSR for Business, Capital One Venture X, Citi Strata Elite, Bilt Palladium, BofA Premium Rewards Elite
- **Perceived value tracking**: Set your own valuation per benefit (e.g., value a $25 Equinox credit at $10 if you rarely go)
- **Period segments**: Visual grid showing usage across all months/quarters/halves of the year
- **Binary vs continuous benefits**: Toggle for all-or-nothing credits, dollar input for partial-use credits
- **ROI dashboard**: Net value = perceived value redeemed - annual fee
- **All Credits view**: See every benefit across all your cards in one place

## Tech Stack

- **Backend**: Python 3.12+ / FastAPI / SQLAlchemy 2.0 / SQLite
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
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── models.py           # 5 ORM models
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── seed.py             # 11 pre-seeded cards with benefits
│   │   ├── utils.py            # Period calculation helpers
│   │   └── routers/
│   │       ├── card_templates.py
│   │       ├── user_cards.py
│   │       └── usage.py
│   └── tests/
│       ├── conftest.py
│       └── test_api.py         # 41 tests
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx             # Router + tab navigation
│       ├── types.ts            # TypeScript interfaces
│       ├── services/api.ts     # Axios API client
│       ├── pages/
│       │   ├── Dashboard.tsx   # Card list + ROI summary
│       │   ├── AllCredits.tsx  # All benefits across cards
│       │   ├── AddCard.tsx     # Add from templates
│       │   └── CardDetail.tsx  # Per-card benefit tracking
│       └── components/
│           ├── CardSummary.tsx
│           ├── BenefitRow.tsx
│           ├── UtilizationBar.tsx
│           ├── UsageModal.tsx
│           └── ROISummary.tsx
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/card-templates` | List all pre-seeded cards |
| GET | `/api/card-templates/{id}` | Card with all benefits |
| POST | `/api/user-cards/` | Add card to your collection |
| GET | `/api/user-cards/` | Your cards with ROI summary |
| GET | `/api/user-cards/{id}` | Card detail with period segments |
| DELETE | `/api/user-cards/{id}` | Remove a card |
| POST | `/api/user-cards/{id}/usage` | Log benefit usage |
| PUT | `/api/user-cards/{id}/benefits/{bid}/setting` | Set perceived value |
| GET | `/api/user-cards/{id}/summary` | ROI summary |
| PUT | `/api/usage/{id}` | Update usage |
| DELETE | `/api/usage/{id}` | Delete usage |
