from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Rental, User
from app.models.enums import RentalStatus
from app.repositories import admin as repo
from app.schemas.admin import AdminRentalOut, Page

from .common import PAGE_SIZE


def list_rentals(db: Session, *, page: int, status: RentalStatus | None) -> Page[AdminRentalOut]:
    stmt = select(Rental).order_by(Rental.start_at.desc())
    if status:
        stmt = stmt.where(Rental.status == status)
    rentals, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_([r.user_id for r in rentals])))}
    return Page(
        items=[
            AdminRentalOut(
                id=r.id,
                status=r.status,
                user_email=users[r.user_id].email,
                user_name=f"{users[r.user_id].first_name} {users[r.user_id].last_name}",
                product_name=r.product.name,
                branch_name=r.branch.name,
                start_at=r.start_at,
                end_at=r.end_at,
                price=r.price,
                created_at=r.created_at,
            )
            for r in rentals
        ],
        total=total,
        page=page,
        page_size=PAGE_SIZE,
    )
