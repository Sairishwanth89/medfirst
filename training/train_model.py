#
# FILENAME: training/train_model.py
#
import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import logging
from sqlalchemy import create_engine, text
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from datetime import datetime

# --- Configuration ---
# This assumes it can access the database, 
# for Docker, this will be the persistent volume.
DATABASE_URL = "sqlite:///./data/medicine_system.db"
# In production with docker-compose, this DB file needs to be
# on a shared volume, e.g., /app/data/medicine_system.db
# We'll set this up in docker-compose.yml later.

# Path to save the trained model
MODEL_DIR = "/app/model_data" # This path will be a shared Docker volume
MODEL_PATH = f"{MODEL_DIR}/demand_model.joblib"
FEATURES_PATH = f"{MODEL_DIR}/model_features.joblib"

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def connect_db():
    """Create a database engine."""
    # Adjust connect_args for SQLite
    connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    try:
        engine = create_engine(DATABASE_URL, connect_args=connect_args)
        return engine
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")
        return None

def fetch_data(engine):
    """Fetch all order and item data from the database."""
    logger.info("Fetching data from database...")
    query = text("""
        SELECT
            o.created_at,
            oi.medicine_id,
            oi.quantity
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status NOT IN ('cancelled');
    """)
    try:
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        
        if df.empty:
            logger.warning("No order data found.")
            return None
            
        df['created_at'] = pd.to_datetime(df['created_at'])
        return df
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        return None

def preprocess_data(df):
    """Aggregate data by day and medicine, and engineer features."""
    logger.info("Preprocessing data and engineering features...")
    # Aggregate data by day and medicine
    df_daily = df.set_index('created_at').groupby([
        pd.Grouper(freq='D'), 'medicine_id'
    ])['quantity'].sum().reset_index()
    
    # Create a full date range for each medicine to fill in missing days
    df_daily = df_daily.set_index('created_at')
    df_daily = df_daily.groupby('medicine_id').apply(
        lambda x: x.reindex(pd.date_range(
            start=df_daily.index.min(), 
            end=df_daily.index.max(), 
            freq='D'
        ))
    ).drop('medicine_id', axis=1)
    
    df_daily['medicine_id'] = df_daily.index.get_level_values('medicine_id')
    df_daily = df_daily.reset_index().rename(columns={'level_1': 'date'})
    df_daily['quantity'] = df_daily['quantity'].fillna(0)
    
    # --- Feature Engineering ---
    df_daily = df_daily.sort_values(by=['medicine_id', 'date'])
    
    # 1. Time features
    df_daily['day_of_week'] = df_daily['date'].dt.dayofweek
    df_daily['day_of_month'] = df_daily['date'].dt.day
    df_daily['month'] = df_daily['date'].dt.month
    df_daily['year'] = df_daily['date'].dt.year
    
    # 2. Lag features (sales from previous days)
    # Group by medicine so lags don't cross over
    g = df_daily.groupby('medicine_id')['quantity']
    df_daily['lag_1_day'] = g.shift(1)
    df_daily['lag_7_days'] = g.shift(7)
    
    # 3. Rolling window features
    df_daily['rolling_mean_7_days'] = g.shift(1).rolling(window=7).mean()
    df_daily['rolling_std_7_days'] = g.shift(1).rolling(window=7).std()
    
    # Our target variable
    df_daily['target_next_day_sales'] = g.shift(-1)
    
    # Clean up NaNs created by lags/windows/target shifting
    df_daily = df_daily.dropna(subset=[
        'target_next_day_sales', 'lag_1_day', 
        'lag_7_days', 'rolling_mean_7_days', 'rolling_std_7_days'
    ])
    
    return df_daily

def train_model(df):
    """Train an XGBoost model."""
    logger.info("Training XGBoost model...")
    
    # Define features (X) and target (y)
    features = [
        'medicine_id', 'day_of_week', 'day_of_month', 'month', 'year',
        'lag_1_day', 'lag_7_days', 'rolling_mean_7_days', 'rolling_std_7_days'
    ]
    target = 'target_next_day_sales'
    
    X = df[features]
    y = df[target]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )
    
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=1000,
        learning_rate=0.01,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        early_stopping_rounds=50
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Evaluate model
    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    logger.info(f"Model trained. Test RMSE: {rmse}")
    
    return model, features

def save_model(model, features):
    """Save the model and feature list to disk."""
    logger.info(f"Saving model to {MODEL_PATH}")
    
    # Ensure model directory exists
    import os
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    joblib.dump(model, MODEL_PATH)
    joblib.dump(features, FEATURES_PATH)
    logger.info("Model and features saved successfully.")

def main():
    engine = connect_db()
    if engine is None:
        return

    df = fetch_data(engine)
    if df is None or df.empty:
        logger.error("No data to train on. Exiting.")
        return

    df_processed = preprocess_data(df)
    if df_processed.empty:
        logger.error("Not enough data to create features. Exiting.")
        return
        
    model, features = train_model(df_processed)
    save_model(model, features)
    logger.info("Training pipeline completed.")

if __name__ == "__main__":
    main()