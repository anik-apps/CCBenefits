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

Running Tests
-------------

.. code-block:: bash

   # Backend (79 tests, 95% coverage)
   cd backend
   poetry run pytest -v

   # Frontend (52 tests)
   cd frontend
   npm test -- --run

Backend tests include coverage reporting with an 80% minimum threshold.
