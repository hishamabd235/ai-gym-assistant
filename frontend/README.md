# 🏋️ AI Gym & Fitness Assistant

An AI-powered fitness web application that provides:
- Personalized user profiles
- AI-based diet recommendations
- Real-time workout form analysis using MoveNet pose estimation

---

## 🚀 Features

### 👤 User Profile
- Store user details (age, height, weight)
- Fitness goals (muscle gain, weight loss, maintenance)
- Activity level selection

### 🥗 AI Diet Recommendation
- Calculates daily calorie needs using BMR & activity level
- Provides macro-nutrient breakdown (protein, carbs, fats)
- Generates a simple meal plan

### 🏋️ Workout Analysis (MoveNet)
- Uses Google MoveNet Lightning model
- Analyzes squat posture from uploaded image
- Calculates knee and hip angles
- Provides AI feedback and performance score

---

## 🧠 AI Models Used
- **MoveNet SinglePose Lightning** (TensorFlow Hub)

---

## 🛠️ Tech Stack

### Backend
- FastAPI
- TensorFlow
- TensorFlow Hub
- OpenCV
- NumPy

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS

---

## ▶️ How to Run

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
