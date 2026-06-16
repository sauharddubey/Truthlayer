"""SQLAlchemy engine, session, and pgvector bootstrap."""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def init_db() -> None:
    """Create the pgvector extension and all tables.

    Safe to call repeatedly — used on startup so a fresh free-tier Postgres is
    usable without a separate migration step. For real deployments use Alembic.
    """
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        except Exception:  # pragma: no cover - extension may need superuser
            conn.rollback()

        # Check for dimension mismatch on the vector embedding column to prevent DB type crashes.
        try:
            table_exists = conn.execute(text("SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'document_chunks')")).scalar()
            if table_exists:
                res = conn.execute(text("""
                    SELECT atttypmod FROM pg_attribute
                    WHERE attrelid = 'document_chunks'::regclass AND attname = 'embedding'
                """)).first()
                if res and res[0] != settings.EMBEDDINGS_DIM:
                    import logging
                    logging.getLogger("truthlayer.database").warning(
                        "pgvector dimension mismatch (DB has %s, settings have %s). Dropping document_chunks.",
                        res[0], settings.EMBEDDINGS_DIM
                    )
                    conn.execute(text("DROP TABLE IF EXISTS document_chunks CASCADE"))
                    conn.commit()
        except Exception:
            pass

    # Import models so they register on Base.metadata before create_all.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Additive, idempotent migrations (create_all does not ALTER existing tables).
    _additive_migrations = [
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR",
        """
        CREATE TABLE IF NOT EXISTS usage_records (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            call_type VARCHAR NOT NULL DEFAULT 'chat',
            model VARCHAR NOT NULL,
            prompt_tokens INTEGER NOT NULL DEFAULT 0,
            completion_tokens INTEGER NOT NULL DEFAULT 0,
            total_tokens INTEGER NOT NULL DEFAULT 0,
            cost_microdollars INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_usage_records_user_id ON usage_records(user_id)",
        "CREATE INDEX IF NOT EXISTS ix_usage_records_created_at ON usage_records(created_at)",
    ]
    with engine.connect() as conn:
        for stmt in _additive_migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:  # pragma: no cover
                conn.rollback()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Standalone transactional scope for background workers."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
