import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
import joblib
import os

# --- 1. Mock Training Data ---
# This data is "multi-featured"
# In a real app, you'd calculate 'time_until_due_hours' when the user completes a task.
data = {
    'task_name': [
        'Submit OS assignment', 'Finish project report', 'Call mom', 'Debug the main feature',
        'Grocery shopping', 'Submit OS assignment', 'Call mom', 'Email Professor Smith',
        'Plan the new sprint', 'Finish project report'
    ],
    'time_until_due_hours': [
        4, 24, 48, 8, 20, 168, 1, 72, 36, 1
    ],
    'predicted_time_min': [
        120, 180, 10, 240, 60, 120, 10, 15, 50, 180
    ],
    # This is our "y" variable (the target)
    'priority': [
        'High', 'High', 'Medium', 'High', 'Low', 'Low', 'High', 'Medium', 'Medium', 'Critical'
    ]
}
df = pd.DataFrame(data)

# Define our features (X) and target (y)
X = df[['task_name', 'time_until_due_hours', 'predicted_time_min']]
y = df['priority']

# --- 2. Define the Model Pipeline ---
# This pipeline is more complex because we have mixed data (text + numbers)

# Define numeric features
numeric_features = ['time_until_due_hours', 'predicted_time_min']
numeric_transformer = Pipeline(steps=[
    ('scaler', StandardScaler()) # Scale numeric features
])

# Define text features
text_features = 'task_name'
text_transformer = Pipeline(steps=[
    ('tfidf', TfidfVectorizer(stop_words='english')) # Vectorize text
])

# Use ColumnTransformer to apply different transformers to different columns
preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('text', text_transformer, text_features)
    ])

# Create the full pipeline with our classifier
model_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', RandomForestClassifier(random_state=42))
])

# --- 3. Train the Model ---
print("Training the priority prediction model...")
model_pipeline.fit(X, y)
print("Model training complete.")

# --- 4. Save the Model ---
base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, 'priority_model.joblib')
joblib.dump(model_pipeline, model_path)
print(f"Model saved to {model_path}")

# --- 5. Test the Model (optional) ---
test_data = pd.DataFrame({
    'task_name': ['Debug a new bug', 'Write an email', 'Work on the assignment'],
    'time_until_due_hours': [2, 72, 200], # 2 hours, 3 days, ~8 days
    'predicted_time_min': [120, 15, 90]
})
predictions = model_pipeline.predict(test_data)
for i, row in test_data.iterrows():
    print(f"Prediction for '{row['task_name']}' (due in {row['time_until_due_hours']}h): {predictions[i]}")