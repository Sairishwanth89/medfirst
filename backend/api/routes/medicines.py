from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.security import get_current_user
from core.elasticsearch_client import es_client
from core.redis_client import redis_client
from models.database import Medicine, Pharmacy, User
from api.schemas import MedicineSearchQuery, MedicineResponse

router = APIRouter()


@router.post("/search", response_model=List[dict])
async def search_medicines(
    search_query: MedicineSearchQuery,
    db: Session = Depends(get_db)
):
    """
    Search medicines using Elasticsearch with filters
    
    Args:
        search_query: Search parameters
        db: Database session
        
    Returns:
        List of medicines with pharmacy details
    """
    # Try Elasticsearch search first
    es_results = es_client.search_medicines(
        query=search_query.query,
        city=search_query.city,
        is_24_hours=search_query.is_24_hours,
        requires_prescription=search_query.requires_prescription,
        max_price=search_query.max_price,
        limit=search_query.limit
    )
    
    if es_results:
        return es_results
    
    # Fallback to database search if Elasticsearch is unavailable
    query = db.query(Medicine).join(Pharmacy)
    
    # Apply filters
    query = query.filter(
        Medicine.name.ilike(f"%{search_query.query}%") |
        Medicine.generic_name.ilike(f"%{search_query.query}%")
    )
    
    if search_query.city:
        query = query.filter(Pharmacy.city.ilike(f"%{search_query.city}%"))
    
    if search_query.is_24_hours is not None:
        query = query.filter(Pharmacy.is_24_hours == search_query.is_24_hours)
    
    if search_query.requires_prescription is not None:
        query = query.filter(Medicine.requires_prescription == search_query.requires_prescription)
    
    if search_query.max_price is not None:
        query = query.filter(Medicine.unit_price <= search_query.max_price)
    
    # Only show in-stock medicines
    query = query.filter(Medicine.stock_quantity > 0)
    
    results = query.limit(search_query.limit).all()
    
    # Format results
    formatted_results = []
    for medicine in results:
        formatted_results.append({
            "id": medicine.id,
            "name": medicine.name,
            "generic_name": medicine.generic_name,
            "unit_price": medicine.unit_price,
            "stock_quantity": medicine.stock_quantity,
            "pharmacy_name": medicine.pharmacy.name,
            "pharmacy_city": medicine.pharmacy.city,
            "pharmacy_address": medicine.pharmacy.address,
            "is_24_hours": medicine.pharmacy.is_24_hours
        })
    
    return formatted_results


@router.get("/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: int,
    db: Session = Depends(get_db)
):
    """
    Get medicine details by ID
    
    Args:
        medicine_id: Medicine ID
        db: Database session
        
    Returns:
        Medicine details
    """
    # Check Redis cache first
    cached_data = redis_client.get_medicine_stock(medicine_id)
    if cached_data:
        return cached_data
    
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    # Cache the result
    medicine_data = MedicineResponse.from_orm(medicine).dict()
    redis_client.set_medicine_stock(medicine_id, medicine_data)
    
    return medicine
