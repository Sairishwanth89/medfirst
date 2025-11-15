from elasticsearch import Elasticsearch
from typing import List, Dict, Any, Optional
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class ElasticsearchClient:
    """Elasticsearch client for medicine search"""
    
    def __init__(self):
        """Initialize Elasticsearch connection"""
        try:
            self.client = Elasticsearch(
                [f"http://{settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}"],
                request_timeout=30
            )
            # Test connection
            if self.client.ping():
                logger.info("Elasticsearch connection established successfully")
            else:
                logger.warning("Elasticsearch connection failed")
                self.client = None
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {e}")
            self.client = None
    
    def create_index(self):
        """Create medicine index with mappings"""
        if not self.client:
            return False
        
        try:
            mapping = {
                "mappings": {
                    "properties": {
                        "id": {"type": "integer"},
                        "name": {"type": "text", "analyzer": "standard"},
                        "generic_name": {"type": "text", "analyzer": "standard"},
                        "manufacturer": {"type": "keyword"},
                        "description": {"type": "text"},
                        "category": {"type": "keyword"},
                        "requires_prescription": {"type": "boolean"},
                        "unit_price": {"type": "float"},
                        "stock_quantity": {"type": "integer"},
                        "pharmacy_id": {"type": "integer"},
                        "pharmacy_name": {"type": "text"},
                        "pharmacy_city": {"type": "keyword"},
                        "pharmacy_location": {"type": "geo_point"},
                        "is_24_hours": {"type": "boolean"},
                        "created_at": {"type": "date"}
                    }
                }
            }
            
            if not self.client.indices.exists(index=settings.ELASTICSEARCH_INDEX):
                self.client.indices.create(
                    index=settings.ELASTICSEARCH_INDEX,
                    body=mapping
                )
                logger.info(f"Created index: {settings.ELASTICSEARCH_INDEX}")
            return True
        except Exception as e:
            logger.error(f"Error creating index: {e}")
            return False
    
    def index_medicine(self, medicine_data: Dict[str, Any]):
        """
        Index a medicine document
        
        Args:
            medicine_data: Medicine data to index
        """
        if not self.client:
            return False
        
        try:
            self.client.index(
                index=settings.ELASTICSEARCH_INDEX,
                id=medicine_data.get("id"),
                body=medicine_data
            )
            logger.info(f"Indexed medicine {medicine_data.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Error indexing medicine: {e}")
            return False
    
    def search_medicines(
        self,
        query: str,
        city: Optional[str] = None,
        is_24_hours: Optional[bool] = None,
        requires_prescription: Optional[bool] = None,
        max_price: Optional[float] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search medicines with filters
        
        Args:
            query: Search query string
            city: Filter by city
            is_24_hours: Filter by 24-hour availability
            requires_prescription: Filter by prescription requirement
            max_price: Maximum price filter
            limit: Number of results to return
            
        Returns:
            List of matching medicine documents
        """
        if not self.client:
            return []
        
        try:
            # Build query
            must_conditions = [
                {
                    "multi_match": {
                        "query": query,
                        "fields": ["name^3", "generic_name^2", "description"],
                        "fuzziness": "AUTO"
                    }
                }
            ]
            
            filter_conditions = []
            
            if city:
                filter_conditions.append({"term": {"pharmacy_city": city.lower()}})
            
            if is_24_hours is not None:
                filter_conditions.append({"term": {"is_24_hours": is_24_hours}})
            
            if requires_prescription is not None:
                filter_conditions.append({"term": {"requires_prescription": requires_prescription}})
            
            if max_price is not None:
                filter_conditions.append({"range": {"unit_price": {"lte": max_price}}})
            
            # Add stock availability filter
            filter_conditions.append({"range": {"stock_quantity": {"gt": 0}}})
            
            search_body = {
                "query": {
                    "bool": {
                        "must": must_conditions,
                        "filter": filter_conditions
                    }
                },
                "size": limit,
                "sort": [
                    {"_score": {"order": "desc"}},
                    {"stock_quantity": {"order": "desc"}}
                ]
            }
            
            response = self.client.search(
                index=settings.ELASTICSEARCH_INDEX,
                body=search_body
            )
            
            results = [hit["_source"] for hit in response["hits"]["hits"]]
            logger.info(f"Found {len(results)} medicines for query: {query}")
            return results
            
        except Exception as e:
            logger.error(f"Error searching medicines: {e}")
            return []
    
    def delete_medicine(self, medicine_id: int):
        """Delete medicine from index"""
        if not self.client:
            return False
        
        try:
            self.client.delete(
                index=settings.ELASTICSEARCH_INDEX,
                id=medicine_id
            )
            logger.info(f"Deleted medicine {medicine_id} from index")
            return True
        except Exception as e:
            logger.error(f"Error deleting medicine: {e}")
            return False
    
    def update_medicine(self, medicine_id: int, update_data: Dict[str, Any]):
        """Update medicine in index"""
        if not self.client:
            return False
        
        try:
            self.client.update(
                index=settings.ELASTICSEARCH_INDEX,
                id=medicine_id,
                body={"doc": update_data}
            )
            logger.info(f"Updated medicine {medicine_id} in index")
            return True
        except Exception as e:
            logger.error(f"Error updating medicine: {e}")
            return False


# Global Elasticsearch client instance
es_client = ElasticsearchClient()
