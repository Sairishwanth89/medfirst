#
# FILENAME: backend/tests/test_pharmacies.py
#
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models.database import User, Pharmacy, UserRole

# Fixtures 'client', 'db_session', 'pharmacy_auth_token', 
# 'patient_auth_token', and 'test_pharmacy_user' are auto-injected from conftest.py

PHARMACY_DATA = {
    "name": "Testville Pharmacy",
    "address": "123 Main St",
    "city": "Testville",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "phone": "555-1234",
    "is_24_hours": True
}

@pytest.fixture(scope="function")
def test_pharmacy(db_session: Session, test_pharmacy_user: User):
    """
    Fixture to pre-create a pharmacy linked to the test_pharmacy_user.
    """
    pharmacy = Pharmacy(
        **PHARMACY_DATA,
        owner_id=test_pharmacy_user.id
    )
    db_session.add(pharmacy)
    db_session.commit()
    db_session.refresh(pharmacy)
    return pharmacy


def test_create_pharmacy_success(client: TestClient, pharmacy_auth_token: str):
    """
    Test successful creation of a pharmacy by an authenticated PHARMACY user.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    response = client.post(
        "/api/pharmacies/",
        headers=headers,
        json=PHARMACY_DATA
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == PHARMACY_DATA["name"]
    assert data["city"] == PHARMACY_DATA["city"]
    assert "owner_id" in data


def test_create_pharmacy_by_patient(client: TestClient, patient_auth_token: str):
    """
    Test failure: a PATIENT user should not be able to create a pharmacy.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    response = client.post(
        "/api/pharmacies/",
        headers=headers,
        json=PHARMACY_DATA
    )
    
    assert response.status_code == 403
    assert response.json() == {"detail": "You do not have permission to create a pharmacy."}


def test_create_pharmacy_unauthenticated(client: TestClient):
    """
    Test failure: an unauthenticated user should not be able to create a pharmacy.
    """
    response = client.post(
        "/api/pharmacies/",
        json=PHARMACY_DATA
    )
    assert response.status_code == 401 # Or 403 depending on your setup, 401 is common
    assert response.json() == {"detail": "Not authenticated"}


def test_create_pharmacy_duplicate(
    client: TestClient, 
    pharmacy_auth_token: str, 
    test_pharmacy: Pharmacy
):
    """
    Test failure: a PHARMACY user who already owns a pharmacy cannot create a second one.
    The 'test_pharmacy' fixture creates the first pharmacy.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    response = client.post(
        "/api/pharmacies/",
        headers=headers,
        json={
            "name": "Second Pharmacy",
            "address": "456 Side St",
            "city": "Testville",
        }
    )
    
    assert response.status_code == 400
    assert "You already own a pharmacy" in response.json()["detail"]


def test_get_my_pharmacy_success(
    client: TestClient, 
    pharmacy_auth_token: str, 
    test_pharmacy: Pharmacy
):
    """
    Test successful retrieval of a pharmacy profile by its owner.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    response = client.get("/api/pharmacies/me", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_pharmacy.name
    assert data["id"] == test_pharmacy.id


def test_get_my_pharmacy_no_profile(client: TestClient, pharmacy_auth_token: str):
    """
    Test failure: pharmacy owner tries to get profile before creating one.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    # Note: We do *not* use the 'test_pharmacy' fixture here
    response = client.get("/api/pharmacies/me", headers=headers)
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Pharmacy profile not found. Please create one first."}


def test_update_my_pharmacy_success(
    client: TestClient, 
    pharmacy_auth_token: str, 
    test_pharmacy: Pharmacy
):
    """
    Test successful update of a pharmacy profile by its owner.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    update_data = {
        "name": "Updated Pharmacy Name",
        "phone": "555-9999",
        "is_24_hours": False
    }
    response = client.put(
        "/api/pharmacies/me",
        headers=headers,
        json=update_data
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Pharmacy Name"
    assert data["phone"] == "555-9999"
    assert data["is_24_hours"] == False
    assert data["city"] == test_pharmacy.city # Ensure non-updated fields remain


def test_get_public_pharmacy_details(client: TestClient, test_pharmacy: Pharmacy):
    """
    Test successful retrieval of public pharmacy details by any user (unauthenticated).
    """
    response = client.get(f"/api/pharmacies/{test_pharmacy.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_pharmacy.name
    assert data["city"] == test_pharmacy.city


def test_get_nonexistent_pharmacy_details(client: TestClient):
    """
    Test failure when requesting a pharmacy ID that does not exist.
    """
    response = client.get("/api/pharmacies/99999")
    
    assert response.status_code == 404
    assert response.json() == {"detail": "Pharmacy not found."}