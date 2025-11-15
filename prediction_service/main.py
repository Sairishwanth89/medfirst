#
# FILENAME: prediction_service/main.py
#
import joblib
import pandas as pd
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta

# --- Configuration ---
MODEL_DIR = "/app/model_data" # This is the shared Docker volume path
MODEL_PATH = f"{MODEL_DIR}/demand_model.joblib"
FEATURES_PATH = f"{MODEL_DIR}/model_features.joblib"

# --- Globals ---
app = FastAPI(
    title="Medicine Demand Prediction Service",
    version="1.0.0"
)
model = None
model_features = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Pydantic Schemas ---
class PredictionInput(BaseModel):
    medicine_id: int
    lag_1_day: float
    lag_7_days: float
    rolling_mean_7_days: float
    rolling_std_7_days: float

class PredictionOutput(BaseModel):
    medicine_id: int
    predicted_sales_next_day: float
    prediction_date: datetime

# --- Events ---
@app.on_event("startup")
def load_model():
    """
    Load the trained model and feature list from the shared volume
    on application startup.
    """
    global model, model_features
    try:
        model = joblib.load(MODEL_PATH)
        model_features = joblib.load(FEATURES_PATH)
        logger.info(f"Successfully loaded model and features from {MODEL_DIR}")
    except FileNotFoundError:
        logger.warning(
            "Model file not found. "
            "The service will run but /predict will fail. "
            "Run the training task to create the model."
        )
    except Exception as e:
        logger.error(f"Error loading model: {e}")

# --- Endpoints ---
@app.get("/")
def root():
    return {"service": "Demand Prediction Service", "model_loaded": model is not None}

@app.post("/predict", response_model=PredictionOutput)
def predict(input_data: PredictionInput):
    """
    Predict next-day sales for a given medicine based on recent data.
    """
    if model is None or model_features is None:
        raise HTTPException(
            status_code=503, # Service Unavailable
            detail="Model is not loaded. Run the training pipeline first."
        )
    
    try:
        # Create features for "tomorrow"
        tomorrow = datetime.utcnow() + timedelta(days=1)
        
        # Create a pandas DataFrame from the input
        data = {
            "medicine_id": input_data.medicine_id,
            "day_of_week": tomorrow.weekday(),
            "day_of_month": tomorrow.day,
            "month": tomorrow.month,
            "year": tomorrow.year,
            "lag_1_day": input_data.lag_1_day,
            "lag_7_days": input_data.lag_7_days,
            "rolling_mean_7_days": input_data.rolling_mean_7_days,
            "rolling_std_7_days": input_data.rolling_std_7_days
        }
        
        # Ensure correct feature order
        input_df = pd.DataFrame([data])[model_features]
        
        # Make prediction
        prediction = model.predict(input_df)
        
        # XGBoost returns an array, get the first item
        # Ensure it's a non-negative value
        predicted_sales = max(0, float(prediction[0]))
        
        return {
            "medicine_id": input_data.medicine_id,
            "predicted_sales_next_day": predicted_sales,
            "prediction_date": tomorrow.date()
        }
        
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")