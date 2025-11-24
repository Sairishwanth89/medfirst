#
# FILENAME: backend/seed_database.py
# (Place this new file inside your 'backend' folder)
#
import logging
import random
from datetime import datetime, timedelta
from core.database import SessionLocal, init_db
from models.database import User, Pharmacy, Medicine, Order, OrderItem, UserRole, OrderStatus
from core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
NUM_PHARMACIES = 5
NUM_MEDICINES_PER_PHARMACY = 10
NUM_PATIENTS = 20
NUM_DAYS_OF_ORDERS = 365 # Create 1 year of fake order data
MAX_ORDERS_PER_DAY = 15
# --- END CONFIGURATION ---

db = SessionLocal()

def clear_data():
    """Wipe all existing data."""
    logger.info("Deleting all existing data...")
    db.query(OrderItem).delete()
    db.query(Order).delete()
    db.query(Medicine).delete()
    db.query(Pharmacy).delete()
    db.query(User).delete()
    db.commit()

def create_users():
    """Create sample pharmacies and patients."""
    logger.info("Creating users...")
    users = []

    # Create Admin
    admin = User(
        email="admin@medifind.com",
        username="admin",
        hashed_password=get_password_hash("adminpass"),
        role=UserRole.ADMIN
    )
    users.append(admin)
    
    # Create Pharmacies
    for i in range(NUM_PHARMACIES):
        user = User(
            email=f"pharmacy{i}@example.com",
            username=f"pharmacy_owner_{i}",
            hashed_password=get_password_hash("pharmacypass"),
            role=UserRole.PHARMACY
        )
        users.append(user)

    # Create Patients
    for i in range(NUM_PATIENTS):
        user = User(
            email=f"patient{i}@example.com",
            username=f"patient_{i}",
            hashed_password=get_password_hash("patientpass"),
            role=UserRole.PATIENT
        )
        users.append(user)

    db.add_all(users)
    db.commit()
    return db.query(User).all()

def create_pharmacies_and_medicines(users):
    """Create pharmacies and stock them with medicines."""
    logger.info("Creating pharmacies and medicines...")
    
    pharmacy_users = [u for u in users if u.role == UserRole.PHARMACY]
    
    for i, user in enumerate(pharmacy_users):
        pharmacy = Pharmacy(
            name=f"City Pharmacy #{i+1}",
            address=f"{100 + i*5} Main St",
            city="Testville",
            is_24_hours=random.choice([True, False]),
            owner_id=user.id
        )
        db.add(pharmacy)
        db.commit()
        db.refresh(pharmacy)
        
        # Stock pharmacy with medicines
        for j in range(NUM_MEDICINES_PER_PHARMACY):
            med = Medicine(
                name=f"Medicine_Name_{j}",
                generic_name=f"Generic_{j}",
                unit_price=round(random.uniform(5.0, 50.0), 2),
                stock_quantity=random.randint(50, 200),
                pharmacy_id=pharmacy.id,
                requires_prescription=random.choice([True, False])
            )
            db.add(med)
    db.commit()

def create_historical_orders(users):
    """Create a year's worth of fake historical orders."""
    logger.info("Creating historical orders...")
    
    patient_users = [u for u in users if u.role == UserRole.PATIENT]
    medicines = db.query(Medicine).all()
    if not medicines:
        logger.error("No medicines found. Cannot create orders.")
        return

    today = datetime.utcnow()
    
    for day in range(NUM_DAYS_OF_ORDERS, 0, -1): # Loop from 1 year ago to today
        current_date = today - timedelta(days=day)
        
        num_orders_today = random.randint(0, MAX_ORDERS_PER_DAY)
        
        for _ in range(num_orders_today):
            patient = random.choice(patient_users)
            medicine = random.choice(medicines)
            pharmacy = medicine.pharmacy
            quantity = random.randint(1, 3)
            
            # Simulate seasonality: more sales in winter
            if current_date.month in [12, 1, 2]:
                 quantity += random.randint(0, 2)
            
            total = round(medicine.unit_price * quantity, 2)

            order = Order(
                user_id=patient.id,
                pharmacy_id=pharmacy.id,
                status=OrderStatus.DELIVERED, # Assume historical orders are done
                total_amount=total,
                delivery_address=f"{random.randint(1, 999)} Patient Ave",
                created_at=current_date,
                updated_at=current_date
            )
            db.add(order)
            db.commit()
            db.refresh(order)
            
            item = OrderItem(
                order_id=order.id,
                medicine_id=medicine.id,
                quantity=quantity,
                unit_price=medicine.unit_price,
                subtotal=total
            )
            db.add(item)
    
    db.commit()


def main():
    try:
        init_db()  # Ensure tables are created
        clear_data()
        all_users = create_users()
        create_pharmacies_and_medicines(all_users)
        create_historical_orders(all_users)
        logger.info("✅ Database seeding completed successfully!")
    except Exception as e:
        logger.error(f"Failed to seed database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()