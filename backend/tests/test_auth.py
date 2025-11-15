#
# FILENAME: backend/tests/test_auth.py
#
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models.database import User, UserRole

# The 'client' and 'db_session' fixtures are automatically injected by pytest
# from tests/conftest.py

def test_signup_new_patient_user(client: TestClient, db_session: Session):
    """
    Test successful signup for a new patient user.
    """
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "newpatient@example.com",
            "username": "newpatient",
            "password": "password123",
            "full_name": "New Patient",
            "phone": "1234567890",
            "role": "patient"  # Explicitly setting role
        }
    )
    
    # Check for successful creation
    assert response.status_code == 201
    
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "newpatient"
    assert data["user"]["email"] == "newpatient@example.com"
    assert data["user"]["role"] == "patient"
    
    # Verify user was actually added to the database
    user_in_db = db_session.query(User).filter(
        User.username == "newpatient"
    ).first()
    
    assert user_in_db is not None
    assert user_in_db.email == "newpatient@example.com"
    assert user_in_db.role == UserRole.PATIENT


def test_signup_new_pharmacy_user(client: TestClient, db_session: Session):
    """
    Test successful signup for a new pharmacy user.
    """
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "newpharmacy@example.com",
            "username": "newpharmacy",
            "password": "password123",
            "full_name": "New Pharmacy Owner",
            "role": "pharmacy" # Explicitly setting role
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["username"] == "newpharmacy"
    assert data["user"]["role"] == "pharmacy"
    
    # Verify in database
    user_in_db = db_session.query(User).filter(
        User.username == "newpharmacy"
    ).first()
    assert user_in_db is not None
    assert user_in_db.role == UserRole.PHARMACY


def test_signup_duplicate_username(client: TestClient, test_patient_user: User):
    """
    Test signup failure when username is already taken.
    'test_patient_user' fixture pre-populates the DB.
    """
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "another@example.com",
            "username": "testpatient",  # This username already exists
            "password": "password123",
            "role": "patient"
        }
    )
    
    assert response.status_code == 400
    assert response.json() == {"detail": "Email or username already registered"}


def test_signup_duplicate_email(client: TestClient, test_patient_user: User):
    """
    Test signup failure when email is already taken.
    """
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "patient@example.com",  # This email already exists
            "username": "anotheruser",
            "password": "password123",
            "role": "patient"
        }
    )
    
    assert response.status_code == 400
    assert response.json() == {"detail": "Email or username already registered"}


def test_login_successful(client: TestClient, test_patient_user: User):
    """
    Test successful login with correct credentials.
    'test_patient_user' provides the user to log in as.
    """
    response = client.post(
        "/api/auth/login",
        json={
            "username": "testpatient",
            "password": "testpass123"  # Password defined in conftest.py
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "testpatient"


def test_login_incorrect_password(client: TestClient, test_patient_user: User):
    """
    Test login failure with an incorrect password.
    """
    response = client.post(
        "/api/auth/login",
        json={
            "username": "testpatient",
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect username or password"}


def test_login_user_not_found(client: TestClient):
    """
    Test login failure with a username that does not exist.
    """
    response = client.post(
        "/api/auth/login",
        json={
            "username": "nouser",
            "password": "password123"
        }
    )
    
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect username or password"}