from fastapi import APIRouter

from app.api.deps import DbSession
from app.modules.contenidos import service
from app.modules.contenidos.schemas import HomeContentOut, NewsItemOut

router = APIRouter(prefix="/content", tags=["contenidos"])


@router.get("/home", response_model=HomeContentOut)
def home(db: DbSession):
    return service.home_content(db)


@router.get("/news", response_model=list[NewsItemOut])
def news(db: DbSession):
    return service.list_news(db)
