from sqlalchemy.orm import Session

from app.modules.catalogo.service import CATEGORY_SLUGS
from app.modules.sucursales import repository as repo
from app.modules.sucursales.schemas import BranchOut, CategoryAvailabilityOut, GeoPointOut, OpeningHoursOut


def list_branches(db: Session) -> list[BranchOut]:
    availability = repo.availability_by_category(db)
    updated = repo.inventory_updated_at(db)
    return [
        BranchOut(
            id=b.id,
            slug=b.slug,
            name=b.name,
            city=b.city,
            neighborhood=b.neighborhood,
            address=b.address,
            location=GeoPointOut(lat=float(b.latitude), lng=float(b.longitude)),
            phone=b.phone,
            hours=[OpeningHoursOut.model_validate(h) for h in b.opening_hours],
            services=list(b.services),
            inventory=[
                CategoryAvailabilityOut(category=slug, available=availability.get(b.id, {}).get(slug, 0))
                for slug in CATEGORY_SLUGS
            ],
            inventory_updated_at=updated.get(b.id),
            is_demo=b.is_demo,
        )
        for b in repo.list_active_branches(db)
    ]
