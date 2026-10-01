import os
import logging
from typing import Tuple, Optional, Any
import numpy as np
import joblib
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error

logger = logging.getLogger(__name__)


# --- EVALUATION METRICS ---

def calculate_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Root Mean Squared Error (RMSE) across all predicted horizon steps.
    Penalizes large pricing deviations heavily.
    """
    mse = mean_squared_error(y_true.flatten(), y_pred.flatten())
    return float(np.sqrt(mse))


def calculate_directional_accuracy(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    base_price: np.ndarray,
) -> float:
    """
    Directional Accuracy: Measures the percentage of times the model correctly
    predicted the direction (Up vs Down) of the price movement relative to the
    last known trading day price.
    """
    # Reshape base_price to broadcast across the 7-day forecast horizon
    if base_price.ndim == 1:
        base_price = base_price[:, np.newaxis]
        
    actual_direction = (y_true > base_price).astype(int)
    predicted_direction = (y_pred > base_price).astype(int)
    
    matches = (actual_direction == predicted_direction)
    accuracy_percentage = float(np.mean(matches) * 100.0)
    return round(accuracy_percentage, 2)


# --- 1. BASELINE MODEL: LINEAR REGRESSION ---

class BaselineLinearRegressionModel:
    """
    Interpretable baseline model using multi-output Linear Regression over the
    flattened 60-day feature window to predict the 7-day horizon.
    """

    def __init__(self):
        self.model = LinearRegression()
        self.is_trained = False

    def _flatten_input(self, X: np.ndarray) -> np.ndarray:
        # X shape: (samples, lookback, features) -> (samples, lookback * features)
        return X.reshape(X.shape[0], -1)

    def fit(self, X: np.ndarray, y: np.ndarray) -> "BaselineLinearRegressionModel":
        X_flat = self._flatten_input(X)
        self.model.fit(X_flat, y)
        self.is_trained = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model has not been trained yet.")
        X_flat = self._flatten_input(X)
        return self.model.predict(X_flat)

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.model, filepath)
        logger.info(f"Saved Linear Regression baseline weights to {filepath}")

    def load(self, filepath: str) -> "BaselineLinearRegressionModel":
        self.model = joblib.load(filepath)
        self.is_trained = True
        logger.info(f"Loaded Linear Regression baseline weights from {filepath}")
        return self


# --- 2. PRIMARY MODEL: TENSORFLOW / KERAS LSTM ---

def build_lstm_model(
    lookback: int = 60,
    num_features: int = 5,
    horizon: int = 7,
    learning_rate: float = 0.001,
) -> Any:
    """
    Deep Recurrent Neural Network (LSTM) architecture specified in ML_Design.docx:
    - LSTM (50 units, return_sequences=True)
    - Dropout (0.2)
    - LSTM (50 units, return_sequences=False)
    - Dropout (0.2)
    - Dense (7 units) -> Outputs the 7-day forecasted prices
    """
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
    from tensorflow.keras.optimizers import Adam

    model = Sequential([
        Input(shape=(lookback, num_features)),
        LSTM(50, return_sequences=True),
        Dropout(0.2),
        LSTM(50, return_sequences=False),
        Dropout(0.2),
        Dense(horizon),
    ])

    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss="mse",
        metrics=["mae"],
    )
    return model
