from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import cv2
import numpy as np
import mediapipe as mp
from datetime import datetime, timedelta
import random

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
MEDIAPIPE_AVAILABLE = True
try:
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
except Exception as e:
    print(f"MediaPipe initialization failed: {e}")
    MEDIAPIPE_AVAILABLE = False

# Models
class UserProfile(BaseModel):
    name: str
    age: int
    weight: float
    height: float
    goal: str
    activity_level: str
    gender: str
    diet_type: str = "regular"

class DietRecommendation(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fats_g: int
    meals: list

# Storage
user_profile = {
    "name": "User",
    "age": 25,
    "weight": 70.0,
    "height": 175.0,
    "goal": "muscle_gain",
    "activity_level": "moderate",
    "gender": "male",
    "diet_type": "regular"
}

workout_history = {
    "sessions": [],
    "stats": {}
}

body_measurements = []
active_challenges = []

# Helper functions
def get_landmark_coords(landmarks, landmark_name):
    landmark_idx = mp_pose.PoseLandmark[landmark_name].value
    landmark = landmarks[landmark_idx]
    return [landmark.x, landmark.y, landmark.z]

def get_landmark_visibility(landmarks, landmark_name):
    landmark_idx = mp_pose.PoseLandmark[landmark_name].value
    return landmarks[landmark_idx].visibility

def calculate_angle(a, b, c):
    a = np.array(a[:2])
    b = np.array(b[:2])
    c = np.array(c[:2])
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    
    if angle > 180.0:
        angle = 360-angle
        
    return angle

def detect_pose_mediapipe(image):
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)
    
    if results.pose_landmarks:
        return results.pose_landmarks.landmark
    return None

def detect_exercise(landmarks):
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    left_hip = get_landmark_coords(landmarks, 'LEFT_HIP')
    left_knee = get_landmark_coords(landmarks, 'LEFT_KNEE')
    left_ankle = get_landmark_coords(landmarks, 'LEFT_ANKLE')
    left_elbow = get_landmark_coords(landmarks, 'LEFT_ELBOW')
    left_wrist = get_landmark_coords(landmarks, 'LEFT_WRIST')
    
    vertical_dist = abs(left_shoulder[1] - left_hip[1])
    knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
    elbow_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
    shoulder_height = left_shoulder[1]
    hip_height = left_hip[1]
    wrist_height = left_wrist[1]
    arm_raised = wrist_height < shoulder_height
    is_standing = vertical_dist > 0.25
    
    if is_standing and wrist_height < 0.3 and elbow_angle < 160:
        return "shoulder_press"
    elif is_standing and arm_raised and 40 < elbow_angle < 140 and wrist_height > 0.2:
        return "bicep_curl"
    elif is_standing and hip_height > 0.5 and knee_angle > 140:
        hip_angle = calculate_angle(left_shoulder, left_hip, left_knee)
        if hip_angle < 140:
            return "deadlift"
    elif is_standing and 60 < knee_angle < 120:
        return "lunge"
    elif is_standing:
        return "squat"
    elif vertical_dist < 0.2 and shoulder_height < 0.6:
        return "pushup"
    elif vertical_dist < 0.2 and knee_angle > 160:
        return "plank"
    else:
        return "squat"

def analyze_squat(landmarks):
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    left_hip = get_landmark_coords(landmarks, 'LEFT_HIP')
    left_knee = get_landmark_coords(landmarks, 'LEFT_KNEE')
    left_ankle = get_landmark_coords(landmarks, 'LEFT_ANKLE')
    
    knee_vis = get_landmark_visibility(landmarks, 'LEFT_KNEE')
    hip_vis = get_landmark_visibility(landmarks, 'LEFT_HIP')
    
    if min(knee_vis, hip_vis) < 0.5:
        return {
            "score": 50,
            "feedback": ["⚠️ Low detection - stand sideways to camera"],
            "knee_angle": 0,
            "hip_angle": 0,
            "rep_state": "unknown",
            "in_position": False
        }
    
    knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
    hip_angle = calculate_angle(left_shoulder, left_hip, left_knee)
    
    feedback = []
    score = 100
    
    # MORE SENSITIVE THRESHOLDS for better rep counting
    if knee_angle < 140:  # Changed from 130 - more sensitive
        rep_state = "down"
        print(f"  💪 SQUAT DOWN - Knee: {knee_angle:.1f}° (< 140°)")
    else:
        rep_state = "up"
        print(f"  🔵 SQUAT UP - Knee: {knee_angle:.1f}° (>= 140°)")
    
    in_position = min(knee_vis, hip_vis) > 0.6
    
    if knee_angle < 70:
        feedback.append("⚠️ Too deep - may cause injury")
        score -= 20
    elif 70 <= knee_angle < 100:
        feedback.append("✅ Excellent depth!")
    elif 100 <= knee_angle <= 140:
        feedback.append("✅ Good squat depth")
        score -= 5
    elif knee_angle > 160:
        feedback.append("🔵 Standing position")
        score = 90
    else:
        feedback.append("💡 Go deeper")
        score -= 15
    
    if hip_angle > 90:
        feedback.append("✅ Great posture!")
    else:
        feedback.append("⚠️ Keep chest up")
        score -= 10
    
    return {
        "knee_angle": float(round(knee_angle, 2)),
        "hip_angle": float(round(hip_angle, 2)),
        "score": int(max(0, score)),
        "feedback": feedback,
        "rep_state": rep_state,
        "in_position": in_position
    }

