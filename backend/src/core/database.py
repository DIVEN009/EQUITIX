import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from src.core.config import settings, BACKEND_DIR

logger = logging.getLogger(__name__)

# Base class for models to inherit from
Base = declarative_base()


def get_engine():
    db_url = settings.DATABASE_URL
    is_postgres = bool(db_url and ("postgres" in db_url))

    if is_postgres:
        try:
            eng = create_engine(
                db_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3},
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to primary PostgreSQL database.")
            return eng
        except Exception as exc:
            logger.warning(
                f"Primary PostgreSQL database connection failed: {exc}. "
                "Falling back to local SQLite database (equitix.db) for continuous operation."
            )

    sqlite_path = os.path.join(BACKEND_DIR, "equitix.db")
    sqlite_url = f"sqlite:///{sqlite_path}"
    logger.info(f"Using local SQLite database at: {sqlite_path}")
    eng = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
    )
    return eng


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    try:
        from src.models import database_models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema verified/created successfully.")
    except Exception as exc:
        logger.warning(f"Error during Base.metadata.create_all: {exc}")


init_db()


# Dependency to get the DB session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

