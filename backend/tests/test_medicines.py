#
# FILENAME: backend/tests/test_medicines.py
#
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models.database import User, Pharmacy, Medicine
from unittest.mock import patch, MagicMock

# Fixtures are auto-injected from conftest.py

# --- Fixtures specific to this test file ---

@pytest.fixture(scope="function")
def test_pharmacy_a(db_session: Session, test_pharmacy_user: User):
    """Creates Pharmacy A (Not 24h, in Testville)"""
    pharmacy = Pharmacy(
        name="Testville Pharmacy",
        address="123 Main St",
        city="Testville",
        is_24_hours=False,
        owner_id=test_pharmacy_user.id
    )
    db_session.add(pharmacy)
    db_session.commit()
    db_session.refresh(pharmacy)
    return pharmacy

@pytest.fixture(scope="function")
def test_pharmacy_b(db_session: Session, test_patient_user: User):
    """Creates Pharmacy B (24h, in Othertown)"""
    # Note: Using test_patient_user as a stand-in owner for a *different* pharmacy
    # We need a different owner, but the 'test_pharmacy_user' fixture only gives one
    # In a real app, we'd make a 'test_pharmacy_user_b'
    pharmacy = Pharmacy(
        name="Othertown 24h",
        address="456 Side St",
        city="Othertown",
        is_24_hours=True,
        owner_id=test_patient_user.id # Just needs a valid user ID
    )
    db_session.add(pharmacy)
    db_session.commit()
    db_session.refresh(pharmacy)
    return pharmacy

@pytest.fixture(scope="function")
def test_medicine_a(db_session: Session, test_pharmacy_a: Pharmacy):
    """Paracetamol, cheap, no prescription, in stock, at Pharmacy A"""
    med = Medicine(
        name="Paracetamol 500mg",
        generic_name="Paracetamol",
        unit_price=5.99,
        stock_quantity=100,
        pharmacy_id=test_pharmacy_a.id,
        requires_prescription=False
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)
    return med

@pytest.fixture(scope="function")
def test_medicine_b(db_session: Session, test_pharmacy_a: Pharmacy):
    """Amoxicillin, expensive, prescription, in stock, at Pharmacy A"""
    med = Medicine(
        name="Amoxicillin 250mg",
        generic_name="Amoxicillin",
        unit_price=25.99,
        stock_quantity=50,
        pharmacy_id=test_pharmacy_a.id,
        requires_prescription=True
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)
    return med

@pytest.fixture(scope="function")
def test_medicine_c(db_session: Session, test_pharmacy_b: Pharmacy):
    """Aspirin, 24h pharmacy, in stock, at Pharmacy B"""
    med = Medicine(
        name="Aspirin 100mg",
        generic_name="Aspirin",
        unit_price=8.50,
        stock_quantity=200,
        pharmacy_id=test_pharmacy_b.id,
        requires_prescription=False
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)
    return med


# --- Tests for GET /api/medicines/{medicine_id} ---

@patch('api.routes.medicines.redis_client')
def test_get_medicine_cache_hit(
    mock_redis: MagicMock, 
    client: TestClient, 
    test_medicine_a: Medicine
):
    """
    Test successful retrieval from Redis cache (cache hit).
    """
    cached_data = {"id": test_medicine_a.id, "name": "Cached Paracetamol"}
    mock_redis.get_medicine_stock.return_value = cached_data
    
    response = client.get(f"/api/medicines/{test_medicine_a.id}")
    
    assert response.status_code == 200
    assert response.json() == cached_data
    mock_redis.get_medicine_stock.assert_called_once_with(test_medicine_a.id)


@patch('api.routes.medicines.redis_client')
def test_get_medicine_cache_miss(
    mock_redis: MagicMock, 
    client: TestClient, 
    test_medicine_a: Medicine
):
    """
    Test successful retrieval from DB (cache miss) and subsequent caching.
    """
    mock_redis.get_medicine_stock.return_value = None
    
    response = client.get(f"/api/medicines/{test_medicine_a.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_medicine_a.id
    assert data["name"] == test_medicine_a.name
    
    # Check that it tried to get from cache, then set the cache
    mock_redis.get_medicine_stock.assert_called_once_with(test_medicine_a.id)
    mock_redis.set_medicine_stock.assert_called_once()


def test_get_medicine_not_found(client: TestClient):
    """
    Test 404 error for a medicine that does not exist.
    """
    response = client.get("/api/medicines/99999")
    assert response.status_code == 404
    assert response.json() == {"detail": "Medicine not found"}


# --- Tests for POST /api/medicines/search ---

@patch('api.routes.medicines.es_client')
def test_search_elasticsearch_success(mock_es: MagicMock, client: TestClient):
    """
    Test successful search using Elasticsearch (primary path).
    """
    es_results = [{"id": 1, "name": "ES Result Med"}]
    mock_es.search_medicines.return_value = es_results
    
    search_query = {"query": "test"}
    response = client.post("/api/medicines/search", json=search_query)
    
    assert response.status_code == 200
    assert response.json() == es_results
    mock_es.search_medicines.assert_called_once()


@patch('api.routes.medicines.es_client')
def test_search_db_fallback(
    mock_es: MagicMock, 
    client: TestClient, 
    test_medicine_a: Medicine,
    test_medicine_b: Medicine
):
    """
    Test fallback to database search when Elasticsearch returns nothing.
    """
    mock_es.search_medicines.return_value = [] # Simulate ES failure/no results
    
    search_query = {"query": "mol"} # Should match "Paracetamol" and "Amoxicillin"
    response = client.post("/api/medicines/search", json=search_query)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == test_medicine_a.name
    assert data[1]["name"] == test_medicine_b.name


@patch('api.routes.medicines.es_client')
def test_search_db_fallback_filter_city(
    mock_es: MagicMock, 
    client: TestClient, 
    test_medicine_a: Medicine,
    test_medicine_c: Medicine # In "Othertown"
):
    """
    Test database fallback with a city filter.
    """
    mock_es.search_medicines.return_value = []
    
    search_query = {"query": "a", "city": "Othertown"} # Should match Aspirin
    response = client.post("/api/medicines/search", json=search_query)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == test_medicine_c.name
    assert data[0]["pharmacy_city"] == "Othertown"


@patch('api.routes.medicines.es_client')
def test_search_db_fallback_filter_24h(
    mock_es: MagicMock, 
    client: TestClient, 
    test_medicine_a: Medicine, # Not 24h
    test_medicine_c: Medicine  # 24h
):
    """
    Test database fallback with 'is_24_hours' filter.
    """
    mock_es.search_medicines.return_value = []
    
    search_query = {"query": "a", "is_24_hours": True} # Should match Aspirin
    response = client.post("/api/medicines/search", json=search_query)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == test_medicine_c.name
    assert data[0]["is_24_hours"] == True


@patch('api.routes.medicines.es_client')
def test_search_db_fallback_filter_prescription(
    mock_es: MagicMock, 
    client: TestClient, 
    test_medicine_a: Medicine, # Rx: False
    test_medicine_b: Medicine  # Rx: True
):
    """
    Test database fallback with 'requires_prescription' filter.
    """
    mock_es.search_medicines.return_value = []
    
    # Test for "requires prescription = TRUE"
    search_query = {"query": "mol", "requires_prescription": True}
    response = client.post("/api/medicines/search", json=search_query)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == test_medicine_b.name

    # Test for "requires prescription = FALSE"
    search_query = {"query": "mol", "requires_prescription": False}
    response = client.post("/api/medicines/search", json=search_query)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == test_medicine_a.name