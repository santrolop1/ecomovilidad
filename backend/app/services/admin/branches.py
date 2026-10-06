import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Branch
from app.repositories import admin as repo
from app.schemas.admin import AdminBranchDetailOut, AdminBranchOut, BranchCreateIn, BranchUpdateIn, OpeningHoursIn
from app.services.errors import NotFoundError, ServiceError

from .catalog import inventory_row
from .common import commit_or_conflict


def _branch_out(branch: Branch, stock: tuple[int, int, int]) -> AdminBranchOut:
    available, reserved, total = stock
    return AdminBranchOut(
        id=branch.id,
        slug=branch.slug,
        name=branch.name,
        address=branch.address,
        neighborhood=branch.neighborhood,
        city=branch.city,
        phone=branch.phone,
        latitude=float(branch.latitude),
        longitude=float(branch.longitude),
        opening_hours=[OpeningHoursIn.model_validate(h) for h in branch.opening_hours],
        services=list(branch.services),
        is_demo=branch.is_demo,
        is_active=branch.is_active,
        available=available,
        reserved=reserved,
        total=total,
        updated_at=branch.updated_at,
    )


def list_branches(db: Session) -> list[AdminBranchOut]:
    stock = repo.stock_by_branch(db)
    return [
        _branch_out(b, stock.get(b.id, (0, 0, 0)))
        for b in db.scalars(select(Branch).order_by(Branch.city, Branch.name))
    ]


def get_branch(db: Session, branch_id: uuid.UUID) -> AdminBranchDetailOut:
    branch = db.get(Branch, branch_id)
    if branch is None:
        raise NotFoundError("La sucursal no existe.")
    sold = repo.sold_units(db)
    rows = [inventory_row(inv, sold) for inv in db.scalars(repo.inventory_rows_stmt(branch_id=branch_id)).unique()]
    base = _branch_out(branch, repo.stock_by_branch(db).get(branch.id, (0, 0, 0)))
    return AdminBranchDetailOut(**base.model_dump(), inventory=rows)


def _serialize(changes: dict) -> dict:
    if changes.get("opening_hours") is not None:
        changes["opening_hours"] = [dict(h) for h in changes["opening_hours"]]
    if changes.get("services") is not None:
        changes["services"] = [str(s) for s in changes["services"]]
    return changes


def create_branch(db: Session, data: BranchCreateIn) -> AdminBranchDetailOut:
    branch = Branch(**_serialize(data.model_dump()))
    db.add(branch)
    commit_or_conflict(db)
    return get_branch(db, branch.id)


def update_branch(db: Session, branch_id: uuid.UUID, data: BranchUpdateIn) -> AdminBranchDetailOut:
    branch = db.get(Branch, branch_id)
    if branch is None:
        raise NotFoundError("La sucursal no existe.")
    changes = _serialize(data.model_dump(exclude_unset=True))
    if any(value is None for value in changes.values()):
        raise ServiceError("Hay campos obligatorios vacíos.")
    for field, value in changes.items():
        setattr(branch, field, value)
    commit_or_conflict(db)
    db.refresh(branch)  # recalcula la columna geográfica generada
    return get_branch(db, branch.id)
