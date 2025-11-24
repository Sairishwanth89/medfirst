#
# FILENAME: backend/api/routes/analytics.py
# [--- THIS IS THE FULLY CORRECTED FILE ---]
#
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from core.database import get_db
from core.security import get_current_user
from models.database import User, UserRole, Order, OrderItem, Medicine, Pharmacy
from api.schemas import MostSoldMedicineResponse, BusiestPharmacyResponse

router = APIRouter()

# --- NEW: RBAC Dependency ---
async def get_admin_user(current_user: User = Depends(get_current_user)):
    """
    Dependency to check if the current user is an ADMIN.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource."
        )
    return current_user
# --- END NEW ---


@router.get(
    "/most-sold-medicines", 
    response_model=List[MostSoldMedicineResponse],
    # --- FIX: ADD ADMIN DEPENDENCY ---
    dependencies=[Depends(get_admin_user)]
)
async def get_most_sold_medicines(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get the most sold medicines across all pharmacies.
    (ADMIN role required)
    """
    most_sold = (
        db.query(
            Medicine.name,
            Medicine.id,
            func.sum(OrderItem.quantity).label("total_sold")
        )
        .join(Medicine, OrderItem.medicine_id == Medicine.id)
        .group_by(Medicine.id, Medicine.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    
    return [
        {"medicine_name": name, "medicine_id": med_id, "total_sold": total}
        for name, med_id, total in most_sold
    ]


@router.get(
    "/busiest-pharmacies", 
    response_model=List[BusiestPharmacyResponse],
    # --- FIX: ADD ADMIN DEPENDENCY ---
    dependencies=[Depends(get_admin_user)]
)
async def get_busiest_pharmacies(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get the busiest pharmacies based on the number of orders received.
    (ADMIN role required)
    """
    busiest = (
        db.query(
            Pharmacy.name,
            Pharmacy.id,
            func.count(Order.id).label("total_orders")
        )
        .join(Pharmacy, Order.pharmacy_id == Pharmacy.id)
        .group_by(Pharmacy.id, Pharmacy.name)
        .order_by(func.count(Order.id).desc())
        .limit(limit)
        .all()
    )
    
    return [
        {"pharmacy_name": name, "pharmacy_id": pharm_id, "total_orders": total}
        for name, pharm_id, total in busiest
    ]