from typing import Tuple, Union
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.core.security import hash_password, verify_password, create_access_token
from src.models.database_models import User
from src.repositories.user_repository import UserRepository, user_repository
from src.schemas.user_schema import UserCreate


class AuthService:
    """
    Service layer orchestrating business logic for user authentication,
    registration, password verification, and JWT generation.
    """

    def __init__(self, repo: UserRepository = user_repository):
        self.repo = repo

    def register_user(self, db: Session, user_in: UserCreate) -> Tuple[User, str]:
        """
        Register a new user: validates uniqueness, hashes password, stores record,
        and generates an initial JWT access token.
        """
        existing_user = self.repo.get_by_email(db, email=user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )

        hashed_password = hash_password(user_in.password)
        new_user = self.repo.create(
            db=db,
            email=user_in.email,
            password_hash=hashed_password,
        )

        access_token = create_access_token(
            data={"sub": str(new_user.id), "email": new_user.email}
        )

        return new_user, access_token

    def authenticate_user(self, db: Session, email: str, password: str) -> Tuple[User, str]:
        """
        Authenticate an existing user by email and password.
        Returns user model and signed JWT access token.
        """
        user = self.repo.get_by_email(db, email=email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )

        return user, access_token

    def get_user_by_id(self, db: Session, user_id: Union[UUID, str]) -> User:
        """
        Retrieve user by ID or raise 404 if not found.
        """
        user = self.repo.get_by_id(db, user_id=user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )
        return user


auth_service = AuthService()
