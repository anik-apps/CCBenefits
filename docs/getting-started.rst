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

   cd backend
   poetry run pytest -v

Tests include coverage reporting (96% coverage, 80% threshold).
