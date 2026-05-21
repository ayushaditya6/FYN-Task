# Vehicle Service Management System (Veloce Care)

A premium, full-stack vehicle service, repair, and component management application featuring an executive analytics dashboard, a parts inventory registry, repair tickets management, and a checkout simulator.

---

## 🚀 Key Features

1. **Dashboard Analytics (Recharts)**
   - Top KPI metric badges for Lifetime Revenue, Active Service Queue, Resolved Jobs, and Average Ticket Sizes.
   - Interactive, responsive graphs visualizer displaying daily, monthly, and yearly cash flow trends.
2. **Component & Parts Registry**
   - Registry for vehicle components, with separated retail purchase prices vs custom rebuilding/servicing rates.
   - Smart badges showing % savings when selecting servicing over new component purchase.
3. **Repairs Tracking & Invoicing**
   - Full client vehicle database registry (Make, Model, Year, VIN, Owner).
   - Multi-issue ticket logs with interactive choices of parts (`NEW` vs `REPAIR` vs `NONE`).
   - Dynamic invoice calculation totaling issue fees, labor, and other operational surcharges in real-time.
   - Checkout payment simulator completing jobs with timestamped transactions.
4. **100% Statements Test Coverage**
   - Automated unit tests covering 100% of the Django models, custom pricing cascades, REST APIs, and analytics aggregates.

---

## 🛠️ Tech Stack

- **Backend:** Django (v4.2), Django REST Framework, CORS Headers.
- **Frontend:** React (v18), Vite, Vanilla HSL CSS variables system, Lucide Vector Icons, Recharts.
- **Database:** SQLite (Default ORM).
- **Testing:** Python `unittest` framework with `coverage` tracking.

---

## 📂 Project Architecture

```
FYN/
├── backend/                  # Django REST API Backend
│   ├── manage.py
│   ├── core/                 # Project configuration files
│   │   ├── settings.py       # Registered Apps, CORS, and settings
│   │   └── urls.py           # Root url mappings
│   ├── services/             # Core application
│   │   ├── models.py         # Component, Vehicle, RepairJob, Issue models
│   │   ├── serializers.py    # DRF JSON serializers
│   │   ├── views.py          # CRUD & Revenue analytics aggregation
│   │   ├── urls.py           # REST path routers
│   │   └── tests.py          # Exhaustive test suite (100% coverage target)
│   └── requirements.txt      # Python dependencies
└── frontend/                 # React.js Client Frontend
    ├── index.html
    ├── src/
    │   ├── main.jsx          # Vite standard React mount point
    │   ├── App.jsx           # Main routing & layout controller
    │   ├── App.css           # Premium glassmorphism dark theme framework
    │   ├── api.js            # Unified DRF API service consumer
    │   └── components/       # UI Modular Views
    │       ├── Navbar.jsx    # Fixed side navigation
    │       ├── Dashboard.jsx # Analytical charts using Recharts
    │       ├── Components.jsx# Part inventory manager
    │       └── Vehicles.jsx  # Repair contract details & checkout
    └── package.json          # Node dependencies
```

---

## 🔌 Quick Start & Installation

Ensure you have **Python 3.9+** and **Node 18+** installed.

### 1. Backend Setup (Django)

Open a new terminal window inside the `/backend` folder:
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate   # On Windows use: venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt

# Create and apply migrations
python manage.py makemigrations
python manage.py migrate

# Seed beautiful historic data for the dashboard (Highly Recommended)
python manage.py seed_data

# Start the REST API server (Runs on http://127.0.0.1:8000)
python manage.py runserver
```

### 2. Frontend Setup (React)

Open a second terminal window inside the `/frontend` folder:
```bash
cd frontend

# Install node dependencies
npm install

# Run the development server (Runs on http://localhost:5173)
npm run dev
```

---

## 🧪 Running Backend Unit Tests & Coverage

To execute the complete automated test suite and inspect statement coverage:

```bash
cd backend
source venv/bin/activate

# Execute tests with coverage tracing
coverage run --source=services manage.py test services

# View the statements coverage report
coverage report -m
```

You should see a clean report outputting **100% coverage** for all files within the `services/` application.
