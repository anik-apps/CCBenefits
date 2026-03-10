Getting Started
===============

Prerequisites
-------------

- Python 3.12+
- Node.js 22+
- Poetry

Backend Setup
-------------

.. code-block:: bash

   cd backend
   poetry install
   poetry run uvicorn ccbenefits.main:app --reload

The backend runs on ``http://localhost:8000``. On first startup, it creates the
SQLite database and seeds card templates.

For production, set environment variables:

.. code-block:: bash

   export CCB_SECRET_KEY="your-secret-key-here"
   export CCB_ENV="production"
   export CCB_ALLOWED_ORIGINS="https://yourdomain.com"
   export DATABASE_URL="postgresql+psycopg://user:pass@localhost/ccbenefits"

Optional — email verification (requires Resend account):

.. code-block:: bash

   export RESEND_API_KEY="re_xxxxx"
   export CCB_EMAIL_FROM="noreply@yourdomain.com"
   export CCB_FRONTEND_URL="https://yourdomain.com"

Optional — observability (requires Grafana Cloud account):

.. code-block:: bash

   export GRAFANA_OTLP_ENDPOINT="https://otlp-gateway-prod-xxx.grafana.net/otlp"
   export GRAFANA_INSTANCE_ID="your-instance-id"
   export GRAFANA_OTLP_TOKEN="glc_xxxxx"

Frontend Setup
--------------

.. code-block:: bash

   cd frontend
   npm install
   npm run dev

The frontend dev server runs on ``http://localhost:5173``.

Production Build
----------------

.. code-block:: bash

   cd frontend && npm run build

Then start the backend — it serves the built frontend from ``frontend/dist/``.

Docker Deployment
-----------------

For production deployment with Docker Compose:

.. code-block:: bash

   # Copy and fill in environment variables
   cp .env.example .env

   # Start all services (app + postgres + caddy)
   docker compose -f docker-compose.prod.yml up -d

See ``.env.example`` for all available configuration options.

Running Tests
-------------

.. code-block:: bash

   # Backend (105 tests, 96% coverage)
   cd backend
   poetry run pytest -v

   # Frontend (52 tests)
   cd frontend
   npm test -- --run

Backend tests include coverage reporting with an 80% minimum threshold.
