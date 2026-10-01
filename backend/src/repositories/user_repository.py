from typing import Optional, List, Union
from uuid import UUID
from sqlalchemy.orm import Session
from src.models.database_models import User


class UserRepository:
    """
    Repository layer handling database CRUD operations for the User entity.
    """

    def get_by_id(self, db: Session, user_id: Union[UUID, str]) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower()).first()

    def create(self, db: Session, email: str, password_hash: str) -> User:
        user = User(
            email=email.lower().strip(),
            password_hash=password_hash,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def list(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).offset(skip).limit(limit).all()


user_repository = UserRepository()
