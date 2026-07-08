# FairWatch — Bias Drift Detection System

A full-stack web application that detects, visualises, and validates bias drift in AI-powered hiring pipelines.

## Project Structure

```
fairwatch/
├── backend/
│   ├── main.py                  # FastAPI app + all endpoints
│   ├── requirements.txt
│   ├── data/
│   │   └── FairWatch_Demo_1000.csv   ← place your dataset here
│   └── services/
│       └── metrics.py           # All fairness metric computations
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx              # Main app + navigation
        ├── api.js               # Axios API client
        ├── main.jsx
        ├── index.css
        ├── components/
        │   └── UI.jsx           # Shared components
        └── tabs/
            ├── CompanyMetrics.jsx
            ├── BiasDetection.jsx
            ├── FairnessValidation.jsx
            ├── ResumeExplorer.jsx
            └── InjectionLab.jsx
```

## Setup & Run

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Make sure FairWatch_Demo_1000.csv is in backend/data/

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at http://localhost:8000
API docs at http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will open at http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/overview | Summary metrics for Tab 1 |
| GET | /api/metrics/monthly | Monthly SPD, DI, BDS for charts |
| GET | /api/metrics/fairness | All 6 fairness metrics |
| GET | /api/metrics/heatmap | Intersectional hire rate heatmap |
| GET | /api/metrics/comparison | FairWatch vs baseline methods |
| GET | /api/thresholds | Company rules and feature weights |
| GET | /api/candidates?panel=hired|rejected|flagged | Resume explorer data |
| POST | /api/candidate/whatif | Live resume what-if prediction |
| POST | /api/inject | Inject bias into pipeline |
| POST | /api/reset | Reset to clean baseline |

## Features

- **Tab 1 — Company Metrics**: Model performance radar, monthly volume, selection rules, feature weights
- **Tab 2 — Bias Detection**: Real SPD/DI/BDS charts, statistical proof stack, alerts, recommendations
- **Tab 3 — Fairness Validation**: 6 scorecard metrics, confusion matrix, ROC curve, intersectional heatmap
- **Tab 4 — Resume Explorer**: Editable resumes, live SHAP updates, what-if gender/name/gap toggles
- **Tab 5 — Injection Lab**: Live bias injection, alert sequence, before/after chart, detection validation

## Dataset

Place `FairWatch_Demo_1000.csv` in `backend/data/`. The dataset should have these columns:
- Resume_ID, Name, Gender, Ethnicity, Age_Group, Skills
- Experience (Years), Education, Certifications, Job Role
- Salary Expectation ($), Projects Count, AI Score (0-100)
- Region, Timestamp, Month, Drift_Fraction
- AI_Score_Original, Recruiter_Decision_Original, Recruiter Decision, hired
