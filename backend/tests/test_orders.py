#
# FILENAME: backend/tests/test_orders.py
#
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models.database import User, Pharmacy, Medicine, Order, OrderItem, OrderStatus, UserRole
from unittest.mock import patch

# Fixtures are auto-injected from conftest.py

# --- Fixtures specific to this test file ---

@pytest.fixture(scope="function")
def test_pharmacy(db_session: Session, test_pharmacy_user: User):
    """
    Fixture to create a pharmacy.
    """
    pharmacy = Pharmacy(
        name="Order Test Pharmacy",
        address="123 Order St",
        city="Orderville",
        owner_id=test_pharmacy_user.id
    )
    db_session.add(pharmacy)
    db_session.commit()
    db_session.refresh(pharmacy)
    return pharmacy

@pytest.fixture(scope="function")
def test_medicine_in_stock(db_session: Session, test_pharmacy: Pharmacy):
    """
    Fixture to create a medicine that is in stock.
    """
    medicine = Medicine(
        name="Orderacin",
        unit_price=10.00,
        stock_quantity=100,
        pharmacy_id=test_pharmacy.id
    )
    db_session.add(medicine)
    db_session.commit()
    db_session.refresh(medicine)
    return medicine

@pytest.fixture(scope="function")
def test_medicine_low_stock(db_session: Session, test_pharmacy: Pharmacy):
    """
    Fixture to create a medicine with low stock.
    """
    medicine = Medicine(
        name="LowStockMed",
        unit_price=5.00,
        stock_quantity=3,
        pharmacy_id=test_pharmacy.id
    )
    db_session.add(medicine)
    db_session.commit()
    db_session.refresh(medicine)
    return medicine

@pytest.fixture(scope="function")
def test_order(
    db_session: Session, 
    test_patient_user: User, 
    test_pharmacy: Pharmacy,
    test_medicine_in_stock: Medicine
):
    """
    Fixture to create a pre-existing order for the patient.
    """
    order = Order(
        user_id=test_patient_user.id,
        pharmacy_id=test_pharmacy.id,
        total_amount=20.00,
        delivery_address="456 Test Ave",
        status=OrderStatus.PENDING
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    
    item = OrderItem(
        order_id=order.id,
        medicine_id=test_medicine_in_stock.id,
        quantity=2,
        unit_price=10.00,
        subtotal=20.00
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(order)
    return order


# --- Tests ---

# We patch the 'process_order' task imported in the 'orders' route file
@patch('api.routes.orders.process_order.delay')
def test_place_order_success(
    mock_process_order: patch,
    client: TestClient,
    patient_auth_token: str,
    test_pharmacy: Pharmacy,
    test_medicine_in_stock: Medicine
):
    """
    Test successful order placement by a patient.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    order_data = {
        "pharmacy_id": test_pharmacy.id,
        "delivery_address": "123 Patient St",
        "items": [
            {
                "medicine_id": test_medicine_in_stock.id,
                "quantity": 5
            }
        ]
    }

    response = client.post("/api/orders/", headers=headers, json=order_data)

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["total_amount"] == 50.00 # 5 * 10.00
    assert data["delivery_address"] == "123 Patient St"
    assert len(data["order_items"]) == 1
    assert data["order_items"][0]["medicine_id"] == test_medicine_in_stock.id
    
    # Check that the Celery task was called
    mock_process_order.assert_called_once_with(data["id"])


@patch('api.routes.orders.process_order.delay')
def test_place_order_insufficient_stock(
    mock_process_order: patch,
    client: TestClient,
    patient_auth_token: str,
    test_pharmacy: Pharmacy,
    test_medicine_low_stock: Medicine
):
    """
    Test failure when ordering more medicine than is in stock.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    order_data = {
        "pharmacy_id": test_pharmacy.id,
        "delivery_address": "123 Patient St",
        "items": [
            {
                "medicine_id": test_medicine_low_stock.id,
                "quantity": 10 # Only 3 in stock
            }
        ]
    }

    response = client.post("/api/orders/", headers=headers, json=order_data)

    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]
    
    # Celery task should NOT have been called
    mock_process_order.assert_not_called()


def test_place_order_medicine_not_found(
    client: TestClient,
    patient_auth_token: str,
    test_pharmacy: Pharmacy
):
    """
    Test failure when ordering a medicine ID that does not exist.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    order_data = {
        "pharmacy_id": test_pharmacy.id,
        "delivery_address": "123 Patient St",
        "items": [
            {
                "medicine_id": 99999,
                "quantity": 1
            }
        ]
    }

    response = client.post("/api/orders/", headers=headers, json=order_data)

    assert response.status_code == 404
    assert "Medicine 99999 not found" in response.json()["detail"]


def test_get_user_orders(
    client: TestClient, 
    patient_auth_token: str, 
    test_order: Order
):
    """
    Test successfully retrieving all orders for the authenticated user.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    response = client.get("/api/orders/", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == test_order.id
    assert data[0]["total_amount"] == 20.00


def test_get_specific_order_success(
    client: TestClient, 
    patient_auth_token: str, 
    test_order: Order
):
    """
    Test successfully retrieving a single order by its ID.
    """
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    response = client.get(f"/api/orders/{test_order.id}", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_order.id
    assert data["delivery_address"] == "456 Test Ave"


def test_get_specific_order_not_owned(
    client: TestClient, 
    pharmacy_auth_token: str, # Use a *different* user's token
    test_order: Order
):
    """
    Test failure: user tries to get an order that does not belong to them.
    """
    headers = {"Authorization": f"Bearer {pharmacy_auth_token}"}
    response = client.get(f"/api/orders/{test_order.id}", headers=headers)
    
    assert response.status_code == 403
    assert response.json() == {"detail": "You don't have permission to view this order"}


def test_cancel_order_success(
    client: TestClient, 
    patient_auth_token: str, 
    test_order: Order
):
    """
    Test successfully cancelling a PENDING order.
    """
    assert test_order.status == OrderStatus.PENDING # Verify initial state
    
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    response = client.patch(
        f"/api/orders/{test_order.id}/cancel", 
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_order.id
    assert data["status"] == "cancelled"


def test_cancel_order_already_delivered(
    client: TestClient, 
    patient_auth_token: str, 
    test_order: Order,
    db_session: Session
):
    """
    Test failure when trying to cancel an order that is already delivered.
    """
    # Manually update the order to "delivered"
    test_order.status = OrderStatus.DELIVERED
    db_session.commit()
    
    headers = {"Authorization": f"Bearer {patient_auth_token}"}
    response = client.patch(
        f"/api/orders/{test_order.id}/cancel", 
        headers=headers
    )
    
    assert response.status_code == 400
    assert "Cannot cancel order with status: delivered" in response.json()["detail"]