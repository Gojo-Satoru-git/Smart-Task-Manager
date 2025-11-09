import os
import re
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
import json 

# --- Flask & DB Imports ---
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# --- Supervised ML Imports ---
import spacy
import dateparser
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# --- RL Imports ---
import tensorflow as tf
from tf_agents.agents.dqn import dqn_agent
from tf_agents.networks import q_network
from tf_agents.environments import tf_py_environment, py_environment, utils
from tf_agents.specs import array_spec
from tf_agents.utils import common
from tf_agents.trajectories import trajectory
from tf_agents.replay_buffers import tf_uniform_replay_buffer
from tf_agents.trajectories import time_step as ts

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

# --- 2. RL: Define Agent & Environment ---
rl_agent = None 
tf_env = None

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
        if self._episode_ended: return self.reset()
        chosen_slot = action
        if self._state[chosen_slot] == 1: reward = -100
        else: reward = 10
        self._state[chosen_slot] = 1
        self._episode_ended = True
        return ts.termination(self._state, reward=reward)

def create_agent():
    print("Setting up RL environment...")
    py_env = CalendarEnv()
    train_env = tf_py_environment.TFPyEnvironment(py_env)
    q_net = q_network.QNetwork(
        train_env.observation_spec(),
        train_env.action_spec(),
        fc_layer_params=(128, 64)
    )
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

# --- Helper for fixing timezones ---
def to_utc_iso(dt):
    """Takes a naive datetime from the DB (assumed UTC) and makes it a proper UTC ISO string."""
    if not dt:
        return None
    dt_aware = dt.replace(tzinfo=timezone.utc)
    return dt_aware.isoformat()

# --- 3. Define the Task Database Model ---
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_name = db.Column(db.String(200), nullable=False)
    due_date = db.Column(db.DateTime, nullable=True)
    predicted_time_min = db.Column(db.Integer, nullable=True)
    predicted_priority = db.Column(db.String(50), nullable=True)
    my_day_date = db.Column(db.Date, nullable=True, default=None)
    scheduled_time = db.Column(db.DateTime, nullable=True, default=None) 
    status = db.Column(db.String(50), default='pending')
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
            'scheduled_time': to_utc_iso(self.scheduled_time),
            'my_day_date': self.my_day_date.isoformat() if self.my_day_date else None,
            'status': self.status,
            'created_at': to_utc_iso(self.created_at),
            'completed_at': to_utc_iso(self.completed_at)
        }

# --- 4. API Endpoints ---

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
    priority_input_df = pd.DataFrame({'task_name': [task_name], 'time_until_due_hours': [time_until_due_hours], 'predicted_time_min': [predicted_time_min]})
    predicted_priority = priority_model.predict(priority_input_df)[0]
    print(f"Model's guess: {predicted_priority} (due in {time_until_due_hours:.1f}h)")
    return jsonify({"task_name": task_name, "due_date": parsed_due_date.isoformat() if parsed_due_date else None, "predicted_time_min": predicted_time_min, "predicted_priority": predicted_priority})

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
    new_task = Task(task_name=data['task_name'], due_date=due_date_obj,
                    predicted_time_min=data.get('predicted_time_min'),
                    predicted_priority=data.get('predicted_priority'), status='pending')
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route("/api/v1/tasks", methods=["GET"])
def get_tasks():
    today = datetime.now().date()
    my_day_tasks = Task.query.filter_by(status='pending', my_day_date=today).order_by(Task.due_date.asc()).all()
    my_day_task_ids = {task.id for task in my_day_tasks}
    pending_tasks = Task.query.filter(Task.status == 'pending', Task.id.notin_(my_day_task_ids)).order_by(Task.due_date.asc()).all()
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    completed_tasks = Task.query.filter(Task.status == 'completed', Task.completed_at >= twenty_four_hours_ago).order_by(Task.completed_at.desc()).all()
    return jsonify({'my_day': [task.to_dict() for task in my_day_tasks], 'pending': [task.to_dict() for task in pending_tasks], 'completed': [task.to_dict() for task in completed_tasks]})

