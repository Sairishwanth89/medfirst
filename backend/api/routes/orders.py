from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.security import get_current_user
from models.database import Order, OrderItem, Medicine, User, OrderStatus, Pharmacy
from api.schemas import OrderCreate, OrderResponse, OrderStatusUpdate
from core.rabbitmq import mq_client # New Import

router = APIRouter()

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ... [Existing Logic: Calculate total, check stock] ...
    # For brevity, copying the essential parts logic logic:
    
    total_amount = 0
    order_items_data = []
    
    for item in order_data.items:
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        if not medicine: raise HTTPException(404, "Medicine not found")
        if medicine.stock_quantity < item.quantity: raise HTTPException(400, "Insufficient stock")
        
        subtotal = medicine.unit_price * item.quantity
        total_amount += subtotal
        order_items_data.append({
            "medicine_id": medicine.id, "quantity": item.quantity,
            "unit_price": medicine.unit_price, "subtotal": subtotal
        })
    
    new_order = Order(
        user_id=current_user.id, pharmacy_id=order_data.pharmacy_id,
        total_amount=total_amount, delivery_address=order_data.delivery_address,
        notes=order_data.notes, status=OrderStatus.PENDING
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    for item_data in order_items_data:
        db.add(OrderItem(order_id=new_order.id, **item_data))
    db.commit()
    
    # --- CHANGED: Publish to RabbitMQ ---
    try:
        mq_client.publish("orders_queue", {"order_id": new_order.id})
    except Exception as e:
        # Log error but don't fail request
        print(f"Failed to queue order: {e}")
    # ------------------------------------
    
    return new_order

# ... [Rest of the file remains the same: get_user_orders, etc.] ...
@router.get("/", response_model=List[OrderResponse])
async def get_user_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.user_id == current_user.id).all()

@router.get("/pharmacy/me", response_model=List[OrderResponse])
async def get_pharmacy_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_id == current_user.id).first()
    if not pharmacy: raise HTTPException(404, "Pharmacy not found")
    return db.query(Order).filter(Order.pharmacy_id == pharmacy.id).all()