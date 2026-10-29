import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """
    Returns a new psycopg2 connection to the shared PostgreSQL database.
    Always close the connection after use.
    """
    return psycopg2.connect(DATABASE_URL)


def get_dict_connection():
    """
    Returns a connection whose cursors return rows as dicts.
    """
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)