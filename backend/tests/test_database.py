from sqlalchemy.pool import StaticPool

from ccbenefits.database import _build_engine_kwargs


def test_sqlite_engine_kwargs():
    kwargs = _build_engine_kwargs("sqlite:///./test.db")
    assert kwargs["connect_args"] == {"check_same_thread": False}
    assert kwargs["poolclass"] is StaticPool


def test_sqlite_memory_engine_kwargs():
    kwargs = _build_engine_kwargs("sqlite://")
    assert kwargs["connect_args"] == {"check_same_thread": False}


def test_postgres_engine_kwargs():
    kwargs = _build_engine_kwargs("postgresql+psycopg://user:pass@localhost/db")
    assert "connect_args" not in kwargs
    assert kwargs.get("pool_pre_ping") is True


def test_postgres_no_static_pool():
    kwargs = _build_engine_kwargs("postgresql+psycopg://user:pass@localhost/db")
    assert "poolclass" not in kwargs