@app.route("/api/v1/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict())

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

@app.route("/api/v1/tasks/<int:task_id>/myday", methods=["POST"])
def toggle_my_day(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    today = datetime.now().date()
    if task.my_day_date == today:
        task.my_day_date = None
    else:
        task.my_day_date = today
    db.session.commit()
    return jsonify(task.to_dict())

@app.route("/api/v1/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    try:
        db.session.delete(task)
        db.session.commit()
        print(f"Task {task_id} deleted.")
        return jsonify({"message": "Task deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting task: {e}")
        return jsonify({"error": "Failed to delete task"}), 500

# --- Productivity Insights Endpoint ---
def generate_insight_string(center, count, priority_habit):
    day_map = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    hour_map = {(0, 5): "late at night", (5, 9): "early morning", (9, 12): "in the morning",
                (12, 17): "in the afternoon", (17, 21): "in the evening", (21, 24): "at night"}
    try:
        day_index = int(round(center[0])); day_index = max(0, min(day_index, 6))
        day = day_map[day_index]
        hour = int(round(center[1])); hour = max(0, min(hour, 23))
        time_of_day = "at night"
        for (start, end), description in hour_map.items():
            if start <= hour < end: time_of_day = description; break
        return f"Your primary habit is {time_of_day} on {day}s (around {hour}:00). You've completed {count} tasks in this time, mostly '{priority_habit}' priority."
    except Exception as e:
        print(f"Error generating insight: {e}")
        return "Could not generate insight."

@app.route("/api/v1/insights", methods=["GET"])
def get_insights():
    try:
        completed_tasks = Task.query.filter_by(status='completed').all()
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500
    if not completed_tasks or len(completed_tasks) < 3:
        return jsonify({"insight": "Not enough data yet...", "daily_summary": None})
    data = []
    for task in completed_tasks:
        if task.completed_at:
            completed_time = task.completed_at.astimezone(timezone.utc)
            data.append({'day_of_week': completed_time.weekday(), 'hour_of_day': completed_time.hour, 'priority': task.predicted_priority or 'Low'})
    if len(data) < 3:
         return jsonify({"insight": "Not enough data yet...", "daily_summary": None})
    df = pd.DataFrame(data)
    daily_counts = df['day_of_week'].value_counts().to_dict()
    day_counts_list = [0] * 7
    for day, count in daily_counts.items():
        if 0 <= day <= 6: day_counts_list[day] = int(count)
    daily_summary_chart = {'labels': ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], 'datasets': [{'data': day_counts_list}]}
    numeric_cols = ['day_of_week', 'hour_of_day']
    scaler = StandardScaler()
    df_scaled = scaler.fit_transform(df[numeric_cols])
    kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
    df['cluster'] = kmeans.fit_predict(df_scaled)
    centers_scaled = kmeans.cluster_centers_
    centers_original = scaler.inverse_transform(centers_scaled)
    main_cluster_id = df['cluster'].mode()[0]
    main_center = centers_original[main_cluster_id]
    cluster_df = df[df['cluster'] == main_cluster_id]
    task_count = len(cluster_df)
    priority_habit = "tasks"
    if not cluster_df.empty:
        priority_habit = cluster_df['priority'].mode().iloc[0]
    insight_text = generate_insight_string(main_center, task_count, priority_habit)
    return jsonify({"insight": insight_text, "daily_summary": daily_summary_chart})

# --- Helper function for RL scheduler ---
def time_to_slot(dt, start_of_week):
    """Converts a datetime object into a 0-167 hour slot."""
    if not dt: return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    time_diff_hours = (dt - start_of_week).total_seconds() / 3600
    slot = int(round(time_diff_hours))
    if 0 <= slot < 168:
        return slot
    return None

# --- 5. Smart Schedule Endpoint (UPGRADED) ---
@app.route("/api/v1/smart-schedule", methods=["GET"])
def get_smart_schedule():
    # --- 1. Load the User's Productivity Profile ---
    profile_path = os.path.join(base_dir, 'user_profile.json')
    productive_slots_deep = [] 
    productive_slots_shallow = []
    
    if os.path.exists(profile_path):
        try:
            with open(profile_path, 'r') as f:
                profile_data = json.load(f)
                # Load both deep and shallow work slots
                productive_slots_deep = profile_data.get('deep_work_slots', [])
                productive_slots_shallow = profile_data.get('shallow_work_slots', [])
        except Exception as e:
            print(f"Error loading user profile: {e}")
            
    # --- 2. Setup Calendar & Get Tasks ---
    today = datetime.now(timezone.utc)
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    
    current_slot = time_to_slot(today, start_of_week)
    if current_slot is None: current_slot = 0 

    pending_tasks = Task.query.filter_by(status='pending').all()
    if not pending_tasks:
        return jsonify([])
    
    current_calendar_state = np.zeros(168, dtype=np.int32)
    already_scheduled_list = []
    tasks_to_schedule = []

    for slot in range(current_slot):
        current_calendar_state[slot] = 1

    for task in pending_tasks:
        if task.scheduled_time:
            slot = time_to_slot(task.scheduled_time, start_of_week)
            if slot is not None and slot >= current_slot:
                current_calendar_state[slot] = 1
                already_scheduled_list.append(task)
            else:
                tasks_to_schedule.append(task)
        else:
            tasks_to_schedule.append(task)
    
    # --- 3. Loop and Schedule NEW tasks ---
    newly_scheduled_list = []
    for task in tasks_to_schedule:
        
        deadline_slot = time_to_slot(task.due_date, start_of_week)
        if deadline_slot is None:
            deadline_slot = 167 
        
        all_empty_slots = np.where(current_calendar_state == 0)[0]
        valid_empty_slots = [s for s in all_empty_slots if s <= deadline_slot]
        
        if not valid_empty_slots:
            continue 

        # --- 3c. NEW: Find BEST slots based on work type ---
        task_time = task.predicted_time_min or 30
        
        if task_time > 45: # Deep Work
            productive_slots = productive_slots_deep
        else: # Shallow Work
            productive_slots = productive_slots_shallow
            
        smart_slots = [s for s in productive_slots if s in valid_empty_slots]
        
        chosen_slot = None
        if smart_slots:
            chosen_slot = np.random.choice(smart_slots)
        else:
            # Fallback: No smart slots, pick a "reasonable" slot
            reasonable_slots = [s for s in valid_empty_slots if 11 <= (s % 24) <= 17] # 11am-5pm UTC
            if reasonable_slots:
                chosen_slot = np.random.choice(reasonable_slots)
            elif valid_empty_slots:
                chosen_slot = np.random.choice(valid_empty_slots)
        
        if chosen_slot is None:
            continue

        current_calendar_state[int(chosen_slot)] = 1
        scheduled_time = start_of_week + timedelta(hours=int(chosen_slot))
        task.scheduled_time = scheduled_time
        newly_scheduled_list.append(task)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error saving schedule: {e}")
        return jsonify({"error": "Failed to save schedule"}), 500
    
    all_scheduled_tasks = already_scheduled_list + newly_scheduled_list
    return jsonify([task.to_dict() for task in all_scheduled_tasks])


# --- 6. Model Retraining Endpoint (UPGRADED) ---
@app.route("/api/v1/retrain", methods=["POST"])
def retrain_models():
    global time_model # We need this to reload the model into memory
    
    print("Retraining process started...")
    
    try:
        tasks = Task.query.filter(
            Task.status == 'completed',
            Task.actual_time_taken_min.isnot(None)
        ).all()
    except Exception as e:
        print(f"DB Error: {e}")
        return jsonify({"error": "Could not access database."}), 500

    if not tasks or len(tasks) < 5: # Lowered requirement to 5
        print(f"Not enough data. Found {len(tasks)}, need 5.")
        return jsonify({
            "message": f"Not enough data. You need at least 5 completed tasks. You have {len(tasks)}."
        }), 400

    # === PART A: RETRAIN TIME PREDICTION MODEL ===
    data_time = []
    for t in tasks:
        data_time.append({
            'task_name': t.task_name,
            'actual_time_min': t.actual_time_taken_min
        })
    df_time = pd.DataFrame(data_time)
    print(f"Retraining time model with {len(df_time)} data points.")

    model_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english')),
        ('regressor', RandomForestRegressor(n_estimators=10, random_state=42))
    ])
    model_pipeline.fit(df_time['task_name'], df_time['actual_time_min'])
    joblib.dump(model_pipeline, time_model_path)
    time_model = model_pipeline 
    print("Time model retrained and reloaded.")
    
    # === PART B: RETRAIN "SMART SCHEDULER" (Clustering) ===
    print("Retraining productivity profile...")
    
    # Helper function to find top slots for a dataframe
    def get_top_slots(df, k=1):
        if df.empty or len(df) < k:
            return []
            
        numeric_cols = ['day_of_week', 'hour_of_day']
        scaler = StandardScaler()
        df_scaled = scaler.fit_transform(df[numeric_cols])
        
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(df_scaled)
        centers_original = scaler.inverse_transform(kmeans.cluster_centers_)
        
        top_slots = []
        for center in centers_original:
            day_of_week = int(round(center[0]))
            hour_of_day = int(round(center[1]))
            for i in range(-1, 2): # 3-hour window
                slot_hour = (hour_of_day + i) % 24
                slot = (day_of_week * 24) + slot_hour
                if slot not in top_slots:
                    top_slots.append(slot)
        return top_slots

    # 1. Prepare data, separating by work type
    data_deep = []
    data_shallow = []
    for t in tasks:
        if t.completed_at and t.actual_time_taken_min:
            completed_time = t.completed_at.astimezone(timezone.utc)
            record = {'day_of_week': completed_time.weekday(), 'hour_of_day': completed_time.hour}
            
            if t.actual_time_taken_min > 45:
                data_deep.append(record)
            else:
                data_shallow.append(record)
    
    df_deep = pd.DataFrame(data_deep)
    df_shallow = pd.DataFrame(data_shallow)
    
    # 2. Get top slots for each
    top_slots_deep = get_top_slots(df_deep, k=2) # Find 2 deep work habits
    top_slots_shallow = get_top_slots(df_shallow, k=1) # Find 1 shallow work habit
                
    # 3. Save this profile to a file
    profile_data = {
        'last_trained': datetime.now().isoformat(),
        'deep_work_slots': top_slots_deep,
        'shallow_work_slots': top_slots_shallow
    }
    profile_path = os.path.join(base_dir, 'user_profile.json')
    try:
        with open(profile_path, 'w') as f:
            json.dump(profile_data, f)
        print(f"Productivity profile saved. Deep slots: {top_slots_deep}, Shallow slots: {top_slots_shallow}")
    except Exception as e:
        print(f"Error saving user profile: {e}")
        return jsonify({"error": "Time model retrained, but failed to save productivity profile."}), 500

    return jsonify({
        "message": f"All models retrained successfully on {len(df_time)} tasks! I'm smarter now."
    })



# --- 7. Run the App ---
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        rl_agent, tf_env = create_agent()
        
    print("--- Server is ready, starting... ---")
    app.run(debug=True, host='0.0.0.0', port=5000)