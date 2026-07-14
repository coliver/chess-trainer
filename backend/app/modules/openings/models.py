from sqlalchemy import Column, String, Text

from backend.app.modules.shared.db import Base


class Opening(Base):
    __tablename__ = "openings"

    eco = Column(String, nullable=False, primary_key=True)
    name = Column(String, nullable=False, primary_key=True)

    epd = Column(Text, nullable=True)
    pgn = Column(Text, nullable=True)
    uci_moves = Column(Text, nullable=True)
