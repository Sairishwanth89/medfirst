from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from core.elasticsearch_client import es_client
from core.redis_client import redis_client
from models.database import Medicine, User, UserRole, Pharmacy
from api.schemas import MedicineCreate, MedicineUpdate, MedicineResponse

router = APIRouter()


@router.post("/", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
async def add_medicine(
    medicine_data: MedicineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add new medicine to pharmacy stock (Pharmacy role only)
    
    Args:
        medicine_data: Medicine information
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Created medicine details
    """
    # Check if user is pharmacy owner
    if current_user.role not in [UserRole.PHARMACY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only pharmacy owners can add medicines"
        )
    
    # Verify pharmacy ownership
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == medicine_data.pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found"
        )
    
    if pharmacy.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add medicines to this pharmacy"
        )
    
    # Create medicine
    new_medicine = Medicine(**medicine_data.dict())
    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)
    
    # Index in Elasticsearch
    medicine_es_data = {
        "id": new_medicine.id,
        "name": new_medicine.name,
        "generic_name": new_medicine.generic_name,
        "manufacturer": new_medicine.manufacturer,
        "description": new_medicine.description,
        "category": new_medicine.category,
        "requires_prescription": new_medicine.requires_prescription,
        "unit_price": new_medicine.unit_price,
        "stock_quantity": new_medicine.stock_quantity,
        "pharmacy_id": pharmacy.id,
        "pharmacy_name": pharmacy.name,
        "pharmacy_city": pharmacy.city.lower(),
        "is_24_hours": pharmacy.is_24_hours,
        "created_at": new_medicine.created_at.isoformat()
    }
    
    if pharmacy.latitude and pharmacy.longitude:
        medicine_es_data["pharmacy_location"] = {
            "lat": pharmacy.latitude,
            "lon": pharmacy.longitude
        }
    
    es_client.index_medicine(medicine_es_data)
    
    # Cache in Redis
    medicine_cache_data = MedicineResponse.from_orm(new_medicine).dict()
    redis_client.set_medicine_stock(new_medicine.id, medicine_cache_data)
    
    # Publish stock update
    redis_client.publish_stock_update("stock_updates", {
        "action": "added",
        "medicine_id": new_medicine.id,
        "pharmacy_id": pharmacy.id
    })
    
    return new_medicine


@router.patch("/{medicine_id}", response_model=MedicineResponse)
async def update_stock(
    medicine_id: int,
    update_data: MedicineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update medicine stock (Pharmacy role only)
    
    Args:
        medicine_id: Medicine ID
        update_data: Fields to update
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated medicine details
    """
    # Check user role
    if current_user.role not in [UserRole.PHARMACY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only pharmacy owners can update stock"
        )
    
    # Get medicine
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    # Verify ownership
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == medicine.pharmacy_id).first()
    if pharmacy.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this medicine"
        )
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(medicine, field, value)
    
    db.commit()
    db.refresh(medicine)
    
    # Update Elasticsearch
    es_client.update_medicine(medicine_id, update_dict)
    
    # Update Redis cache
    medicine_cache_data = MedicineResponse.from_orm(medicine).dict()
    redis_client.set_medicine_stock(medicine_id, medicine_cache_data)
    
    # Publish stock update
    redis_client.publish_stock_update("stock_updates", {
        "action": "updated",
        "medicine_id": medicine_id,
        "pharmacy_id": medicine.pharmacy_id,
        "updates": update_dict
    })
    
    return medicine


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicine(
    medicine_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete medicine from stock (Pharmacy role only)
    
    Args:
        medicine_id: Medicine ID
        current_user: Authenticated user
        db: Database session
    """
    if current_user.role not in [UserRole.PHARMACY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only pharmacy owners can delete medicines"
        )
    
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == medicine.pharmacy_id).first()
    if pharmacy.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this medicine"
        )
    
    # Delete from database
    db.delete(medicine)
    db.commit()
    
    # Delete from Elasticsearch
    es_client.delete_medicine(medicine_id)
    
    # Delete from Redis
    redis_client.delete_medicine_stock(medicine_id)
    
    return None
