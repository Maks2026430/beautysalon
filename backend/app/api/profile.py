"""Client profile (spec 6.2 «Профиль»). Phone is read-only."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_client
from app.models import User
from app.schemas.auth import UserOut
from app.schemas.profile import ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserOut)
def get_profile(user: User = Depends(get_current_client)) -> User:
    return user


@router.patch("", response_model=UserOut)
def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_client),
    db: Session = Depends(get_db),
) -> User:
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
