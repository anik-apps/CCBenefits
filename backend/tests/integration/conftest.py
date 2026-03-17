import os

import httpx
import pytest


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("INTEGRATION_BASE_URL", "http://localhost:8080")


@pytest.fixture(scope="session")
def client(base_url):
    with httpx.Client(base_url=base_url, timeout=10) as c:
        yield c