def analyze_pushup(landmarks):
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    left_elbow = get_landmark_coords(landmarks, 'LEFT_ELBOW')
    left_wrist = get_landmark_coords(landmarks, 'LEFT_WRIST')
    left_hip = get_landmark_coords(landmarks, 'LEFT_HIP')
    left_ankle = get_landmark_coords(landmarks, 'LEFT_ANKLE')
    
    elbow_vis = get_landmark_visibility(landmarks, 'LEFT_ELBOW')
    
    if elbow_vis < 0.5:
        return {
            "score": 50,
            "feedback": ["⚠️ Low detection"],
            "elbow_angle": 0,
            "body_alignment": 0,
            "rep_state": "unknown",
            "in_position": False
        }
    
    elbow_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
    body_alignment = calculate_angle(left_shoulder, left_hip, left_ankle)
    
    feedback = []
    score = 100
    
    # MORE SENSITIVE THRESHOLDS
    if elbow_angle < 150:  # Changed from 140 - more sensitive
        rep_state = "down"
        print(f"  💪 PUSHUP DOWN - Elbow: {elbow_angle:.1f}° (< 150°)")
    else:
        rep_state = "up"
        print(f"  🔵 PUSHUP UP - Elbow: {elbow_angle:.1f}° (>= 150°)")
    
    in_position = elbow_vis > 0.6
    
    if 70 <= elbow_angle <= 90:
        feedback.append("✅ Perfect depth!")
    elif elbow_angle > 160:
        feedback.append("🔵 Up position")
        score = 85
    else:
        feedback.append("💡 Adjust depth")
        score -= 10
    
    if 160 <= body_alignment <= 180:
        feedback.append("✅ Great alignment!")
    else:
        feedback.append("⚠️ Keep body straight")
        score -= 15
    
    return {
        "elbow_angle": float(round(elbow_angle, 2)),
        "body_alignment": float(round(body_alignment, 2)),
        "score": int(max(0, score)),
        "feedback": feedback,
        "rep_state": rep_state,
        "in_position": in_position
    }

def analyze_plank(landmarks):
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    left_hip = get_landmark_coords(landmarks, 'LEFT_HIP')
    left_ankle = get_landmark_coords(landmarks, 'LEFT_ANKLE')
    
    hip_vis = get_landmark_visibility(landmarks, 'LEFT_HIP')
    
    if hip_vis < 0.5:
        return {
            "score": 50,
            "feedback": ["⚠️ Low detection"],
            "body_angle": 0,
            "in_position": False,
            "rep_state": "hold"
        }
    
    body_angle = calculate_angle(left_shoulder, left_hip, left_ankle)
    
    feedback = []
    score = 100
    in_position = hip_vis > 0.6
    
    if 165 <= body_angle <= 180:
        feedback.append("✅ Perfect plank!")
    else:
        feedback.append("⚠️ Engage core")
        score -= 25
    
    return {
        "body_angle": float(round(body_angle, 2)),
        "score": int(max(0, score)),
        "feedback": feedback,
        "in_position": in_position,
        "rep_state": "hold"
    }

