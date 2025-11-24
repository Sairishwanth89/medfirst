import pika
import json
import logging
import time
import subprocess
from core.config import settings
from core.database import SessionLocal
from models.database import Order, OrderStatus, Medicine, OrderItem
from core.redis_client import redis_client
from core.elasticsearch_client import es_client

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_order(ch, method, properties, body):
    """Callback to process order messages"""
    data = json.loads(body)
    order_id = data.get("order_id")
    logger.info(f"Received Task: Process Order #{order_id}")

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            logger.error(f"Order {order_id} not found")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Logic to update stock (simplified version of previous task)
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        for item in order_items:
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            if medicine:
                medicine.stock_quantity -= item.quantity
                # Update cache/index
                redis_client.delete_medicine_stock(medicine.id)
                es_client.update_medicine(medicine.id, {"stock_quantity": medicine.stock_quantity})

        order.status = OrderStatus.CONFIRMED
        db.commit()
        logger.info(f"Order #{order_id} CONFIRMED")
        
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        logger.error(f"Error processing order: {e}")
        db.rollback()
        # Negative ack (requeue)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    finally:
        db.close()

def train_model(ch, method, properties, body):
    """Callback to trigger ML training"""
    logger.info("Received Task: Retrain ML Model")
    try:
        subprocess.run(["python", "training/train_model.py"], check=True)
        logger.info("ML Training Completed")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        logger.error(f"ML Training Failed: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def main():
    logger.info("Starting Background Worker (RabbitMQ Consumer)...")
    
    # Connect to RabbitMQ
    credentials = pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASS)
    parameters = pika.ConnectionParameters(host=settings.RABBITMQ_HOST, credentials=credentials, heartbeat=600)
    
    # Retry loop for connection
    while True:
        try:
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            break
        except Exception as e:
            logger.warning(f"Waiting for RabbitMQ... ({e})")
            time.sleep(5)

    # Declare Queues
    channel.queue_declare(queue='orders_queue', durable=True)
    channel.queue_declare(queue='training_queue', durable=True)

    # Setup Consumers
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='orders_queue', on_message_callback=process_order)
    channel.basic_consume(queue='training_queue', on_message_callback=train_model)

    logger.info("Worker is running. Waiting for messages...")
    channel.start_consuming()

if __name__ == "__main__":
    main()