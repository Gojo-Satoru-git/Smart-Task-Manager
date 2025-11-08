import os
import random
import pandas as pd
from datetime import datetime, time, timedelta, timezone

# --- IMPORTANT ---
# This script MUST be in the same folder as app.py
# It imports your app, models, and DB structure
from app import (
    app, db, Task, 
    nlp, time_model, priority_model
)

# --- 1. Task Profiles (Based on your input) ---
# We'll use these as templates
TASK_PROFILES = [
    {'name': 'Do a Leetcode problem', 'time_min': 30, 'time_max': 60, 'freq': 'daily'},
    {'name': 'Do a Duolingo lesson', 'time_min': 25, 'time_max': 35, 'freq': 'daily'},
    {'name': 'Read ML algorithms', 'time_min': 50, 'time_max': 70, 'freq': 'occasional'},
    {'name': 'Submit AI lab record', 'time_min': 100, 'time_max': 140, 'freq': 'urgent'},
    {'name': 'Practice pyqt6', 'time_min': 50, 'time_max': 70, 'freq': 'occasional'},
    {'name': 'Workout OT problems', 'time_min': 80, 'time_max': 100, 'freq': 'urgent'},
    {'name': 'Call mom', 'time_min': 10, 'time_max': 15, 'freq': 'daily'},
    {'name': 'Buy eggs', 'time_min': 15, 'time_max': 25, 'freq': 'occasional'},
    {'name': 'Send money to mom', 'time_min': 3, 'time_max': 7, 'freq': 'urgent'},
    {'name': 'Heat Milk by evening', 'time_min': 5, 'time_max': 10, 'freq': 'daily_evening'},
    {'name': 'Feed puppy milk', 'time_min': 3, 'time_max': 7, 'freq': 'daily'},
    {'name': 'Join Leetcode contest', 'time_min': 90, 'time_max': 100, 'freq': 'contest_sat'},
    {'name': 'Join Leetcode contest', 'time_min': 90, 'time_max': 100, 'freq': 'contest_sun'},
    {'name': 'Get laundry', 'time_min': 25, 'time_max': 35, 'freq': 'urgent'},
]

# --- 2. Helper function to run our ML models ---
def get_ml_predictions(task_name, due_date, created_at):
    """
    Runs the ML models to get realistic predictions
    for our generated task.
    """
    # 1. Time Prediction Model
    predicted_time_raw = time_model.predict([task_name])[0]
    predicted_time_min = int(round(predicted_time_raw / 5.0) * 5.0)

    # 2. Priority Prediction Model
    if due_date:
        time_diff_seconds = (due_date - created_at).total_seconds()
        time_until_due_hours = max(0, time_diff_seconds / 3600)
    else:
        time_until_due_hours = 24 * 7 # 1 week
    
    priority_input_df = pd.DataFrame({
        'task_name': [task_name],
        'time_until_due_hours': [time_until_due_hours],
        'predicted_time_min': [predicted_time_min]
    })
    predicted_priority = priority_model.predict(priority_input_df)[0]
    
    return predicted_time_min, predicted_priority

