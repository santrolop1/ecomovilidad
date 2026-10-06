from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.branch import BranchOut
from app.services.branches import list_branches

router = APIRouter(tags=["sucursales"])


@router.get("/branches", response_model=list[BranchOut], response_model_exclude_none=True)
def get_branches(db: DbSession):
    return list_branches(db)
