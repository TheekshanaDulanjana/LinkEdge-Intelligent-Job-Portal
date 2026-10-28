import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency — yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Creates all tables defined in models.py."""
    import src.database.models 
    Base.metadata.create_all(bind=engine)
    # create_all never alters existing tables: add new columns idempotently.
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS model_answer TEXT"))
        conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS level VARCHAR"))