#
# FILENAME: backend/tests/test_stock.py
#
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models.database import User, Pharmacy, Medicine, UserRole
from unittest.mock import patch

# Fixtures are auto-injected from conftest.py

# --- Fixtures specific to this test file ---

@pytest.fixture(scope="function")
def test_pharmacy(db_session: Session, test_pharmacy_user: User):
    """
    Fixture to create a pharmacy linked to the test_pharmacy_user.
    (This is duplicated from test_pharmacies.py; 
     in a real project, this would move to conftest.py)
    """
    pharmacy = Pharmacy(
        name="Testville Pharmacy",
        address="123 Main St",
        city="Testville",
        owner_id=test_pharmacy_user.id
    )
    db_session.add(pharmacy)
    db_session.commit()
    db_session.refresh(pharmacy)
    return pharmacy

@pytest.fixture(scope="function")
def test_medicine(db_session: Session, test_pharmacy: Pharmacy):
    """
    Fixture to create a medicine item linked to the test_pharmacy.
    """
    medicine = Medicine(
        name="Testacin",
        generic_name="Test-o-mol",
        manufacturer="TestPharma",
        unit_price=9.99,
        stock_quantity=100,
        pharmacy_id=test_pharmacy.id
    )
    db_session.add(medicine)
    db_session.commit()
    db_session.refresh(medicine)
    return medicine

# --- Tests ---

# We patch the clients imported in the 'stock' route file
@patch('api.routes.stock.es_client')
@patch('api.routes.stock.redis_client')
def test_add_medicine_success(
    mock_redis: patch, 
    mock_es: patch,
    client: TestClient, 
    pharmacy_auth_token: str, 
    test_pharmacy: Pharmacy
):
    """
    Test successful addition of a new medicine by the pharmacy owner.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    medicine_data = {
        "name": "NewMed",
        "generic_name": "New-o-mol",
        "manufacturer": "TestPharma",
        "description": "A new test medicine",
        "category": "testing",
        "requires_prescription": False,
        "unit_price": 15.00,
        "stock_quantity": 50,
        "pharmacy_id": test_pharmacy.id # Owner is adding to their own pharmacy
    }
    
    response = client.post("/api/stock/", headers=headers, json=medicine_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "NewMed"
    assert data["stock_quantity"] == 50
    assert data["pharmacy_id"] == test_pharmacy.id
    
    # Check that our mocks were called
    mock_es.index_medicine.assert_called_once()
    mock_redis.set_medicine_stock.assert_called_once()
    mock_redis.publish_stock_update.assert_called_once()


@patch('api.routes.stock.es_client')
@patch('api.routes.stock.redis_client')
def test_add_medicine_by_patient(
    mock_redis: patch, 
    mock_es: patch,
    client: TestClient, 
    patient_auth_token: str, 
    test_pharmacy: Pharmacy
):
    """
    Test failure: a patient cannot add medicine.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    medicine_data = {
        "name": "PatientMed",
        "unit_price": 10.00,
        "stock_quantity": 10,
        "pharmacy_id": test_pharmacy.id
    }
    
    response = client.post("/api/stock/", headers=headers, json=medicine_data)
    
    assert response.status_code == 403
    assert response.json() == {"detail": "Only pharmacy owners can add medicines"}


@patch('api.routes.stock.es_client')
@patch('api.routes.stock.redis_client')
def test_add_medicine_to_wrong_pharmacy(
    mock_redis: patch, 
    mock_es: patch,
    client: TestClient, 
    pharmacy_auth_token: str,
    test_pharmacy: Pharmacy # This creates Pharmacy 1, owned by user
):
    """
    Test failure: a pharmacy owner cannot add medicine to a pharmacy
    they do not own (e.g., pharmacy_id = 999).
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    medicine_data = {
        "name": "WrongMed",
        "unit_price": 10.00,
        "stock_quantity": 10,
        "pharmacy_id": 999 # Non-existent or not owned
    }
    
    response = client.post("/api/stock/", headers=headers, json=medicine_data)
    
    assert response.status_code == 404 # 404 because pharmacy 999 not found
    assert response.json() == {"detail": "Pharmacy not found"}


@patch('api.routes.stock.es_client')
@patch('api.routes.stock.redis_client')
def test_update_stock_success(
    mock_redis: patch, 
    mock_es: patch,
    client: TestClient, 
    pharmacy_auth_token: str, 
    test_medicine: Medicine
):
    """
    Test successful update of medicine stock by the owner.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    update_data = {
        "stock_quantity": 75,
        "unit_price": 10.99
    }
    
    response = client.patch(
        f"/api/stock/{test_medicine.id}", 
        headers=headers, 
        json=update_data
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_medicine.id
    assert data["stock_quantity"] == 75
    assert data["unit_price"] == 10.99
    
    # Check mocks
    mock_es.update_medicine.assert_called_once()
    mock_redis.set_medicine_stock.assert_called_once()
    mock_redis.publish_stock_update.assert_called_once()


def test_update_stock_by_patient(
    client: TestClient, 
    patient_auth_token: str, 
    test_medicine: Medicine
):
    """
    Test failure: a patient cannot update stock.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    update_data = {"stock_quantity": 50}
    
    response = client.patch(
        f"/api/stock/{test_medicine.id}", 
        headers=headers, 
        json=update_data
    )
    
    assert response.status_code == 403
    assert response.json() == {"detail": "Only pharmacy owners can update stock"}


@patch('api.routes.stock.es_client')
@patch('api.routes.stock.redis_client')
def test_delete_medicine_success(
    mock_redis: patch, 
    mock_es: patch,
    client: TestClient, 
    pharmacy_auth_token: str, 
    test_medicine: Medicine,
    db_session: Session
):
    """
    Test successful deletion of a medicine by the owner.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    
    response = client.delete(
        f"/api/stock/{test_medicine.id}", 
        headers=headers
    )
    
    assert response.status_code == 204
    
    # Verify it's gone from the database
    medicine_in_db = db_session.query(Medicine).filter(
        Medicine.id == test_medicine.id
    ).first()
    assert medicine_in_db is None
    
    # Check mocks
    mock_es.delete_medicine.assert_called_once_with(test_medicine.id)
    mock_redis.delete_medicine_stock.assert_called_once_with(test_medicine.id)