def analyze_lunge(landmarks):
    left_hip = get_landmark_coords(landmarks, 'LEFT_HIP')
    left_knee = get_landmark_coords(landmarks, 'LEFT_KNEE')
    left_ankle = get_landmark_coords(landmarks, 'LEFT_ANKLE')
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    
    knee_vis = get_landmark_visibility(landmarks, 'LEFT_KNEE')
    
    if knee_vis < 0.5:
        return {
            "score": 50,
            "feedback": ["⚠️ Low detection"],
            "knee_angle": 0,
            "rep_state": "unknown",
            "in_position": False
        }
    
    knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
    hip_angle = calculate_angle(left_shoulder, left_hip, left_knee)
    
    feedback = []
    score = 100
    
    if knee_angle < 110:
        rep_state = "down"
    else:
        rep_state = "up"
    
    in_position = knee_vis > 0.6
    
    if 70 <= knee_angle < 100:
        feedback.append("✅ Excellent depth!")
    elif knee_angle > 150:
        feedback.append("🔵 Standing")
        score = 90
    else:
        feedback.append("💡 Go deeper")
        score -= 15
    
    return {
        "knee_angle": float(round(knee_angle, 2)),
        "hip_angle": float(round(hip_angle, 2)),
        "score": int(max(0, score)),
        "feedback": feedback,
        "rep_state": rep_state,
        "in_position": in_position
    }

def analyze_bicep_curl(landmarks):
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    left_elbow = get_landmark_coords(landmarks, 'LEFT_ELBOW')
    left_wrist = get_landmark_coords(landmarks, 'LEFT_WRIST')
    
    elbow_vis = get_landmark_visibility(landmarks, 'LEFT_ELBOW')
    
    if elbow_vis < 0.5:
        return {
            "score": 50,
            "feedback": ["⚠️ Low detection"],
            "elbow_angle": 0,
            "rep_state": "unknown",
            "in_position": False
        }
    
    elbow_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
    
    feedback = []
    score = 100
    
    if elbow_angle < 100:
        rep_state = "up"
    else:
        rep_state = "down"
    
    in_position = elbow_vis > 0.6
    
    if 40 <= elbow_angle < 80:
        feedback.append("✅ Full contraction!")
    elif elbow_angle > 160:
        feedback.append("🔵 Extended")
        score = 90
    else:
        feedback.append("💡 Curl higher")
        score -= 10
    
    return {
        "elbow_angle": float(round(elbow_angle, 2)),
        "score": int(max(0, score)),
        "feedback": feedback,
        "rep_state": rep_state,
        "in_position": in_position
    }

def analyze_shoulder_press(landmarks):
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    left_elbow = get_landmark_coords(landmarks, 'LEFT_ELBOW')
    left_wrist = get_landmark_coords(landmarks, 'LEFT_WRIST')
    
    elbow_vis = get_landmark_visibility(landmarks, 'LEFT_ELBOW')
    
    if elbow_vis < 0.5:
        return {
            "score": 50,
            "feedback": ["⚠️ Low detection"],
            "elbow_angle": 0,
            "rep_state": "unknown",
            "in_position": False
        }
    
    elbow_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
    
    feedback = []
    score = 100
    
    if elbow_angle > 160:
        rep_state = "up"
    else:
        rep_state = "down"
    
    in_position = elbow_vis > 0.6
    
    if elbow_angle > 170:
        feedback.append("✅ Full extension!")
    elif elbow_angle < 100:
        feedback.append("🔵 Lowered")
        score = 90
    else:
        feedback.append("💡 Press higher")
        score -= 10
    
    return {
        "elbow_angle": float(round(elbow_angle, 2)),
        "score": int(max(0, score)),
        "feedback": feedback,
        "rep_state": rep_state,
        "in_position": in_position
    }

def analyze_deadlift(landmarks):
    left_shoulder = get_landmark_coords(landmarks, 'LEFT_SHOULDER')
    left_hip = get_landmark_coords(landmarks, 'LEFT_HIP')
    left_knee = get_landmark_coords(landmarks, 'LEFT_KNEE')
    left_ankle = get_landmark_coords(landmarks, 'LEFT_ANKLE')
    
    hip_vis = get_landmark_visibility(landmarks, 'LEFT_HIP')
    
    if hip_vis < 0.5:
        return {
            "score": 50,
            "feedback": ["⚠️ Low detection"],
            "hip_angle": 0,
            "rep_state": "unknown",
            "in_position": False
        }
    
    hip_angle = calculate_angle(left_shoulder, left_hip, left_knee)
    knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
    
    feedback = []
    score = 100
    
    if hip_angle < 130:
        rep_state = "down"
    else:
        rep_state = "up"
    
    in_position = hip_vis > 0.6
    
    if 80 <= hip_angle < 120:
        feedback.append("✅ Good hip hinge!")
    elif hip_angle > 160:
        feedback.append("🔵 Standing")
        score = 90
    else:
        feedback.append("💡 Adjust form")
        score -= 10
    
    return {
        "hip_angle": float(round(hip_angle, 2)),
        "knee_angle": float(round(knee_angle, 2)),
        "score": int(max(0, score)),
        "feedback": feedback,
        "rep_state": rep_state,
        "in_position": in_position
    }

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "FitNex AI Gym Assistant API"}

