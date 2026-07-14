import os
import sys
from logging.config import fileConfig
from pathlib import Path
from importlib import import_module
import pkgutil

repo_root = Path(__file__).resolve().parents[3]  # /app
backend_root = Path(__file__).resolve().parents[2]  # /app/backend

sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(backend_root))

from alembic import context
from sqlalchemy import engine_from_config, pool

from backend.app.modules.shared.db import Base

# Import every "...app.modules.*.models" module so Base.metadata contains all mapped tables
import backend.app.modules as modules_pkg  # noqa: E402

for mod in pkgutil.walk_packages(modules_pkg.__path__, modules_pkg.__name__ + "."):
    if mod.name.endswith(".models"):
        import_module(mod.name)

config = context.config
fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url():
    return os.environ["DATABASE_URL"]


def run_migrations_offline() -> None:
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


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
