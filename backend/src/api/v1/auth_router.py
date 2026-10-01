from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from src.api.deps import get_current_user
from src.core.database import get_db
from src.models.database_models import User
from src.schemas.user_schema import UserCreate, UserLogin, UserResponse, Token
from src.services.auth_service import auth_service

router = APIRouter()


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a new user with an email and password, returning a JWT access token.",
)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
) -> Token:
    user, access_token = auth_service.register_user(db=db, user_in=user_in)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user (JSON)",
    description="Authenticates a user via JSON payload with email and password, returning a JWT access token.",
)
def login(
    user_in: UserLogin,
    db: Session = Depends(get_db),
) -> Token:
    user, access_token = auth_service.authenticate_user(
        db=db,
        email=user_in.email,
        password=user_in.password,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/token",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="OAuth2 Form Login (Swagger UI compatible)",
    description="Authenticates a user via standard OAuth2 password form (using username as email).",
)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    user, access_token = auth_service.authenticate_user(
        db=db,
        email=form_data.username,
        password=form_data.password,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns the authenticated user's profile details.",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