@app.get("/profile")
def get_profile():
    weight = float(user_profile["weight"])
    height = float(user_profile["height"]) / 100
    bmi = weight / (height * height)
    
    if bmi < 18.5:
        category = "Underweight"
        status = "warning"
        advice = "Consider gaining weight through healthy diet"
    elif 18.5 <= bmi < 25:
        category = "Normal"
        status = "healthy"
        advice = "Great! Maintain your current weight"
    elif 25 <= bmi < 30:
        category = "Overweight"
        status = "warning"
        advice = "Consider losing weight through diet and exercise"
    else:
        category = "Obese"
        status = "danger"
        advice = "Consult a doctor for weight loss guidance"
    
    return {
        **user_profile,
        "bmi": round(bmi, 1),
        "bmi_category": category,
        "bmi_status": status,
        "bmi_advice": advice
    }

@app.post("/profile")
def update_profile(profile: UserProfile):
    user_profile.update(profile.dict())
    return {"status": "success", "profile": user_profile}

@app.post("/diet/recommend", response_model=DietRecommendation)
def recommend_diet():
    weight = float(user_profile["weight"])
    height = float(user_profile["height"])
    age = int(user_profile["age"])
    gender = user_profile["gender"]
    goal = user_profile["goal"]
    activity = user_profile["activity_level"]
    diet_type = user_profile.get("diet_type", "regular")
    
    if gender == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    
    activity_multipliers = {"sedentary": 1.2, "moderate": 1.55, "active": 1.725, "very_active": 1.9}
    tdee = bmr * activity_multipliers.get(activity, 1.55)
    
    if goal == "weight_loss":
        calories = int(tdee - 500)
        protein_ratio, carbs_ratio, fats_ratio = 0.40, 0.30, 0.30
        
        if diet_type == "vegan":
            meals = [
                "🌅 Breakfast: Tofu scramble with spinach",
                "☕ Snack: Almond yogurt with berries",
                "🍽️ Lunch: Chickpea quinoa bowl",
                "🥤 Pre-Workout: Plant protein shake",
                "🍗 Dinner: Baked tempeh with vegetables",
                "🌙 Evening: Hummus with cucumber"
            ]
        elif diet_type == "vegetarian":
            meals = [
                "🌅 Breakfast: Scrambled eggs with toast",
                "☕ Snack: Greek yogurt with berries",
                "🍽️ Lunch: Paneer tikka with quinoa",
                "🥤 Pre-Workout: Whey protein shake",
                "🍗 Dinner: Grilled halloumi with veggies",
                "🌙 Evening: Cottage cheese"
            ]
        else:
            meals = [
                "🌅 Breakfast: Scrambled eggs with toast",
                "☕ Snack: Greek yogurt",
                "🍽️ Lunch: Grilled chicken with quinoa",
                "🥤 Pre-Workout: Protein shake",
                "🍗 Dinner: Baked salmon with veggies",
                "🌙 Evening: Cottage cheese"
            ]
    elif goal == "muscle_gain":
        calories = int(tdee + 300)
        protein_ratio, carbs_ratio, fats_ratio = 0.30, 0.45, 0.25
        
        if diet_type == "vegan":
            meals = [
                "🌅 Breakfast: Oatmeal with pea protein",
                "☕ Snack: Bagel with almond butter",
                "🍽️ Lunch: Brown rice with black beans",
                "💪 Pre-Workout: Rice cakes with PB",
                "🏋️ Post-Workout: Pea protein shake",
                "🍗 Dinner: Seitan stir-fry",
                "🌙 Evening: Soy yogurt with granola"
            ]
        elif diet_type == "vegetarian":
            meals = [
                "🌅 Breakfast: Oatmeal with whey protein",
                "☕ Snack: Bagel with cream cheese",
                "🍽️ Lunch: Brown rice with paneer",
                "💪 Pre-Workout: Rice cakes",
                "🏋️ Post-Workout: Whey shake",
                "🍗 Dinner: Lentil curry",
                "🌙 Evening: Greek yogurt"
            ]
        else:
            meals = [
                "🌅 Breakfast: Oatmeal with protein",
                "☕ Snack: Bagel with turkey",
                "🍽️ Lunch: Chicken with rice",
                "💪 Pre-Workout: Rice cakes",
                "🏋️ Post-Workout: Protein shake",
                "🍗 Dinner: Lean beef with potatoes",
                "🌙 Evening: Greek yogurt"
            ]
    else:
        calories = int(tdee)
        protein_ratio, carbs_ratio, fats_ratio = 0.30, 0.40, 0.30
        meals = [
            "🌅 Breakfast: Toast with eggs",
            "☕ Snack: Mixed nuts",
            "🍽️ Lunch: Balanced meal",
            "🥤 Snack: Protein smoothie",
            "🍗 Dinner: Balanced dinner",
            "🌙 Evening: Light snack"
        ]
    
    protein_g = int((calories * protein_ratio) / 4)
    carbs_g = int((calories * carbs_ratio) / 4)
    fats_g = int((calories * fats_ratio) / 9)
    
    return DietRecommendation(
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fats_g=fats_g,
        meals=meals
    )

