#
# FILENAME: backend/api/routes/analytics.py
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


@router.get(
    "/most-sold-medicines", 
    response_model=List[MostSoldMedicineResponse]
)
async def get_most_sold_medicines(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the most sold medicines across all pharmacies.
    (This is a simplified example; a real one might be
     admin-only or filtered by pharmacy owner)
    """
    # This query groups by medicine_id, sums the quantity,
    # joins with the Medicine table to get the name,
    # and orders by the summed quantity in descending order.
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
    
    # Format the response
    return [
        {"medicine_name": name, "medicine_id": med_id, "total_sold": total}
        for name, med_id, total in most_sold
    ]


@router.get(
    "/busiest-pharmacies", 
    response_model=List[BusiestPharmacyResponse]
)
async def get_busiest_pharmacies(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the busiest pharmacies based on the number of orders received.
    (This should ideally be an ADMIN-only endpoint)
    """
    # This query groups by pharmacy_id, counts the number of orders,
    # joins with the Pharmacy table to get the name,
    # and orders by the order count in descending order.
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
    
    # Format the response
    return [
        {"pharmacy_name": name, "pharmacy_id": pharm_id, "total_orders": total}
        for name, pharm_id, total in busiest
    ]