# --- 3. Main Data Generation Function ---
def generate_data():
    print("Starting data generation...")
    
    # This ensures we're working inside the Flask app context
    with app.app_context():
        # --- 4. Clear old data ---
        print("Clearing old tasks...")
        db.session.query(Task).delete()
        db.session.commit()

        # --- 5. Generate historical "Completed" tasks ---
        print("Generating 30 days of historical 'completed' tasks...")
        
        now = datetime.now(timezone.utc)
        
        for days_ago in range(30, 0, -1): # Loop from 30 days ago up to yesterday
            # Get the date for this day
            day = now - timedelta(days=days_ago)
            
            for profile in TASK_PROFILES:
                # --- Decide if we should create this task ---
                create_task = False
                if profile['freq'] == 'daily':
                    create_task = True
                elif profile['freq'] == 'daily_evening' and random.random() < 0.8: # 80% chance
                    create_task = True
                elif profile['freq'] == 'occasional' and random.random() < 0.3: # 30% chance
                    create_task = True
                elif profile['freq'] == 'urgent' and random.random() < 0.1: # 10% chance
                    create_task = True
                elif profile['freq'] == 'contest_sat' and day.weekday() == 5: # 5 = Saturday
                    create_task = True
                elif profile['freq'] == 'contest_sun' and day.weekday() == 6: # 6 = Sunday
                    create_task = True

                if create_task:
                    # --- 6. Create realistic timestamps ---
                    
                    # Created at a random time on that day
                    rand_hour = random.randint(8, 20)
                    rand_minute = random.randint(0, 59)
                    created_at = day.replace(hour=rand_hour, minute=rand_minute, second=0, microsecond=0)
                    
                    # Calculate actual time taken
                    actual_time_taken = random.randint(profile['time_min'], profile['time_max'])
                    
                    # Completed 'actual_time_taken' minutes later
                    completed_at = created_at + timedelta(minutes=actual_time_taken)
                    
                    # Calculate a realistic due date
                    due_date = None
                    if 'daily' in profile['freq']:
                        due_date = created_at.replace(hour=23, minute=59)
                    elif 'urgent' in profile['freq']:
                        due_date = created_at + timedelta(days=1)
                    
                    # --- 7. Run ML Models ---
                    pred_time, pred_priority = get_ml_predictions(profile['name'], due_date, created_at)
                    
                    # Randomly add to "My Day"
                    my_day = created_at.date() if random.random() < 0.4 else None # 40% chance
                    
                    # --- 8. Create and Add Task to DB ---
                    task = Task(
                        task_name=profile['name'],
                        due_date=due_date,
                        predicted_time_min=pred_time,
                        predicted_priority=pred_priority,
                        status='completed',
                        created_at=created_at,
                        completed_at=completed_at,
                        actual_time_taken_min=actual_time_taken,
                        my_day_date=my_day
                    )
                    db.session.add(task)

        # --- 9. Generate "Pending" tasks for today ---
        print("Generating 'pending' tasks for today and tomorrow...")
        
        # Leetcode contest (Sunday 8am)
        contest_due = now.replace(hour=8, minute=0)
        pred_time, pred_prio = get_ml_predictions("Join Leetcode contest", contest_due, now)
        db.session.add(Task(
            task_name="Join Leetcode contest", due_date=contest_due,
            predicted_time_min=pred_time, predicted_priority=pred_prio,
            my_day_date=now.date() # Add to My Day
        ))

        # AI Lab Record (Due tomorrow)
        lab_due = (now + timedelta(days=1)).replace(hour=17, minute=0)
        pred_time, pred_prio = get_ml_predictions("Submit AI lab record", lab_due, now)
        db.session.add(Task(
            task_name="Submit AI lab record", due_date=lab_due,
            predicted_time_min=pred_time, predicted_priority=pred_prio
        ))
        
        # Get laundry (Due today)
        laundry_due = now.replace(hour=22, minute=0)
        pred_time, pred_prio = get_ml_predictions("Get laundry", laundry_due, now)
        db.session.add(Task(
            task_name="Get laundry", due_date=laundry_due,
            predicted_time_min=pred_time, predicted_priority=pred_prio,
            my_day_date=now.date() # Add to My Day
        ))
        
        # Call mom (Daily)
        call_due = now.replace(hour=23, minute=0)
        pred_time, pred_prio = get_ml_predictions("Call mom", call_due, now)
        db.session.add(Task(
            task_name="Call mom", due_date=call_due,
            predicted_time_min=pred_time, predicted_priority=pred_prio,
            my_day_date=now.date() # Add to My Day
        ))

        # --- 10. Commit all changes ---
        db.session.commit()
        print("---------------------------------")
        print("✅ Success! Database has been populated.")
        print("---------------------------------")


# --- 11. Run the function ---
if __name__ == "__main__":
    generate_data()