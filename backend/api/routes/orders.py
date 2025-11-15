from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.security import get_current_user
from models.database import Order, OrderItem, Medicine, User, OrderStatus
from api.schemas import OrderCreate, OrderResponse
from tasks.celery_app import process_order

router = APIRouter()


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Place a new order for medicines
    
    Args:
        order_data: Order details
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Created order details
    """
    # Calculate total amount
    total_amount = 0
    order_items_data = []
    
    for item in order_data.items:
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medicine {item.medicine_id} not found"
            )
        
        if medicine.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {medicine.name}. Available: {medicine.stock_quantity}"
            )
        
        subtotal = medicine.unit_price * item.quantity
        total_amount += subtotal
        
        order_items_data.append({
            "medicine_id": medicine.id,
            "quantity": item.quantity,
            "unit_price": medicine.unit_price,
            "subtotal": subtotal
        })
    
    # Create order
    new_order = Order(
        user_id=current_user.id,
        pharmacy_id=order_data.pharmacy_id,
        total_amount=total_amount,
        delivery_address=order_data.delivery_address,
        delivery_latitude=order_data.delivery_latitude,
        delivery_longitude=order_data.delivery_longitude,
        notes=order_data.notes,
        status=OrderStatus.PENDING
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    # Create order items
    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=new_order.id,
            **item_data
        )
        db.add(order_item)
    
    db.commit()
    db.refresh(new_order)
    
    # Queue background task for order processing
    try:
        process_order.delay(new_order.id)
    except Exception as e:
        # If Celery is not available, log error but don't fail the order
        import logging
        logging.error(f"Failed to queue order processing task: {e}")
    
    return new_order


@router.get("/", response_model=List[OrderResponse])
async def get_user_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all orders for current user
    
    Args:
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of user's orders
    """
    orders = db.query(Order).filter(Order.user_id == current_user.id).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get specific order details
    
    Args:
        order_id: Order ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Order details
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check ownership
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this order"
        )
    
    return order


@router.patch("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an order
    
    Args:
        order_id: Order ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated order details
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel this order"
        )
    
    if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status: {order.status}"
        )
    
    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    
    return order
