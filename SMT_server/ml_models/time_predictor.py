import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
import joblib # For saving the model
import os

# --- 1. Mock Training Data ---
# In a real app, this data would come from your user's task history.
data = {
    'task_name': [
        'Submit OS assignment', 'Finish project report', 'Call mom',
        'Write proposal', 'Debug the main feature', 'Team meeting',
        'Review documentation', 'Email Professor Smith', 'Grocery shopping',
        'Finalize presentation slides', 'Plan the new sprint'
    ],
    # Time in minutes
    'actual_time_min': [
        120, 180, 10, 90, 240, 60, 45, 15, 60, 75, 50
    ]
}
df = pd.DataFrame(data)

# --- 2. Define the Model Pipeline ---
# We'll create a "pipeline" that does two things:
# 1. TfidfVectorizer: Converts task names (text) into numbers (vectors).
# 2. RandomForestRegressor: A good "out-of-the-box" regression model.
model_pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english')),
    ('regressor', RandomForestRegressor(n_estimators=10, random_state=42))
])

# --- 3. Train the Model ---
print("Training the time prediction model...")
# We train the pipeline to predict 'actual_time_min' from 'task_name'
model_pipeline.fit(df['task_name'], df['actual_time_min'])
print("Model training complete.")

# --- 4. Save the Model ---
# Get the directory of the current script
base_dir = os.path.dirname(os.path.abspath(__file__))
# Define the path to save the model
model_path = os.path.join(base_dir, 'time_predictor.joblib')

joblib.dump(model_pipeline, model_path) 
print(f"Model saved to {model_path}")

# --- 5. Test the Model (optional) ---
test_tasks = ['Debug a new bug', 'Write an email', 'Work on the assignment']
predictions = model_pipeline.predict(test_tasks)
for task, time in zip(test_tasks, predictions):
    # Round the time to the nearest 5 minutes
    rounded_time = int(round(time / 5.0) * 5.0)
    print(f"Predicted time for '{task}': {rounded_time} min")