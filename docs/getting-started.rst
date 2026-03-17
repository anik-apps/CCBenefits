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

Optional — Google OAuth:

.. code-block:: bash

   export GOOGLE_CLIENT_ID="your-web-client-id"
   export GOOGLE_CLIENT_ID_ANDROID="your-android-client-id"
   export GOOGLE_CLIENT_ID_IOS="your-ios-client-id"

For the frontend, create ``frontend/.env.local``:

.. code-block:: bash

   VITE_GOOGLE_CLIENT_ID="your-web-client-id"

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

Mobile App Setup
----------------

.. code-block:: bash

   cd mobile
   npm install
   npx expo start

Install **Expo Go** on your Android phone from the Play Store, then scan the QR code
shown in the terminal. The app connects to the live API at ``https://ccb.kumaranik.com``.

Android Emulator Setup
~~~~~~~~~~~~~~~~~~~~~~

One-time setup (macOS with Homebrew):

.. code-block:: bash

   # Install Java 17 and Android SDK
   brew install openjdk@17
   brew install --cask android-commandlinetools

   # Symlink Java for system discovery (requires sudo)
   sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk \
     /Library/Java/JavaVirtualMachines/openjdk-17.jdk

   # Accept SDK licenses
   sdkmanager --licenses

   # Install emulator + system image
   sdkmanager "platforms;android-34" "build-tools;34.0.0" "emulator" \
     "platform-tools" "system-images;android-34;google_apis;arm64-v8a"

   # Create virtual device
   avdmanager create avd -n ccb_pixel \
     -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_7

Add to ``~/.zshrc``:

.. code-block:: bash

   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

To run the emulator:

.. code-block:: bash

   # Start emulator
   $ANDROID_HOME/emulator/emulator -avd ccb_pixel &

   # Start Expo and open on emulator
   cd mobile && npx expo start --android --lan

iOS Simulator
~~~~~~~~~~~~~

Requires **Xcode** (free from Mac App Store). Build via EAS:

.. code-block:: bash

   eas build --profile simulator --platform ios

Or run directly with Expo:

.. code-block:: bash

   cd mobile && npx expo start --ios

Building Standalone Apps
~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Android APK
   eas build --profile preview --platform android

   # iOS Simulator .app
   eas build --profile simulator --platform ios

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

   # Backend lint
   cd backend
   poetry run ruff check ccbenefits/ tests/

   # Backend tests (190+ tests, 87%+ coverage)
   cd backend
   poetry run pytest -v

   # Frontend lint + tests (55+ tests)
   cd frontend
   npm run lint
   npx vitest run

Backend tests include coverage reporting with an 80% minimum threshold.
Ruff (Python) and ESLint (TypeScript) are enforced in CI — lint failures block PRs.

Integration Tests
~~~~~~~~~~~~~~~~~

Integration tests run against a Docker Compose stack (app + postgres):

.. code-block:: bash

   # Build test image
   docker build -t ccbenefits:test .

   # Start test stack
   docker compose -f docker-compose.test.yml up -d

   # Wait for health
   for i in $(seq 1 20); do curl -sf http://localhost:8080/api/health && break; sleep 3; done

   # API smoke tests (5 tests)
   cd backend && poetry run pytest tests/integration/ -v --no-cov

   # Playwright E2E tests (3 flows)
   cd tests/e2e && npm ci && npx playwright install chromium && npx playwright test

   # Tear down
   docker compose -f docker-compose.test.yml down -v

Deploy Pipeline
~~~~~~~~~~~~~~~

Deploys are gated behind integration tests + manual approval:

1. Push to master triggers integration tests (Docker build → API smoke → Playwright E2E)
2. If tests pass, a **"Review pending"** approval button appears in GitHub Actions
3. Click approve to deploy to production (GHCR push → SSH deploy to Oracle VM)
4. Emergency deploys available via the "Deploy (Emergency)" workflow (manual trigger)
