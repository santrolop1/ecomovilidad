import uuid

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models import Order, User, UserSession
from app.modules.admin import repository as repo
from app.modules.admin.common import PAGE_SIZE
from app.modules.admin.orders import summaries
from app.modules.admin.schemas import AdminUserDetailOut, AdminUserOut, Page, UserUpdateIn


def _user_out(user: User, order_count: int) -> AdminUserOut:
    # Nunca se exponen password_hash ni sesiones.
    return AdminUserOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        document_number=user.document_number,
        is_active=user.is_active,
        is_admin=user.is_admin,
        order_count=order_count,
        created_at=user.created_at,
    )


def list_users(db: Session, *, page: int, query: str | None, status: str | None) -> Page[AdminUserOut]:
    stmt = select(User).order_by(User.created_at.desc())
    if query:
        like = f"%{query}%"
        stmt = stmt.where(or_(User.email.ilike(like), User.first_name.ilike(like), User.last_name.ilike(like)))
    if status in ("active", "inactive"):
        stmt = stmt.where(User.is_active.is_(status == "active"))
    elif status == "admin":
        stmt = stmt.where(User.is_admin)
    users, total = repo.paginate(db, stmt, page, PAGE_SIZE)
    counts = repo.order_counts_by_user(db, [u.id for u in users])
    return Page(items=[_user_out(u, counts.get(u.id, 0)) for u in users], total=total, page=page, page_size=PAGE_SIZE)


def get_user(db: Session, user_id: uuid.UUID) -> AdminUserDetailOut:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("El usuario no existe.")
    orders = list(
        db.scalars(
            select(Order)
            .where(Order.user_id == user_id)
            .options(selectinload(Order.user))
            .order_by(Order.created_at.desc())
            .limit(10)
        ).unique()
    )
    count = repo.order_counts_by_user(db, [user_id]).get(user_id, 0)
    return AdminUserDetailOut(**_user_out(user, count).model_dump(), recent_orders=summaries(db, orders))


def update_user(db: Session, admin: User, user_id: uuid.UUID, data: UserUpdateIn) -> AdminUserDetailOut:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("El usuario no existe.")
    if user.id == admin.id and not data.is_active:
        raise ConflictError("No puedes desactivar tu propia cuenta.")
    user.is_active = data.is_active
    if not data.is_active:
        # Una cuenta desactivada pierde todas sus sesiones de inmediato.
        db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    db.commit()
    return get_user(db, user_id)
