#
# FILENAME: backend/api/routes/pharmacies.py
#
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from core.security import get_current_user
from models.database import User, UserRole, Pharmacy
from api.schemas import PharmacyCreate, PharmacyResponse, PharmacyUpdate

router = APIRouter()


@router.post(
    "/", 
    response_model=PharmacyResponse, 
    status_code=status.HTTP_201_CREATED
)
async def create_pharmacy(
    pharmacy_data: PharmacyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new pharmacy profile.
    Only users with the 'PHARMACY' role can create one pharmacy.
    """
    # 1. Check user role
    if current_user.role != UserRole.PHARMACY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create a pharmacy."
        )

    # 2. Check if user already owns a pharmacy
    existing_pharmacy = db.query(Pharmacy).filter(
        Pharmacy.owner_id == current_user.id
    ).first()
    
    if existing_pharmacy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already own a pharmacy. You can update it via the PUT /api/pharmacies/me endpoint."
        )
    
    # 3. Create the new pharmacy
    new_pharmacy = Pharmacy(
        **pharmacy_data.dict(),
        owner_id=current_user.id
    )
    
    db.add(new_pharmacy)
    db.commit()
    db.refresh(new_pharmacy)
    
    return new_pharmacy


@router.get("/me", response_model=PharmacyResponse)
async def get_my_pharmacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the pharmacy profile for the currently authenticated pharmacy owner.
    """
    if current_user.role not in [UserRole.PHARMACY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this resource."
        )

    pharmacy = db.query(Pharmacy).filter(
        Pharmacy.owner_id == current_user.id
    ).first()
    
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy profile not found. Please create one first."
        )
        
    return pharmacy


@router.put("/me", response_model=PharmacyResponse)
async def update_my_pharmacy(
    update_data: PharmacyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the pharmacy profile for the currently authenticated pharmacy owner.
    """
    pharmacy = await get_my_pharmacy(current_user, db) # Re-uses the logic and checks from get_my_pharmacy
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(pharmacy, field, value)
    
    db.commit()
    db.refresh(pharmacy)
    
    return pharmacy


@router.get("/{pharmacy_id}", response_model=PharmacyResponse)
async def get_pharmacy_details(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """
    Get public details for a specific pharmacy.
    """
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
    
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found."
        )
        
    return pharmacy