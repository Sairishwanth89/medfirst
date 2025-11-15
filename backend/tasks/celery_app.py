from celery import Celery
from core.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    "medicine_system",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
)


@celery_app.task(name="tasks.process_order")
def process_order(order_id: int):
    """
    Background task to process order
    
    Args:
        order_id: Order ID to process
    """
    from core.database import SessionLocal
    from models.database import Order, OrderStatus, Medicine, OrderItem
    from core.redis_client import redis_client
    from core.elasticsearch_client import es_client
    
    logger.info(f"Processing order {order_id}")
    
    db = SessionLocal()
    try:
        # Get order
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            logger.error(f"Order {order_id} not found")
            return False
        
        # Update stock quantities
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        
        for item in order_items:
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            if medicine:
                # Decrease stock
                medicine.stock_quantity -= item.quantity
                
                # Update cache and search index
                redis_client.delete_medicine_stock(medicine.id)
                es_client.update_medicine(medicine.id, {
                    "stock_quantity": medicine.stock_quantity
                })
        
        # Update order status
        order.status = OrderStatus.CONFIRMED
        db.commit()
        
        logger.info(f"Order {order_id} processed successfully")
        
        # Publish notification (in a real system, this would send email/SMS)
        redis_client.publish_stock_update("order_notifications", {
            "order_id": order_id,
            "status": "confirmed",
            "user_id": order.user_id
        })
        
        return True
        
    except Exception as e:
        logger.error(f"Error processing order {order_id}: {e}")
        db.rollback()
        return False
    finally:
        db.close()


@celery_app.task(name="tasks.sync_stock_to_elasticsearch")
def sync_stock_to_elasticsearch():
    """
    Background task to sync all stock data to Elasticsearch
    """
    from core.database import SessionLocal
    from models.database import Medicine, Pharmacy
    
    logger.info("Starting stock sync to Elasticsearch")
    
    db = SessionLocal()
    try:
        medicines = db.query(Medicine).join(Pharmacy).all()
        
        for medicine in medicines:
            pharmacy = medicine.pharmacy
            medicine_data = {
                "id": medicine.id,
                "name": medicine.name,
                "generic_name": medicine.generic_name,
                "manufacturer": medicine.manufacturer,
                "description": medicine.description,
                "category": medicine.category,
                "requires_prescription": medicine.requires_prescription,
                "unit_price": medicine.unit_price,
                "stock_quantity": medicine.stock_quantity,
                "pharmacy_id": pharmacy.id,
                "pharmacy_name": pharmacy.name,
                "pharmacy_city": pharmacy.city.lower(),
                "is_24_hours": pharmacy.is_24_hours,
                "created_at": medicine.created_at.isoformat()
            }
            
            if pharmacy.latitude and pharmacy.longitude:
                medicine_data["pharmacy_location"] = {
                    "lat": pharmacy.latitude,
                    "lon": pharmacy.longitude
                }
            
            es_client.index_medicine(medicine_data)
        
        logger.info(f"Synced {len(medicines)} medicines to Elasticsearch")
        return True
        
    except Exception as e:
        logger.error(f"Error syncing stock to Elasticsearch: {e}")
        return False
    finally:
        db.close()


@celery_app.task(name="tasks.cleanup_expired_cache")
def cleanup_expired_cache():
    """
    Background task to cleanup expired cache entries
    """
    logger.info("Cleaning up expired cache entries")
    # Redis handles TTL automatically, but this can be used for custom cleanup
    return True
