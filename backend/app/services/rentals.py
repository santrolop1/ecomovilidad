from sqlalchemy.orm import Session

from app.models import User
from app.repositories import rentals as repo
from app.schemas.rental import RentalOut


def list_rentals(db: Session, user: User) -> list[RentalOut]:
    return [
        RentalOut(
            id=r.id,
            product_id=r.product_id,
            product_name=r.product.name,
            branch_id=r.branch_id,
            branch_name=r.branch.name,
            start_at=r.start_at,
            end_at=r.end_at,
            status=r.status,
            price=r.price,
        )
        for r in repo.list_user_rentals(db, user.id)
    ]
