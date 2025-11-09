import os
import pandas as pd
from datetime import datetime, timezone
import joblib

# --- Imports from our project ---
from app import app, db, Task
# Import the model components
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

# --- 1. Define the Model Pipeline ---
# This MUST be identical to the one in 'priority_model.py'
def create_priority_pipeline():
    numeric_features = ['time_until_due_hours', 'time_estimate_min']
    numeric_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    text_features = 'task_name'
    text_transformer = Pipeline(steps=[
        ('tfidf', TfidfVectorizer(stop_words='english'))
    ])
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('text', text_transformer, text_features)
        ])
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(random_state=42))
    ])
    return model_pipeline

# --- 2. Define our "Ground Truth" Logic ---
def assign_real_priority(row):
    """
    Creates a "smart" ground-truth label based on the task data.
    """
    if row['time_until_due_hours'] is None:
        return 'Low' # No deadline
    
    hours_to_due = row['time_until_due_hours']
    
    if hours_to_due <= 2:
        return 'Critical'
    if hours_to_due <= 48: # Due in 2 days
        return 'High'
    if hours_to_due > 168: # Due in over a week
        return 'Low'
    return 'Medium'

# --- 3. Main Retraining Function ---
def retrain_priority_model():
    print("Starting priority model retraining...")
    
    # This ensures we're working inside the Flask app context
    with app.app_context():
        # --- 4. Fetch all completed tasks ---
        print("Fetching data from tasks.db...")
        tasks = Task.query.filter(
            Task.status == 'completed',
            Task.actual_time_taken_min.isnot(None),
            Task.created_at.isnot(None)
        ).all()

        if not tasks or len(tasks) < 10:
            print(f"Not enough data to retrain. Found {len(tasks)}, need 10.")
            return

        # --- 5. Feature Engineering ---
        # --- 5. Feature Engineering ---
        data = []
        for t in tasks:
            # --- FIX: Set a default value (1 week) ---
            time_until_due_hours = 24 * 7 
            
            if t.due_date and t.created_at:
                # Ensure they are aware for subtraction
                created_at_aware = t.created_at.replace(tzinfo=timezone.utc)
                # Due date from DB might be naive, make it aware
                due_date_aware = t.due_date.replace(tzinfo=timezone.utc) 
                
                time_diff_seconds = (due_date_aware - created_at_aware).total_seconds()
                time_until_due_hours = max(0, time_diff_seconds / 3600)
            
            data.append({
                'task_name': t.task_name,
                'time_until_due_hours': time_until_due_hours, # <-- Now this is never NaN
                'time_estimate_min': t.actual_time_taken_min 
            })
            
        df = pd.DataFrame(data)
        
        # --- 6. Create Features (X) and Target (y) ---
        df['priority'] = df.apply(assign_real_priority, axis=1)
        
        X = df[['task_name', 'time_until_due_hours', 'time_estimate_min']]
        y = df['priority']
        
        print(f"New training data generated. {len(df)} samples.")
        print("New priority distribution:\n", y.value_counts())

        # --- 7. Create and Train the Model ---
        model_pipeline = create_priority_pipeline()
        print("Training new priority model...")
        model_pipeline.fit(X, y)
        print("Training complete.")

        # --- 8. Overwrite the old model file ---
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, 'ml_models', 'priority_model.joblib')
        
        joblib.dump(model_pipeline, model_path)
        print(f"Success! New model saved to {model_path}")

# --- 9. Run the function ---
if __name__ == "__main__":
    retrain_priority_model()