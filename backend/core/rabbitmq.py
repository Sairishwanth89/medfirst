import pika
import json
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class RabbitMQClient:
    def __init__(self):
        self.connection = None
        self.channel = None

    def connect(self):
        if not self.connection or self.connection.is_closed:
            credentials = pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASS)
            parameters = pika.ConnectionParameters(
                host=settings.RABBITMQ_HOST,
                port=settings.RABBITMQ_PORT,
                credentials=credentials,
                heartbeat=600
            )
            try:
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                # Declare essential queues
                self.channel.queue_declare(queue='orders_queue', durable=True)
                self.channel.queue_declare(queue='training_queue', durable=True)
                logger.info("Connected to RabbitMQ")
            except Exception as e:
                logger.error(f"Failed to connect to RabbitMQ: {e}")

    def publish(self, queue_name: str, message: dict):
        self.connect()
        try:
            self.channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            logger.info(f"Message published to {queue_name}")
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")

    def close(self):
        if self.connection and not self.connection.is_closed:
            self.connection.close()

mq_client = RabbitMQClient()