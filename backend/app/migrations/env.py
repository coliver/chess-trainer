import os
import sys
from logging.config import fileConfig
from pathlib import Path
from importlib import import_module
import pkgutil

# ----------------------------------------------------------------------
# Load environment variables from .env (project root)
# ----------------------------------------------------------------------
from dotenv import load_dotenv

# .env lives at the repository root: /app/.env
repo_root = Path(__file__).resolve().parents[3]  # /app
dotenv_path = repo_root / ".env"
load_dotenv(dotenv_path)  # populates os.environ

# ----------------------------------------------------------------------
# Ensure the project packages are on PYTHONPATH
# ----------------------------------------------------------------------
backend_root = Path(__file__).resolve().parents[2]  # /app/backend
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(backend_root))

# ----------------------------------------------------------------------
# Alembic & SQLAlchemy imports
# ----------------------------------------------------------------------
from alembic import context
from sqlalchemy import engine_from_config, pool

# Import Base so Alembic can see all models
from backend.app.modules.shared.db import Base

# ----------------------------------------------------------------------
# Dynamically import every “…modules.*.models” module
# ----------------------------------------------------------------------
import backend.app.modules as modules_pkg  # noqa: E402

for mod in pkgutil.walk_packages(modules_pkg.__path__, modules_pkg.__name__ + "."):
    if mod.name.endswith(".models"):
        import_module(mod.name)

# ----------------------------------------------------------------------
# Alembic configuration
# ----------------------------------------------------------------------
config = context.config
fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """
    Return the database URL. It is expected to be provided via the
    DATABASE_URL environment variable (loaded from .env above).
    """
    try:
        return os.environ["DATABASE_URL"]
    except KeyError as exc:
        raise RuntimeError(
            "DATABASE_URL not set – ensure a .env file exists at the project root "
            "or export the variable before running Alembic."
        ) from exc


def run_migrations_offline() -> None:
    """Run migrations in ‘offline’ mode (no DB connection)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations with a live DB connection."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


# ----------------------------------------------------------------------
# Choose mode
# ----------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
