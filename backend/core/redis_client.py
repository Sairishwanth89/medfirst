import redis
import json
from typing import Optional, Dict, Any
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client for caching medicine stock and real-time data"""
    
    def __init__(self):
        """Initialize Redis connection"""
        try:
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                decode_responses=True
            )
            # Test connection
            self.client.ping()
            logger.info("Redis connection established successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.client = None
    
    def set_medicine_stock(self, medicine_id: int, stock_data: Dict[str, Any], expire: int = 3600):
        """
        Cache medicine stock information
        
        Args:
            medicine_id: ID of the medicine
            stock_data: Dictionary containing stock information
            expire: Expiration time in seconds (default: 1 hour)
        """
        if not self.client:
            return False
        
        try:
            key = f"medicine:stock:{medicine_id}"
            self.client.setex(key, expire, json.dumps(stock_data))
            logger.info(f"Cached stock data for medicine {medicine_id}")
            return True
        except Exception as e:
            logger.error(f"Error caching medicine stock: {e}")
            return False
    
    def get_medicine_stock(self, medicine_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached medicine stock information
        
        Args:
            medicine_id: ID of the medicine
            
        Returns:
            Dictionary with stock data or None if not found
        """
        if not self.client:
            return None
        
        try:
            key = f"medicine:stock:{medicine_id}"
            data = self.client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error retrieving medicine stock: {e}")
            return None
    
    def delete_medicine_stock(self, medicine_id: int):
        """Delete cached medicine stock"""
        if not self.client:
            return False
        
        try:
            key = f"medicine:stock:{medicine_id}"
            self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error deleting medicine stock: {e}")
            return False
    
    def set_pharmacy_medicines(self, pharmacy_id: int, medicines: list, expire: int = 1800):
        """
        Cache all medicines for a pharmacy
        
        Args:
            pharmacy_id: ID of the pharmacy
            medicines: List of medicine data
            expire: Expiration time in seconds (default: 30 minutes)
        """
        if not self.client:
            return False
        
        try:
            key = f"pharmacy:medicines:{pharmacy_id}"
            self.client.setex(key, expire, json.dumps(medicines))
            logger.info(f"Cached medicines for pharmacy {pharmacy_id}")
            return True
        except Exception as e:
            logger.error(f"Error caching pharmacy medicines: {e}")
            return False
    
    def get_pharmacy_medicines(self, pharmacy_id: int) -> Optional[list]:
        """Retrieve cached medicines for a pharmacy"""
        if not self.client:
            return None
        
        try:
            key = f"pharmacy:medicines:{pharmacy_id}"
            data = self.client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error retrieving pharmacy medicines: {e}")
            return None
    
    def publish_stock_update(self, channel: str, message: Dict[str, Any]):
        """
        Publish real-time stock update to Redis pub/sub
        
        Args:
            channel: Channel name (e.g., 'stock_updates')
            message: Message data to publish
        """
        if not self.client:
            return False
        
        try:
            self.client.publish(channel, json.dumps(message))
            logger.info(f"Published message to channel {channel}")
            return True
        except Exception as e:
            logger.error(f"Error publishing message: {e}")
            return False
    
    def subscribe_to_updates(self, channels: list):
        """
        Subscribe to real-time updates
        
        Args:
            channels: List of channel names to subscribe to
        """
        if not self.client:
            return None
        
        try:
            pubsub = self.client.pubsub()
            pubsub.subscribe(*channels)
            return pubsub
        except Exception as e:
            logger.error(f"Error subscribing to channels: {e}")
            return None


# Global Redis client instance
redis_client = RedisClient()
