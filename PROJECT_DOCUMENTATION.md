# Smart Task Manager — Project Overview

## What this project does
Smart Task Manager is a mobile-first task management application with an intelligent backend. It combines a React Native front-end app with a Flask backend that provides machine learning and reinforcement learning features to help users:

- Create and manage tasks (pending, completed, priority)
- Get AI-predicted task duration and priority
- Receive an automatically generated "smart schedule" (RL-powered) to place tasks when the user is most productive
- See productivity insights and habit summaries
- Retrain ML models from user data

## High-level architecture
- Frontend: React Native app located in `SmartTaskManager/`.
  - Main screens: Tasks, Calendar, Insights, Settings
  - Navigation: `navigation/AppNavigator.jsx` (tab + stack navigators)
  - Per-screen styles are organized in `screens/*/style.js`

- Backend: Flask server located in `SMT_server/`.
  - REST endpoints (examples below)
  - Uses SQLAlchemy (SQLite by default) for task persistence
  - Loads supervised ML models for time and priority prediction
  - Uses a TF-Agents reinforcement learning agent for schedule suggestions

- ML artifacts: pre-trained models in `SMT_server/ml_models/` (joblib files)
- Data: `SMT_server/generate_data.py` can populate synthetic/historical task data

## Important files and folders
- `SmartTaskManager/` — React Native mobile app
  - `App.js` — app root
  - `navigation/AppNavigator.jsx` — tab/stack navigation
  - `screens/` — screen components and `style.js` files
  - `assets/` — fonts and images
  - `__tests__/App.test.tsx` — a simple renderer test

- `SMT_server/` — Flask backend
  - `app.py` — main Flask application, endpoints, ML/RL initialization
  - `generate_data.py` — script to seed synthetic tasks
  - `ml_models/` — saved models (`time_predictor.joblib`, `priority_model.joblib`)
  - `requirements.txt` — Python dependencies (use virtualenv)

- `Dataset/` — optional external datasets used for experimentation

## Key API endpoints (examples)
- `GET /api/v1/tasks` — list tasks
- `POST /api/v1/tasks` — create a new task
- `PUT /api/v1/tasks/<id>/complete` — mark task completed (sends actual time)
- `GET /api/v1/insights` — returns AI-generated insights and weekly summaries
- `GET /api/v1/smart-schedule` — returns a suggested schedule for pending tasks
- `POST /api/v1/retrain` — retrains models and updates `user_profile.json`

(See `SMT_server/app.py` for the complete implementation and request/response shapes.)

## ML & RL
- Supervised models:
  - `time_predictor.joblib` — estimates task duration in minutes
  - `priority_model.joblib` — predicts priority/urgency from task text
- Reinforcement Learning:
  - TF-Agents environment (`CalendarEnv`) and DQN agent are used to learn good scheduling policies.
- The retrain endpoint aggregates user feedback (actual times) and updates the productivity profile saved in `SMT_server/user_profile.json`.

## How to run (development)
Prerequisites: Node.js, Yarn or npm, Python 3.8+, and the Python dependencies from `SMT_server/requirements.txt`.

1. Start backend (PowerShell):

```powershell
# create and activate venv (PowerShell)
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r SMT_server/requirements.txt
cd SMT_server
python app.py
```

2. Start frontend (PowerShell):

```powershell
cd SmartTaskManager
# install JS deps
npm install
# run Metro bundler and launch (example for Android)
npx react-native run-android
# or for iOS (macOS only): npx react-native run-ios
```

3. (Optional) Seed demo data:

```powershell
cd SMT_server
python generate_data.py
```

## Notes & developer tips
- The backend expects to find saved models under `SMT_server/ml_models/` and uses `user_profile.json` to store discovered productive time slots.
- When completing tasks, the frontend sends `actual_time_min` to the `complete` endpoint so the ML models can be retrained with real user feedback.
- For local development, replace `URL`/IP values in `SmartTaskManager/ip.js` with your machine's IP and ensure CORS is enabled on the Flask server.

## Where to look for enhancements
- Improve model training pipeline and tests under `SMT_server/`.
- Add documentation for API request/response schemas in `SMT_server/` (OpenAPI/Swagger).
- Consolidate theme tokens (colors, spacing) into `SmartTaskManager/styles/theme.js` (already in project).
- Add CI to run lints and unit tests.

---
