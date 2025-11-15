#
# FILENAME: backend/tests/conftest.py
#
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app  # Import your main FastAPI app
from core.database import Base, get_db
from models.database import User, Pharmacy, Medicine, Order, OrderItem
from core.security import create_access_token

# --- Test Database Setup ---
# We use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# Create a test session
TestingSessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

# --- Pytest Fixtures ---

@pytest.fixture(scope="function")
def db_session():
    """
    Fixture to create a fresh, clean database for each test function.
    """
    # Create the tables in the in-memory database
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after the test is done
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Fixture to create a TestClient that uses the test database.
    """
    def override_get_db():
        """
        Dependency override: tells the app to use the test database
        session instead of the real one.
        """
        try:
            yield db_session
        finally:
            db_session.close()

    # Override the get_db dependency in the main app
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
    
    # Clear the dependency override after the test
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_patient_user(db_session):
    """
    Fixture to create a PATIENT user in the test database.
    Returns the user object.
    """
    from core.security import get_password_hash
    from models.database import UserRole

    user = User(
        email="patient@example.com",
        username="testpatient",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test Patient",
        role=UserRole.PATIENT,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_pharmacy_user(db_session):
    """
    Fixture to create a PHARMACY user in the test database.
    Returns the user object.
    """
    from core.security import get_password_hash
    from models.database import UserRole

    user = User(
        email="pharmacy@example.com",
        username="testpharmacy",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test Pharmacy Owner",
        role=UserRole.PHARMACY,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def patient_auth_token(test_patient_user):
    """
    Fixture to generate an auth token for the test PATIENT user.
    """
    return create_access_token(data={"sub": test_patient_user.username})


@pytest.fixture(scope="function")
def pharmacy_auth_token(test_pharmacy_user):
    """
    Fixture to generate an auth token for the test PHARMACY user.
    """
    return create_access_token(data={"sub": test_pharmacy_user.username})