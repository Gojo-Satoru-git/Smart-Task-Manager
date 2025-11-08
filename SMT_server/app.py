import os
import re
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np # <-- NEW

# --- Flask & DB Imports ---
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# --- Supervised ML Imports ---
import spacy
import dateparser
import joblib

# --- NEW RL IMPORTS ---
import tensorflow as tf
from tf_agents.agents.dqn import dqn_agent
from tf_agents.networks import q_network
from tf_agents.environments import tf_py_environment, py_environment, utils
from tf_agents.specs import array_spec
from tf_agents.utils import common
from tf_agents.trajectories import trajectory
from tf_agents.replay_buffers import tf_uniform_replay_buffer
from tf_agents.trajectories import time_step as ts
# We don't need policy_saver anymore
# ------------------------

# --- Initialize App & DB---
app = Flask(__name__)
CORS(app)
base_dir = os.path.dirname(os.path.abspath(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(base_dir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- 1. Load ALL Supervised ML Models ---
print("Loading supervised models...")
nlp = spacy.load("en_core_web_sm")
time_model_path = os.path.join(base_dir, 'ml_models', 'time_predictor.joblib')
time_model = joblib.load(time_model_path)
print("Time prediction model loaded.")
priority_model_path = os.path.join(base_dir, 'ml_models', 'priority_model.joblib')
priority_model = joblib.load(priority_model_path)
print("Priority prediction model loaded.")


# --- 2. NEW RL: Define Agent & Environment ---
# We will create the agent when the server starts
rl_agent = None 
tf_env = None

# Define the Environment (The "World")
class CalendarEnv(py_environment.PyEnvironment):
    def __init__(self):
        self._observation_spec = array_spec.BoundedArraySpec(
            shape=(168,), dtype=np.int32, minimum=0, maximum=1, name='calendar'
        )
        self._action_spec = array_spec.BoundedArraySpec(
            shape=(), dtype=np.int32, minimum=0, maximum=167, name='choose_slot'
        )
        self._state = np.zeros(168, dtype=np.int32)
        self._episode_ended = False

    def action_spec(self): return self._action_spec
    def observation_spec(self): return self._observation_spec
    def _reset(self):
        self._state = np.zeros(168, dtype=np.int32)
        self._episode_ended = False
        return ts.restart(self._state)
    
    def _step(self, action):
        # This is just a placeholder, in a real app
        # the agent would be trained on real reward data
        if self._episode_ended: return self.reset()
        chosen_slot = action
        if self._state[chosen_slot] == 1: reward = -100
        else: reward = 10
        self._state[chosen_slot] = 1
        self._episode_ended = True
        return ts.termination(self._state, reward=reward)

# Define the function to create the agent
def create_agent():
    print("Setting up RL environment...")
    py_env = CalendarEnv()
    train_env = tf_py_environment.TFPyEnvironment(py_env)

    # Define the Neural Network
    q_net = q_network.QNetwork(
        train_env.observation_spec(),
        train_env.action_spec(),
        fc_layer_params=(128, 64)
    )
    # Define the Agent
    optimizer = tf.compat.v1.train.AdamOptimizer(learning_rate=1e-3)
    agent = dqn_agent.DqnAgent(
        train_env.time_step_spec(),
        train_env.action_spec(),
        q_network=q_net,
        optimizer=optimizer,
        td_errors_loss_fn=common.element_wise_huber_loss,
        train_step_counter=tf.Variable(0)
    )
    agent.initialize()
    print("RL Agent initialized successfully in memory.")
    return agent, train_env

# --- 3. Define the Task Database Model (No change) ---
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_name = db.Column(db.String(200), nullable=False)
    due_date = db.Column(db.DateTime, nullable=True)
    predicted_time_min = db.Column(db.Integer, nullable=True)
    predicted_priority = db.Column(db.String(50), nullable=True)
    
    scheduled_time = db.Column(db.DateTime, nullable=True, default=None) # <-- ADD THIS LINE

    status = db.Column(db.String(50), default='pending') # 'pending' or 'completed'
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)
    actual_time_taken_min = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'task_name': self.task_name,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'predicted_time_min': self.predicted_time_min,
            'predicted_priority': self.predicted_priority,
            
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None, # <-- ADD THIS LINE

            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

# --- 4. All Existing API Endpoints (No change) ---

# --- ML Parsing Endpoint ---
@app.route("/api/v1/parse-task", methods=["POST"])
def parse_task():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text_input = data["text"]
    doc = nlp(text_input)
    task_name = text_input
    parsed_due_date = None
    time_until_due_hours = 24 * 7
    
    for ent in doc.ents:
        if ent.label_ in ("DATE", "TIME", "DURATION"):
            parsed_due_date = dateparser.parse(ent.text)
            task_name = re.sub(re.escape(ent.text), '', task_name, flags=re.IGNORECASE)
            task_name = task_name.strip()
            if parsed_due_date:
                time_diff_seconds = (parsed_due_date - datetime.now()).total_seconds()
                time_until_due_hours = max(0, time_diff_seconds / 3600)
            break

    predicted_time_raw = time_model.predict([task_name])[0]
    predicted_time_min = int(round(predicted_time_raw / 5.0) * 5.0)
    
    priority_input_df = pd.DataFrame({
        'task_name': [task_name], 'time_until_due_hours': [time_until_due_hours],
        'predicted_time_min': [predicted_time_min]
    })
    predicted_priority = priority_model.predict(priority_input_df)[0]
    print(f"Model's guess: {predicted_priority} (due in {time_until_due_hours:.1f}h)")

    return jsonify({
        "task_name": task_name,
        "due_date": parsed_due_date.isoformat() if parsed_due_date else None,
        "predicted_time_min": predicted_time_min,
        "predicted_priority": predicted_priority
    })

# --- CREATE a new task ---
@app.route("/api/v1/tasks", methods=["POST"])
def create_task():
    data = request.get_json()
    due_date_obj = None
    if data.get('due_date'):
        try:
            due_date_str = data['due_date'].rstrip('Z')
            due_date_obj = datetime.fromisoformat(due_date_str)
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400

    new_task = Task(
        task_name=data['task_name'], due_date=due_date_obj,
        predicted_time_min=data.get('predicted_time_min'),
        predicted_priority=data.get('predicted_priority'), status='pending'
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

# --- GET tasks (pending AND recently completed) ---
@app.route("/api/v1/tasks", methods=["GET"])
def get_tasks():
    pending_tasks = Task.query.filter_by(status='pending').order_by(Task.due_date.asc()).all()
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    completed_tasks = Task.query.filter(
        Task.status == 'completed', Task.completed_at >= twenty_four_hours_ago
    ).order_by(Task.completed_at.desc()).all()
    
    return jsonify({
        'pending': [task.to_dict() for task in pending_tasks],
        'completed': [task.to_dict() for task in completed_tasks]
    })

# --- COMPLETE a task ---
@app.route("/api/v1/tasks/<int:task_id>/complete", methods=["PUT"])
def complete_task(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({"error": "Task not found"}), 404
    if task.status == 'completed': return jsonify({"error": "Task already completed"}), 400

    task.status = 'completed'
    task.completed_at = datetime.now(timezone.utc)
    
    created_at_aware = task.created_at.replace(tzinfo=timezone.utc)
    time_taken_seconds = (task.completed_at - created_at_aware).total_seconds()
    task.actual_time_taken_min = int(time_taken_seconds / 60)
    
    db.session.commit()
    print(f"Task {task.id} completed. Actual time: {task.actual_time_taken_min} min")
    return jsonify(task.to_dict())

# --- Productivity Insights Endpoint ---
# --- 6. Productivity Insights Endpoint (Upgraded) ---

# (Your 'generate_insight_string' helper function stays the same)
def generate_insight_string(center):
    day_map = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    hour_map = {(0, 5): "late at night", (5, 9): "early morning", (9, 12): "morning",
                (12, 17): "afternoon", (17, 21): "evening", (21, 24): "at night"}
    try:
        day_index = int(round(center[0])); day_index = max(0, min(day_index, 6))
        day = day_map[day_index]
        hour = int(round(center[1])); hour = max(0, min(hour, 23))
        time_of_day = "at night"
        for (start, end), description in hour_map.items():
            if start <= hour < end: time_of_day = description; break
        return f"Your primary habit seems to be on {day}s {time_of_day} (around {hour}:00)."
    except Exception as e:
        return "Could not generate insight."

@app.route("/api/v1/insights", methods=["GET"])
def get_insights():
    try:
        completed_tasks = Task.query.filter_by(status='completed').all()
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    if not completed_tasks or len(completed_tasks) < 3:
        return jsonify({
            "insight": "Not enough data yet. Complete more tasks to see your productivity insights!",
            "daily_summary": None # Send null for the chart
        })

    data = []
    for task in completed_tasks:
        if task.completed_at:
            completed_time = task.completed_at.astimezone(timezone.utc)
            data.append({
                'day_of_week': completed_time.weekday(), # Monday=0, Sunday=6
                'hour_of_day': completed_time.hour
            })
    
    if len(data) < 3:
         return jsonify({"insight": "Not enough data yet...", "daily_summary": None})

    df = pd.DataFrame(data)
    
    # --- 1. NEW: Aggregate data for the bar chart ---
    # Count occurrences of each day
    daily_counts = df['day_of_week'].value_counts().to_dict()
    # Create a 7-day list, initializing all counts to 0
    day_counts_list = [0] * 7
    for day, count in daily_counts.items():
        if 0 <= day <= 6:
            day_counts_list[day] = int(count) # Make sure it's a standard int
            
    # Create the chart object
    daily_summary_chart = {
        'labels': ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        'datasets': [{
            'data': day_counts_list
        }]
    }

    # --- 2. Run Clustering (Same as before) ---
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    df_scaled = scaler.fit_transform(df)
    kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
    df['cluster'] = kmeans.fit_predict(df_scaled)
    centers_scaled = kmeans.cluster_centers_
    centers_original = scaler.inverse_transform(centers_scaled)
    main_cluster_id = df['cluster'].mode()[0]
    main_center = centers_original[main_cluster_id]
    
    # --- 3. Generate Insight (Same as before) ---
    insight_text = generate_insight_string(main_center)

    # --- 4. NEW: Return both insight and chart data ---
    return jsonify({
        "insight": insight_text,
        "daily_summary": daily_summary_chart # Send the new chart object
    })

# --- Helper function for RL scheduler ---
def time_to_slot(dt, start_of_week):
    """Converts a datetime object into a 0-167 hour slot."""
    if not dt: return None
    # Ensure dt is offset-aware (UTC)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    # Calculate time difference in hours from the start of the week
    time_diff_hours = (dt - start_of_week).total_seconds() / 3600
    
    # We only care about this week (0-167)
    slot = int(round(time_diff_hours))
    if 0 <= slot < 168:
        return slot
    return None

# --- 5. NEW: Smart Schedule Endpoint (Stateful) ---
@app.route("/api/v1/smart-schedule", methods=["GET"])
def get_smart_schedule():
    global rl_agent, tf_env # Use the agent we created at launch

    # 1. Define the week's start (relative to today)
    today = datetime.now(timezone.utc)
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

    # 2. Get all pending tasks from DB
    pending_tasks = Task.query.filter_by(status='pending').all()
    if not pending_tasks:
        return jsonify([]) # Return an empty list if no tasks

    # 3. Create the calendar "world" and find tasks that need scheduling
    current_calendar_state = np.zeros(168, dtype=np.int32)
    already_scheduled_list = []
    tasks_to_schedule = []

    for task in pending_tasks:
        if task.scheduled_time:
            # This task is already scheduled. Add it to our calendar.
            slot = time_to_slot(task.scheduled_time, start_of_week)
            if slot is not None:
                current_calendar_state[slot] = 1 # Mark as full
                already_scheduled_list.append(task)
            else:
                # It's an old task from a past week, needs rescheduling
                tasks_to_schedule.append(task)
        else:
            # This task has no schedule, it needs one
            tasks_to_schedule.append(task)
    
    # 4. Loop through each *new* task and ask the agent where to put it
    newly_scheduled_list = []
    for task in tasks_to_schedule:
        # Get the agent's decision (our demo logic)
        empty_slots = np.where(current_calendar_state == 0)[0]
        
        # Use our "safe" UTC range (8am-3pm UTC, which is 1:30pm-8:30pm IST)
        reasonable_slots = [s for s in empty_slots if 8 <= (s % 24) <= 15]
        
        if not reasonable_slots:
            # No reasonable slots left, can't schedule this one
            continue 

        chosen_slot = np.random.choice(reasonable_slots)
        
        # 5. Mark this slot as "full" for the next loop
        current_calendar_state[int(chosen_slot)] = 1
        
        # 6. Convert slot (0-167) to a real date
        scheduled_time = start_of_week + timedelta(hours=int(chosen_slot))

        # 7. --- THIS IS THE KEY ---
        # Save the new schedule time to the database
        task.scheduled_time = scheduled_time
        newly_scheduled_list.append(task)
    
    # 8. Commit all the new scheduled times to the database
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error saving schedule: {e}")
        return jsonify({"error": "Failed to save schedule"}), 500
    
    # 9. Return the full, persistent schedule
    all_scheduled_tasks = already_scheduled_list + newly_scheduled_list
    return jsonify([task.to_dict() for task in all_scheduled_tasks])


# --- 6. Run the App ---
if __name__ == "__main__":
    with app.app_context():
        # Create DB tables
        db.create_all()
        
        # --- NEW: Create the RL agent on launch ---
        # This will run once and load the agent into memory
        rl_agent, tf_env = create_agent()
        
    print("--- Server is ready, starting... ---")
    app.run(debug=True, host='0.0.0.0', port=5000)