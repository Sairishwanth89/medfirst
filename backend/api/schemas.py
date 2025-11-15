#
# FILENAME: backend/api/schemas.py
#
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models.database import UserRole, OrderStatus


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.PATIENT


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# Medicine schemas
class MedicineBase(BaseModel):
    name: str
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    requires_prescription: bool = False
    unit_price: float


class MedicineCreate(MedicineBase):
    stock_quantity: int
    pharmacy_id: int


class MedicineUpdate(BaseModel):
    stock_quantity: Optional[int] = None
    unit_price: Optional[float] = None


class MedicineResponse(MedicineBase):
    id: int
    stock_quantity: int
    pharmacy_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Pharmacy schemas
class PharmacyBase(BaseModel):
    name: str
    address: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    is_24_hours: bool = False


class PharmacyCreate(PharmacyBase):
    pass


class PharmacyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    is_24_hours: Optional[bool] = None


class PharmacyResponse(PharmacyBase):
    id: int
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Order schemas
class OrderItemBase(BaseModel):
    medicine_id: int
    quantity: int


class OrderItemResponse(OrderItemBase):
    id: int
    unit_price: float
    subtotal: float
    
    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    pharmacy_id: int
    delivery_address: str
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    notes: Optional[str] = None
    items: List[OrderItemBase]


class OrderResponse(BaseModel):
    id: int
    user_id: int
    pharmacy_id: int
    status: OrderStatus
    total_amount: float
    delivery_address: str
    created_at: datetime
    updated_at: datetime
    order_items: List[OrderItemResponse]
    
    class Config:
        from_attributes = True


# Search schemas
class MedicineSearchQuery(BaseModel):
    query: str
    city: Optional[str] = None
    is_24_hours: Optional[bool] = None
    requires_prescription: Optional[bool] = None
    max_price: Optional[float] = None
    limit: int = 20


class MedicineSearchResult(BaseModel):
    medicine: MedicineResponse
    pharmacy: PharmacyResponse
    distance: Optional[float] = None

# --- NEW ANALYTICS SCHEMAS ---

class MostSoldMedicineResponse(BaseModel):
    medicine_id: int
    medicine_name: str
    total_sold: int
    
    class Config:
        from_attributes = True


class BusiestPharmacyResponse(BaseModel):
    pharmacy_id: int
    pharmacy_name: str
    total_orders: int
    
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus