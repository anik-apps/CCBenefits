#!/bin/bash
# Runs ONCE before uvicorn workers start.
# Handles DB migrations, schema creation, and seed data.
set -e

# Run Alembic migrations (applies any pending migrations)
python -m alembic upgrade head || echo "WARNING: Alembic migration failed — falling back to create_all"

python -c "
from ccbenefits.database import Base, engine, SessionLocal
from ccbenefits.seed import seed_data

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    seed_data(db)
finally:
    db.close()
print('DB initialized and seeded.')
" || { echo "ERROR: prestart.sh failed — check DATABASE_URL and Postgres credentials"; exit 1; }