@app.post("/workout/analyze")
async def analyze_workout(file: UploadFile = File(...)):
    if not MEDIAPIPE_AVAILABLE:
        return {"error": "MediaPipe not available"}
    
    try:
        contents = await file.read()
        img_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        landmarks = detect_pose_mediapipe(image)
        
        if landmarks is None:
            return {"status": "error", "message": "No pose detected"}
        
        exercise = detect_exercise(landmarks)
        
        if exercise == "squat":
            result = analyze_squat(landmarks)
        elif exercise == "pushup":
            result = analyze_pushup(landmarks)
        elif exercise == "plank":
            result = analyze_plank(landmarks)
        elif exercise == "lunge":
            result = analyze_lunge(landmarks)
        elif exercise == "bicep_curl":
            result = analyze_bicep_curl(landmarks)
        elif exercise == "shoulder_press":
            result = analyze_shoulder_press(landmarks)
        elif exercise == "deadlift":
            result = analyze_deadlift(landmarks)
        else:
            result = analyze_squat(landmarks)
        
        session = {
            "exercise": exercise,
            "score": result["score"],
            "timestamp": datetime.now().isoformat()
        }
        workout_history["sessions"].append(session)
        
        return {
            "status": "success",
            "exercise": exercise,
            **result
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/workout/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    if not MEDIAPIPE_AVAILABLE:
        return {"error": "MediaPipe not available", "in_position": False}
    
    try:
        contents = await file.read()
        img_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        landmarks = detect_pose_mediapipe(image)
        
        if landmarks is None:
            return {
                "exercise": "unknown",
                "in_position": False,
                "rep_state": "unknown",
                "knee_angle": 0,
                "elbow_angle": 0,
                "landmarks": []
            }
        
        exercise = detect_exercise(landmarks)
        
        if exercise == "squat":
            result = analyze_squat(landmarks)
        elif exercise == "pushup":
            result = analyze_pushup(landmarks)
        elif exercise == "plank":
            result = analyze_plank(landmarks)
        elif exercise == "lunge":
            result = analyze_lunge(landmarks)
        elif exercise == "bicep_curl":
            result = analyze_bicep_curl(landmarks)
        elif exercise == "shoulder_press":
            result = analyze_shoulder_press(landmarks)
        elif exercise == "deadlift":
            result = analyze_deadlift(landmarks)
        else:
            result = analyze_squat(landmarks)
        
        landmark_list = []
        for lm in landmarks:
            landmark_list.append({
                "x": float(lm.x),
                "y": float(lm.y),
                "z": float(lm.z),
                "visibility": float(lm.visibility)
            })
        
        return {
            "exercise": exercise,
            "in_position": result.get("in_position", False),
            "rep_state": result.get("rep_state", "unknown"),
            "knee_angle": result.get("knee_angle", 0),
            "elbow_angle": result.get("elbow_angle", 0),
            "score": result.get("score", 0),
            "landmarks": landmark_list
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "exercise": "error",
            "in_position": False,
            "landmarks": []
        }

@app.get("/workout/history")
def get_history():
    return {"sessions": workout_history["sessions"]}

@app.get("/workout/stats")
def get_stats():
    sessions = workout_history["sessions"]
    
    if len(sessions) == 0:
        return {
            "total_workouts": 0,
            "average_score": 0,
            "exercises": {}
        }
    
    total_workouts = len(sessions)
    avg_score = sum(s["score"] for s in sessions) / total_workouts
    
    exercises = {}
    for session in sessions:
        ex = session["exercise"]
        exercises[ex] = exercises.get(ex, 0) + 1
    
    return {
        "total_workouts": total_workouts,
        "average_score": round(avg_score, 1),
        "exercises": exercises
    }

@app.delete("/workout/history")
def clear_history():
    workout_history["sessions"] = []
    return {"status": "success"}

# Advanced Features

@app.post("/workout/generate-plan")
def generate_workout_plan():
    goal = user_profile["goal"]
    activity_level = user_profile["activity_level"]
    
    if activity_level == "sedentary":
        days_per_week = 3
    elif activity_level == "moderate":
        days_per_week = 4
    elif activity_level == "active":
        days_per_week = 5
    else:
        days_per_week = 6
    
    plan = []
    
    for week in range(1, 5):
        if goal == "muscle_gain":
            focus = ["Foundation & Form", "Progressive Overload", "Hypertrophy Focus", "Peak Week"][week-1]
        elif goal == "weight_loss":
            focus = ["Cardio Base", "HIIT Introduction", "Endurance Building", "Max Burn"][week-1]
        else:
            focus = ["Balanced Foundation", "Strength & Cardio", "Full Body Focus", "Maintenance Peak"][week-1]
        
        week_plan = {
            "week": week,
            "focus": focus,
            "days": []
        }
        
        exercises_pool = {
            "strength": ["Squats", "Deadlifts", "Push-ups", "Pull-ups", "Lunges", "Shoulder Press", "Bicep Curls"],
            "cardio": ["Running", "Jump Rope", "Burpees", "Mountain Climbers", "High Knees"],
            "core": ["Planks", "Crunches", "Russian Twists", "Leg Raises", "Side Planks"]
        }
        
        for day in range(1, days_per_week + 1):
            if goal == "muscle_gain":
                exercises = random.sample(exercises_pool["strength"], 4) + random.sample(exercises_pool["core"], 1)
                sets = 4 + (week - 1)
                reps = "8-12"
            elif goal == "weight_loss":
                exercises = random.sample(exercises_pool["cardio"], 3) + random.sample(exercises_pool["strength"], 2)
                sets = 3
                reps = "15-20"
            else:
                exercises = (random.sample(exercises_pool["strength"], 2) + 
                            random.sample(exercises_pool["cardio"], 2) + 
                            random.sample(exercises_pool["core"], 1))
                sets = 3
                reps = "12-15"
            
            workout = {
                "day": day,
                "exercises": [
                    {
                        "name": ex,
                        "sets": sets,
                        "reps": reps,
                        "rest": "60-90s"
                    } for ex in exercises
                ],
                "warm_up": "5-10 min dynamic stretching",
                "cool_down": "5 min static stretching"
            }
            
            week_plan["days"].append(workout)
        
        plan.append(week_plan)
    
    return {"plan": plan, "total_weeks": 4}

@app.post("/measurements/add")
def add_measurement(measurement: dict):
    measurement["date"] = datetime.now().strftime("%Y-%m-%d")
    body_measurements.append(measurement)
    return {"status": "success", "measurement": measurement}

@app.get("/measurements/history")
def get_measurements():
    return {"measurements": body_measurements}

@app.get("/measurements/progress")
def get_measurement_progress():
    if len(body_measurements) < 2:
        return {"message": "Need at least 2 measurements"}
    
    first = body_measurements[0]
    latest = body_measurements[-1]
    
    progress = {
        "weight_change": latest["weight"] - first["weight"],
        "chest_change": (latest.get("chest", 0) - first.get("chest", 0)) if first.get("chest") else 0,
        "waist_change": (latest.get("waist", 0) - first.get("waist", 0)) if first.get("waist") else 0,
        "hips_change": (latest.get("hips", 0) - first.get("hips", 0)) if first.get("hips") else 0,
        "days_tracked": len(body_measurements),
        "trend": "gaining" if latest["weight"] > first["weight"] else "losing"
    }
    
    return progress

@app.get("/coaching/daily-tip")
def get_daily_tip():
    goal = user_profile.get("goal", "maintenance")
    stats = workout_history.get("stats", {})
    
    tips = {
        "muscle_gain": [
            "💪 Muscle Tip: Aim for 1g protein per lb of body weight daily",
            "🏋️ Progressive Overload: Increase weight by 2.5-5% when you can do 12+ reps",
            "😴 Recovery Tip: Muscles grow during rest - get 7-9 hours sleep"
        ],
        "weight_loss": [
            "🔥 Calorie Tip: Create a 500 cal deficit for 1lb/week loss",
            "🏃 Cardio: Mix HIIT and steady-state for optimal fat burning",
            "💧 Hydration: Drink water before meals to reduce appetite"
        ],
        "maintenance": [
            "🎯 Balance Tip: Mix 70% strength, 30% cardio",
            "🧘 Flexibility: Add 10 min stretching daily",
            "💯 Consistency: Show up 80% of the time"
        ]
    }
    
    daily_tip = random.choice(tips.get(goal, tips["maintenance"]))
    
    total_workouts = len(workout_history.get("sessions", []))
    avg_score = sum(s.get("score", 0) for s in workout_history.get("sessions", [])) / max(total_workouts, 1)
    
    if total_workouts < 5:
        insight = "🌟 You're just getting started! Focus on building the habit."
    elif avg_score < 70:
        insight = "📚 Your form needs work. Slow down and focus on technique."
    elif total_workouts > 20:
        insight = "🔥 You're on fire! Your consistency is paying off!"
    else:
        insight = "💪 Great progress! Keep pushing yourself."
    
    return {
        "tip": daily_tip,
        "insight": insight,
        "date": datetime.now().strftime("%Y-%m-%d")
    }

@app.get("/challenges/available")
def get_available_challenges():
    challenges = [
        {
            "id": "30day_squat",
            "name": "30-Day Squat Challenge",
            "description": "Progressive squat challenge - reach 100 squats by day 30",
            "duration_days": 30,
            "difficulty": "Beginner",
            "reward": "🏆 Squat Master Badge"
        },
        {
            "id": "pushup_500",
            "name": "500 Push-ups Challenge",
            "description": "Complete 500 total push-ups in a week",
            "duration_days": 7,
            "difficulty": "Intermediate",
            "reward": "💪 Iron Arms Badge"
        },
        {
            "id": "plank_master",
            "name": "Plank Master",
            "description": "Hold a plank for 5 minutes continuously",
            "duration_days": 14,
            "difficulty": "Advanced",
            "reward": "🧘 Core Legend Badge"
        },
        {
            "id": "10k_steps",
            "name": "10K Steps Daily",
            "description": "Walk 10,000 steps every day for a week",
            "duration_days": 7,
            "difficulty": "Beginner",
            "reward": "👟 Step Champion Badge"
        }
    ]
    
    return {"challenges": challenges}

@app.post("/challenges/join")
def join_challenge(challenge_id: str):
    challenge = {
        "id": challenge_id,
        "started_at": datetime.now().strftime("%Y-%m-%d"),
        "progress": 0,
        "completed": False
    }
    
    active_challenges.append(challenge)
    return {"status": "success", "message": "Challenge joined!", "challenge": challenge}

@app.get("/challenges/active")
def get_active_challenges():
    return {"challenges": active_challenges}

@app.get("/recovery/rest-day-recommendation")
def recommend_rest_day():
    recent_workouts = workout_history.get("sessions", [])[-7:]
    
    if len(recent_workouts) == 0:
        return {
            "recommendation": "active",
            "message": "No recent workouts - you're ready to train!",
            "rest_score": 0
        }
    
    avg_score = sum(w.get("score", 0) for w in recent_workouts) / len(recent_workouts)
    workout_count = len(recent_workouts)
    
    if workout_count >= 6:
        recommendation = "full_rest"
        message = "🛌 You've trained 6+ days! Take a full rest day."
        rest_score = 90
    elif workout_count >= 4 and avg_score < 70:
        recommendation = "active_recovery"
        message = "🚶 Your form is declining. Try light walking or yoga."
        rest_score = 70
    elif workout_count >= 3:
        recommendation = "light_training"
        message = "🏃 Light workout OK, avoid heavy lifting."
        rest_score = 40
    else:
        recommendation = "active"
        message = "💪 You're recovered! Go for a full workout."
        rest_score = 10
    
    return {
        "recommendation": recommendation,
        "message": message,
        "rest_score": rest_score,
        "recent_workout_count": workout_count,
        "average_form_score": round(avg_score, 1)
    }

@app.post("/nutrition/meal-prep")
def generate_meal_prep_plan(days: int = 5):
    weight = float(user_profile["weight"])
    height = float(user_profile["height"])
    age = int(user_profile["age"])
    gender = user_profile["gender"]
    goal = user_profile["goal"]
    diet_type = user_profile.get("diet_type", "regular")
    
    if gender == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    
    tdee = bmr * 1.55
    
    if goal == "weight_loss":
        daily_calories = int(tdee - 500)
    elif goal == "muscle_gain":
        daily_calories = int(tdee + 300)
    else:
        daily_calories = int(tdee)
    
    if diet_type == "vegan":
        meals = {
            "breakfast": "Overnight oats with chia seeds and berries",
            "lunch": "Quinoa bowl with chickpeas and tahini",
            "dinner": "Tofu stir-fry with brown rice",
            "snacks": "Hummus with carrots, mixed nuts"
        }
    elif diet_type == "vegetarian":
        meals = {
            "breakfast": "Greek yogurt parfait with granola",
            "lunch": "Paneer tikka wrap with quinoa",
            "dinner": "Vegetarian chili with sweet potato",
            "snacks": "Hard-boiled eggs, cheese sticks"
        }
    else:
        meals = {
            "breakfast": "Egg white omelet with toast",
            "lunch": "Grilled chicken with brown rice",
            "dinner": "Baked salmon with sweet potato",
            "snacks": "Protein shake, turkey jerky"
        }
    
    shopping_list = {
        "proteins": ["Chicken breast (1kg)", "Salmon (500g)", "Eggs (dozen)"],
        "carbs": ["Brown rice (1kg)", "Quinoa (500g)", "Sweet potatoes (5)"],
        "veggies": ["Broccoli", "Spinach", "Carrots", "Bell peppers"],
        "fats": ["Almonds", "Avocado", "Olive oil"],
        "other": ["Protein powder", "Spices"]
    }
    
    return {
        "days": days,
        "daily_calories": daily_calories,
        "meals": meals,
        "shopping_list": shopping_list,
        "prep_instructions": [
            "1. Cook all proteins on Sunday",
            "2. Prep vegetables: wash, chop, store",
            "3. Cook grains in bulk",
            "4. Portion into containers",
            "5. Label with date"
        ]
    }

@app.get("/analytics/detailed-stats")
def get_detailed_analytics():
    sessions = workout_history.get("sessions", [])
    
    if len(sessions) == 0:
        return {"message": "No workout data yet"}
    
    total_workouts = len(sessions)
    avg_score = sum(s["score"] for s in sessions) / total_workouts
    
    exercise_counts = {}
    exercise_scores = {}
    
    for session in sessions:
        ex = session["exercise"]
        exercise_counts[ex] = exercise_counts.get(ex, 0) + 1
        if ex not in exercise_scores:
            exercise_scores[ex] = []
        exercise_scores[ex].append(session["score"])
    
    exercise_improvement = {}
    for ex, scores in exercise_scores.items():
        if len(scores) >= 2:
            first_avg = sum(scores[:3]) / min(3, len(scores))
            last_avg = sum(scores[-3:]) / min(3, len(scores[-3:]))
            improvement = last_avg - first_avg
            exercise_improvement[ex] = round(improvement, 1)
    
    last_7_days = sessions[-7:] if len(sessions) >= 7 else sessions
    consistency = (len(last_7_days) / 7) * 100
    
    return {
        "total_workouts": total_workouts,
        "average_score": round(avg_score, 1),
        "exercise_breakdown": exercise_counts,
        "exercise_improvement": exercise_improvement,
        "weekly_consistency": round(consistency, 1),
        "favorite_exercise": max(exercise_counts, key=exercise_counts.get) if exercise_counts else None,
        "needs_work": min(exercise_scores, key=lambda k: sum(exercise_scores[k])/len(exercise_scores[k])) if exercise_scores else None,
        "trend": "improving" if len(sessions) >= 5 and sessions[-1]["score"] > sessions[0]["score"] else "needs_focus"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)