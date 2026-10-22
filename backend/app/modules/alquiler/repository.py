import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Rental


def list_user_rentals(db: Session, user_id: uuid.UUID) -> list[Rental]:
    stmt = select(Rental).where(Rental.user_id == user_id).order_by(Rental.start_at.desc())
    return list(db.scalars(stmt).unique())
