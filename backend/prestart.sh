#!/bin/bash
# Runs ONCE before uvicorn workers start.
# Handles DB schema creation and seed data.
set -e

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
"
