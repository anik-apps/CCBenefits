# Stage 1: Build frontend
FROM node:22-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python app
FROM python:3.13-slim AS app

# Install system deps for psycopg (fallback if binary wheels unavailable)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Install poetry
RUN pip install --no-cache-dir poetry

WORKDIR /app

# Install Python deps (cache-friendly: copy lockfiles first)
COPY backend/pyproject.toml backend/poetry.lock ./
RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-root --only main

# Copy backend code
COPY backend/ccbenefits ./ccbenefits
COPY backend/prestart.sh ./prestart.sh
RUN chmod +x prestart.sh

# Copy built frontend from stage 1
COPY --from=frontend-build /build/dist ./frontend/dist

# Install the project package itself (deps already installed above)
RUN poetry install --no-interaction --only main

ENV FRONTEND_DIST_DIR=/app/frontend/dist
EXPOSE 80

CMD ["bash", "-c", "./prestart.sh && exec uvicorn ccbenefits.main:app --host 0.0.0.0 --port 80 --workers 2"]
