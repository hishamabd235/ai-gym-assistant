'use client'

import React, { useState, useEffect } from 'react';
import { Utensils, Activity, TrendingUp, User, Moon, Sun, Target, Calendar, Award, Zap, BarChart3, Dumbbell, Heart, Flame, Timer, Trophy, ClipboardList, Brain, Rocket, ShoppingCart, TrendingDown, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';

export default function FitNex() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [profile, setProfile] = useState({name: '', age: '', weight: '', height: '', goal: 'muscle_gain', activity_level: 'moderate', gender: 'male', diet_type: 'regular'});
  const [bmiData, setBmiData] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [workoutResult, setWorkoutResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Advanced features states
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [dailyTip, setDailyTip] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [restDayAdvice, setRestDayAdvice] = useState(null);
  const [mealPrep, setMealPrep] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [measurementProgress, setMeasurementProgress] = useState(null);
  const [newMeasurement, setNewMeasurement] = useState({
    weight: '',
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: ''
  });
  
  // Tracker states
  const [waterIntake, setWaterIntake] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [workoutStreak, setWorkoutStreak] = useState(7);
  const [todayWorkouts, setTodayWorkouts] = useState([]);
  const [personalBests, setPersonalBests] = useState({
    squat: 0,
    pushup: 0,
    plank: 0
  });
  
  // Webcam states
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [repState, setRepState] = useState('up');
  const [currentExercise, setCurrentExercise] = useState('squat');
  const [liveAngle, setLiveAngle] = useState(0);
  const [liveScore, setLiveScore] = useState(100);
  const [landmarks, setLandmarks] = useState([]);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const overlayCanvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const lastRepStateRef = React.useRef('up');
  const timerIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const API = 'https://ai-gym-assistant-38de.onrender.com';

  // Persist dark mode
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(saved === 'true');
    }
    
    // Splash screen timer
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Workout timer
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setWorkoutTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  useEffect(() => {
    fetchProfile();
    fetchDailyTip();
    fetchChallenges();
    fetchRestDayAdvice();
    return () => {
      stopWebcam();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'progress') {
      fetchHistory();
      fetchStats();
      fetchAnalytics();
    } else if (activeTab === 'measurements') {
      fetchMeasurements();
    } else if (activeTab === 'plans') {
      // Workout plans tab
    }
  }, [activeTab]);

  useEffect(() => {
    if (!showSkeleton && overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [showSkeleton]);

  // Format timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startWorkoutTimer = () => {
    setIsTimerRunning(true);
    setWorkoutTimer(0);
  };

  const stopWorkoutTimer = () => {
    setIsTimerRunning(false);
  };

  const addWater = () => {
    setWaterIntake(prev => prev + 250);
  };

  // Advanced feature functions
  const generateWorkoutPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/workout/generate-plan`, { method: 'POST' });
      const data = await res.json();
      setWorkoutPlan(data);
    } catch (e) {
      alert('Error generating workout plan');
    }
    setLoading(false);
  };

  const fetchDailyTip = async () => {
    try {
      const res = await fetch(`${API}/coaching/daily-tip`);
      const data = await res.json();
      setDailyTip(data);
    } catch (e) {}
  };

  const fetchChallenges = async () => {
    try {
      const res = await fetch(`${API}/challenges/available`);
      const data = await res.json();
      setChallenges(data.challenges || []);
      
      const activeRes = await fetch(`${API}/challenges/active`);
      const activeData = await activeRes.json();
      setActiveChallenges(activeData.challenges || []);
    } catch (e) {}
  };

  const joinChallenge = async (challengeId) => {
    try {
      const res = await fetch(`${API}/challenges/join?challenge_id=${challengeId}`, {
        method: 'POST'
      });
      if (res.ok) {
        alert('Challenge joined! 🎉');
        fetchChallenges();
      }
    } catch (e) {
      alert('Error joining challenge');
    }
  };

  const fetchRestDayAdvice = async () => {
    try {
      const res = await fetch(`${API}/recovery/rest-day-recommendation`);
      const data = await res.json();
      setRestDayAdvice(data);
    } catch (e) {}
  };

  const generateMealPrep = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/nutrition/meal-prep?days=5`, { method: 'POST' });
      const data = await res.json();
      setMealPrep(data);
    } catch (e) {
      alert('Error generating meal prep');
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/analytics/detailed-stats`);
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {}
  };

  const fetchMeasurements = async () => {
    try {
      const res = await fetch(`${API}/measurements/history`);
      const data = await res.json();
      setMeasurements(data.measurements || []);
      
      const progressRes = await fetch(`${API}/measurements/progress`);
      const progressData = await progressRes.json();
      setMeasurementProgress(progressData);
    } catch (e) {}
  };

  const addMeasurement = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/measurements/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(newMeasurement.weight) || 0,
          chest: parseFloat(newMeasurement.chest) || 0,
          waist: parseFloat(newMeasurement.waist) || 0,
          hips: parseFloat(newMeasurement.hips) || 0,
          arms: parseFloat(newMeasurement.arms) || 0,
          thighs: parseFloat(newMeasurement.thighs) || 0
        })
      });
      if (res.ok) {
        alert('Measurement added! 📏');
        setNewMeasurement({weight: '', chest: '', waist: '', hips: '', arms: '', thighs: ''});
        fetchMeasurements();
      }
    } catch (e) {
      alert('Error adding measurement');
    }
    setLoading(false);
  };

  const startWebcam = async () => {
    try {
      setIsWebcamActive(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) {
        setIsWebcamActive(false);
        alert('Error: Video element not found');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      });
      
      const video = videoRef.current;
      video.srcObject = stream;
      streamRef.current = stream;
      
      video.onloadedmetadata = () => {
        video.play()
          .then(() => {
            setRepCount(0);
            setRepState('up');
            lastRepStateRef.current = 'up';
            startWorkoutTimer();
            setTimeout(() => {
              intervalRef.current = setInterval(captureAndAnalyze, 500);
            }, 1000);
          })
          .catch(err => {
            console.error('❌ Play error:', err);
            stopWebcam();
          });
      };
    } catch (err) {
      console.error('❌ Camera error:', err);
      alert('Camera access denied');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setLandmarks([]);
    stopWorkoutTimer();
    
    const calories = Math.round((workoutTimer / 60) * 8);
    setCaloriesBurned(prev => prev + calories);
    
    if (repCount > personalBests[currentExercise]) {
      setPersonalBests(prev => ({
        ...prev,
        [currentExercise]: repCount
      }));
    }
    
    setTodayWorkouts(prev => [...prev, {
      exercise: currentExercise,
      reps: repCount,
      duration: workoutTimer,
      time: new Date().toLocaleTimeString()
    }]);
  };

  const drawSkeleton = (landmarks) => {
    if (!showSkeleton || !overlayCanvasRef.current || !videoRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!landmarks || landmarks.length === 0) return;
    
    const POSE_CONNECTIONS = [
      [11, 12], [11, 23], [12, 24], [23, 24],
      [11, 13], [13, 15], [12, 14], [14, 16],
      [23, 25], [25, 27], [24, 26], [26, 28],
    ];
    
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    
    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }
    });
    
    const importantJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    
    importantJoints.forEach(idx => {
      const landmark = landmarks[idx];
      if (landmark && landmark.visibility > 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        const color = landmark.visibility > 0.8 ? '#a855f7' : '#fbbf24';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      
      try {
        const res = await fetch(`${API}/workout/analyze-frame`, {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        
        setCurrentExercise(data.exercise);
        
        if (data.knee_angle) {
          setLiveAngle(data.knee_angle);
        } else if (data.elbow_angle) {
          setLiveAngle(data.elbow_angle);
        }
        
        setLiveScore(data.in_position ? 100 : 70);
        
        if (data.landmarks && data.landmarks.length > 0) {
          setLandmarks(data.landmarks);
          drawSkeleton(data.landmarks);
        }
        
        const currentState = data.rep_state;
        const previousState = lastRepStateRef.current;
        
        console.log(`🔄 Exercise: ${data.exercise} | State: ${previousState} → ${currentState} | Angle: ${data.knee_angle?.toFixed(0) || data.elbow_angle?.toFixed(0)}°`);
        
        // IMPROVED REP COUNTING - Check state transition
        if (previousState === 'down' && currentState === 'up') {
          console.log('🎯 REP COUNTED! (completed: down → up)');
          setRepCount(prev => {
            const newCount = prev + 1;
            console.log(`✅ Rep count: ${prev} → ${newCount}`);
            return newCount;
          });
        }
        
        // Update state for next comparison
        if (currentState !== previousState) {
          console.log(`🔄 State changed: ${previousState} → ${currentState}`);
          lastRepStateRef.current = currentState;
        }
        
        setRepState(currentState);
        
      } catch (err) {
        console.error('❌ Frame analysis error:', err);
      }
    }, 'image/jpeg', 0.7);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/profile`);
      const data = await res.json();
      setProfile({
        name: data.name,
        age: data.age,
        weight: data.weight,
        height: data.height,
        goal: data.goal,
        activity_level: data.activity_level,
        gender: data.gender,
        diet_type: data.diet_type || 'regular'
      });
      setBmiData(data);
    } catch (e) {
      console.error('❌ Failed to fetch profile:', e);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      await fetchProfile();
      alert('Profile saved! ✅');
    } catch (e) {
      alert('Error saving profile');
    }
    setLoading(false);
  };

  const generateDiet = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/diet/recommend`, { method: 'POST' });
      const data = await res.json();
      setDietPlan(data);
    } catch (e) {
      alert('Error generating diet plan');
    }
    setLoading(false);
  };

  const analyzeWorkout = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API}/workout/analyze`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setWorkoutResult(data);
    } catch (error) {
      alert('Error analyzing workout');
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/workout/history`);
      const data = await res.json();
      setHistory(data.sessions || []);
    } catch (e) {}
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/workout/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {}
  };

  const clearHistory = async () => {
    if (!confirm('Clear all workout history?')) return;
    try {
      await fetch(`${API}/workout/history`, { method: 'DELETE' });
      setHistory([]);
      setStats(null);
    } catch (e) {}
  };

  const chartData = history.slice(-10).map((h, i) => ({
    name: `#${i + 1}`,
    score: h.score
  }));

  const exerciseData = stats ? Object.entries(stats.exercises).map(([exercise, count]) => ({
    exercise: exercise.replaceAll('_', ' '),
    count
  })) : [];

  const radarData = [
    { metric: 'Strength', value: stats ? Math.min(stats.average_score, 100) : 0 },
    { metric: 'Endurance', value: stats ? Math.min(stats.total_workouts * 10, 100) : 0 },
    { metric: 'Form', value: stats ? Math.min(stats.average_score, 100) : 0 },
    { metric: 'Consistency', value: stats ? Math.min(stats.total_workouts * 15, 100) : 0 },
  ];

  const weekData = [
    { day: 'Mon', workouts: 2 },
    { day: 'Tue', workouts: 1 },
    { day: 'Wed', workouts: 3 },
    { day: 'Thu', workouts: 2 },
    { day: 'Fri', workouts: 1 },
    { day: 'Sat', workouts: 0 },
    { day: 'Sun', workouts: 2 },
  ];

  return (
    <>
      {/* Splash Screen */}
      {showSplash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-pink-900 animate-pulse">
          <div className="text-center">
            {/* Animated Logo */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-3xl opacity-50 animate-pulse"></div>
              <div className="relative">
                <div className="w-32 h-32 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center transform hover:scale-110 transition-all duration-300 shadow-2xl animate-bounce">
                  <span className="text-6xl font-black text-white">FN</span>
                </div>
              </div>
            </div>
            
            {/* Brand Name */}
            <h1 className="text-6xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
              fitNEX
            </h1>
            <p className="text-purple-300 text-xl font-medium tracking-wide">
              Your AI Fitness Revolution
            </p>
            
            {/* Loading Animation */}
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Main App */}
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-all ${
        darkMode 
          ? 'bg-[#0a0a0a]/90 border-gray-800 shadow-lg shadow-purple-900/20' 
          : 'bg-white/90 border-gray-200 shadow-lg'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Enhanced Logo */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-all">
                  <span className="text-white font-black text-xl">FN</span>
                </div>
              </div>
              
              <div>
                <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                  fit<span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">NEX</span>
                </h1>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                    PRO
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    AI Powered
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-xl transition-all hover:scale-110 ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 shadow-lg shadow-purple-900/20' 
                  : 'bg-gray-100 hover:bg-gray-200 shadow-lg'
              }`}
            >
              {darkMode ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-purple-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation */}
        <nav className={`rounded-2xl p-2 mb-8 border transition-all shadow-lg ${
          darkMode 
            ? 'bg-[#1a1a1a]/80 backdrop-blur-xl border-gray-800 shadow-purple-900/10' 
            : 'bg-white/80 backdrop-blur-xl border-gray-200 shadow-lg'
        }`}>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
              { id: 'workout', icon: Activity, label: 'Workout' },
              { id: 'plans', icon: Rocket, label: 'AI Plans' },
              { id: 'challenges', icon: Trophy, label: 'Challenges' },
              { id: 'diet', icon: Utensils, label: 'Nutrition' },
              { id: 'tracker', icon: ClipboardList, label: 'Tracker' },
              { id: 'measurements', icon: TrendingDown, label: 'Body Stats' },
              { id: 'progress', icon: TrendingUp, label: 'Progress' },
              { id: 'profile', icon: User, label: 'Profile' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap relative overflow-hidden group ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 scale-105'
                    : darkMode
                      ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {activeTab !== tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-pink-500/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                )}
                <tab.icon size={18} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard</h2>
            
            {/* Daily Tip Card */}
            {dailyTip && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
              }`}>
                <div className="flex items-start gap-4">
                  <Brain className="text-purple-500" size={32} />
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      AI Coach Tip
                    </h3>
                    <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {dailyTip.tip}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {dailyTip.insight}
                    </p>
                  </div>
                  <Sparkles className="text-yellow-400" size={24} />
                </div>
              </div>
            )}

            {/* Rest Day Recommendation */}
            {restDayAdvice && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Recovery Status
                </h3>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {restDayAdvice.recommendation.replaceAll('_', ' ').toUpperCase()}
                    </div>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {restDayAdvice.message}
                    </p>
                  </div>
                  <div className={`text-4xl font-bold ${
                    restDayAdvice.rest_score > 70 ? 'text-orange-500' : 
                    restDayAdvice.rest_score > 40 ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {restDayAdvice.rest_score}
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      restDayAdvice.rest_score > 70 ? 'bg-orange-500' : 
                      restDayAdvice.rest_score > 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{width: `${restDayAdvice.rest_score}%`}}
                  />
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={startWorkoutTimer}
                disabled={isTimerRunning}
                className={`p-6 rounded-2xl border transition-all text-left ${
                  darkMode
                    ? 'bg-[#1a1a1a] border-gray-800 hover:bg-gray-800'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                } ${isTimerRunning ? 'opacity-50' : ''}`}
              >
                <Timer className="text-blue-500 mb-2" size={24} />
                <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Start Workout
                </div>
                <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {isTimerRunning ? formatTime(workoutTimer) : 'Begin timer'}
                </div>
              </button>

              <button
                onClick={addWater}
                className={`p-6 rounded-2xl border transition-all text-left ${
                  darkMode
                    ? 'bg-[#1a1a1a] border-gray-800 hover:bg-gray-800'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Heart className="text-cyan-500 mb-2" size={24} />
                <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Water Intake
                </div>
                <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {waterIntake}ml / 2000ml
                </div>
              </button>

              <button
                className={`p-6 rounded-2xl border transition-all text-left ${
                  darkMode
                    ? 'bg-[#1a1a1a] border-gray-800 hover:bg-gray-800'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Flame className="text-orange-500 mb-2" size={24} />
                <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Calories Burned
                </div>
                <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {caloriesBurned} kcal
                </div>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <Zap className="text-yellow-500" size={24} />
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Workouts</span>
                </div>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats?.total_workouts || 0}
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <Award className="text-purple-500" size={24} />
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Avg Score</span>
                </div>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats?.average_score || 0}
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <Target className="text-pink-500" size={24} />
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>BMI</span>
                </div>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {bmiData?.bmi || '--'}
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <Trophy className="text-blue-500" size={24} />
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Streak</span>
                </div>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {workoutStreak} days
                </div>
              </div>
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Weekly Activity
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={weekData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#333' : '#e5e7eb'} />
                      <XAxis dataKey="day" stroke={darkMode ? '#666' : '#999'} />
                      <YAxis stroke={darkMode ? '#666' : '#999'} />
                      <Tooltip contentStyle={{
                        backgroundColor: darkMode ? '#1a1a1a' : '#fff',
                        border: '1px solid #a855f7',
                        borderRadius: '8px'
                      }} />
                      <Area type="monotone" dataKey="workouts" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Fitness Radar
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={darkMode ? '#333' : '#e5e7eb'} />
                      <PolarAngleAxis dataKey="metric" stroke={darkMode ? '#666' : '#999'} />
                      <PolarRadiusAxis stroke={darkMode ? '#666' : '#999'} domain={[0, 100]} />
                      <Radar dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              AI Workout Plans
            </h2>

            <button 
              onClick={generateWorkoutPlan} 
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-8 py-4 rounded-xl font-medium disabled:opacity-50 transition-all"
            >
              {loading ? 'Generating...' : '🤖 Generate 4-Week AI Plan'}
            </button>

            {workoutPlan && (
              <div className="space-y-6">
                {workoutPlan.plan.map((week) => (
                  <div 
                    key={week.week}
                    className={`p-6 rounded-2xl border ${
                      darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                    }`}
                  >
                    <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Week {week.week}: {week.focus}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {week.days.map((day) => (
                        <div 
                          key={day.day}
                          className={`p-4 rounded-xl ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-50'
                          }`}
                        >
                          <div className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Day {day.day}
                          </div>
                          <div className="space-y-2">
                            {day.exercises.map((ex, i) => (
                              <div key={i} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                • {ex.name}: {ex.sets} sets x {ex.reps}
                              </div>
                            ))}
                          </div>
                          <div className={`text-xs mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Warm-up: {day.warm_up}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Fitness Challenges
            </h2>

            {/* Active Challenges */}
            {activeChallenges.length > 0 && (
              <div>
                <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  My Active Challenges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeChallenges.map((challenge) => (
                    <div 
                      key={challenge.id}
                      className={`p-6 rounded-2xl border ${
                        darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Trophy className="text-yellow-500" size={24} />
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
                        }`}>
                          Active
                        </span>
                      </div>
                      <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {challenge.id.replaceAll('_', ' ').toUpperCase()}
                      </div>
                      <div className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Started: {challenge.started_at}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Challenges */}
            <div>
              <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Available Challenges
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {challenges.map((challenge) => (
                  <div 
                    key={challenge.id}
                    className={`p-6 rounded-2xl border ${
                      darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Trophy className="text-purple-500" size={32} />
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        challenge.difficulty === 'Beginner' ? 'bg-green-500 text-white' :
                        challenge.difficulty === 'Intermediate' ? 'bg-yellow-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                    <h4 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {challenge.name}
                    </h4>
                    <p className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {challenge.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                        {challenge.duration_days} days
                      </span>
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {challenge.reward}
                      </span>
                    </div>
                    <button
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-6 py-3 rounded-xl font-medium transition-all"
                    >
                      Join Challenge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Body Stats / Measurements Tab */}
        {activeTab === 'measurements' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Body Measurements
            </h2>

            {/* Add Measurement Form */}
            <div className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add New Measurement
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Weight (kg)', key: 'weight' },
                  { label: 'Chest (cm)', key: 'chest' },
                  { label: 'Waist (cm)', key: 'waist' },
                  { label: 'Hips (cm)', key: 'hips' },
                  { label: 'Arms (cm)', key: 'arms' },
                  { label: 'Thighs (cm)', key: 'thighs' }
                ].map(field => (
                  <div key={field.key}>
                    <label className={`block mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {field.label}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newMeasurement[field.key]}
                      onChange={(e) => setNewMeasurement({...newMeasurement, [field.key]: e.target.value})}
                      className={`w-full p-3 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-gray-800 text-white border-gray-700' 
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addMeasurement}
                disabled={loading}
                className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 transition-all"
              >
                {loading ? 'Adding...' : 'Add Measurement'}
              </button>
            </div>

            {/* Progress Summary */}
            {measurementProgress && measurementProgress.weight_change !== undefined && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Progress Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      measurementProgress.weight_change < 0 ? 'text-green-500' : 'text-orange-500'
                    }`}>
                      {measurementProgress.weight_change > 0 ? '+' : ''}{measurementProgress.weight_change.toFixed(1)} kg
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Weight</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      measurementProgress.waist_change < 0 ? 'text-green-500' : 'text-orange-500'
                    }`}>
                      {measurementProgress.waist_change > 0 ? '+' : ''}{measurementProgress.waist_change.toFixed(1)} cm
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Waist</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {measurementProgress.days_tracked}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Days Tracked</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold capitalize ${
                      measurementProgress.trend === 'losing' ? 'text-green-500' : 'text-blue-500'
                    }`}>
                      {measurementProgress.trend}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Trend</div>
                  </div>
                </div>
              </div>
            )}

            {/* Measurement History */}
            {measurements.length > 0 && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Measurement History
                </h3>
                <div className="space-y-3">
                  {measurements.slice(-5).reverse().map((m, i) => (
                    <div 
                      key={i}
                      className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {m.date}
                        </span>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {m.weight} kg
                        </span>
                      </div>
                      <div className={`text-sm grid grid-cols-2 md:grid-cols-5 gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {m.chest && <div>Chest: {m.chest}cm</div>}
                        {m.waist && <div>Waist: {m.waist}cm</div>}
                        {m.hips && <div>Hips: {m.hips}cm</div>}
                        {m.arms && <div>Arms: {m.arms}cm</div>}
                        {m.thighs && <div>Thighs: {m.thighs}cm</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workout Tab - Keep existing code */}
        {activeTab === 'workout' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Workout Analysis
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📸 Photo Analysis
                </h3>
                <label className="block bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-6 py-3 rounded-xl font-medium cursor-pointer text-center transition-all">
                  {loading ? 'Analyzing...' : 'Upload Photo'}
                  <input type="file" accept="image/*" onChange={analyzeWorkout} className="hidden" disabled={loading} />
                </label>
              </div>
              
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🎥 Live Analysis
                </h3>
                <button 
                  onClick={isWebcamActive ? stopWebcam : startWebcam}
                  className={`w-full px-6 py-3 rounded-xl font-medium transition-all ${
                    isWebcamActive 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white`}
                >
                  {isWebcamActive ? 'Stop Webcam' : 'Start Live Analysis'}
                </button>
              </div>
            </div>

            {isWebcamActive && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <div className="relative bg-black rounded-xl overflow-hidden" style={{paddingBottom: '56.25%'}}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    muted
                    className="absolute top-0 left-0 w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <canvas 
                    ref={overlayCanvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{objectFit: 'cover'}}
                  />
                  
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur px-4 py-2 rounded-lg">
                    <div className="text-white text-4xl font-bold">{repCount}</div>
                    <div className="text-gray-400 text-xs uppercase tracking-wide">
                      {currentExercise ? currentExercise.replaceAll('_', ' ') : 'Detecting...'}
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 rounded-lg">
                    <div className="text-white text-2xl font-bold">{liveAngle.toFixed(0)}°</div>
                    <div className={`text-xs font-medium ${liveScore === 100 ? 'text-green-400' : 'text-orange-400'}`}>
                      {liveScore === 100 ? 'Good' : 'Adjust'}
                    </div>
                  </div>

                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur px-4 py-2 rounded-lg">
                    <div className="text-white text-xl font-bold">{formatTime(workoutTimer)}</div>
                  </div>
                  
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur px-6 py-2 rounded-full">
                    <span className="text-white font-medium text-sm">
                      {repState === 'down' ? '⬇ DOWN' : '⬆ UP'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Stand sideways • Full body visible • 6-8 ft away
                  </p>
                  <button 
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      showSkeleton 
                        ? 'bg-purple-500 text-white' 
                        : darkMode
                          ? 'bg-gray-800 text-gray-400'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    Skeleton {showSkeleton ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}

            {workoutResult && workoutResult.status === 'success' && !isWebcamActive && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-2xl font-bold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {workoutResult.exercise.replaceAll('_', ' ')}
                  </h3>
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {workoutResult.score}
                  </div>
                </div>
                <div className="space-y-2">
                  {workoutResult.feedback?.map((fb, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg ${
                        darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {fb}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tracker Tab - Keep existing */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Daily Tracker
            </h2>

            <div className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Today's Workouts
              </h3>
              {todayWorkouts.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No workouts yet today. Start tracking!
                </p>
              ) : (
                <div className="space-y-3">
                  {todayWorkouts.map((workout, i) => (
                    <div 
                      key={i}
                      className={`p-4 rounded-xl ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-semibold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {workout.exercise.replaceAll('_', ' ')}
                          </div>
                          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {workout.reps} reps • {formatTime(workout.duration)}
                          </div>
                        </div>
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {workout.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Personal Bests 🏆
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(personalBests).map(([exercise, reps]) => (
                  <div 
                    key={exercise}
                    className={`p-4 rounded-xl text-center ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-sm mb-1 capitalize ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {exercise}
                    </div>
                    <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {reps}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      reps
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Hydration 💧
                </h3>
                <div className="mb-4">
                  <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {waterIntake}ml
                  </div>
                  <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Goal: 2000ml
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                  <div 
                    className="bg-cyan-500 h-3 rounded-full transition-all"
                    style={{width: `${Math.min((waterIntake / 2000) * 100, 100)}%`}}
                  />
                </div>
                <button
                  onClick={addWater}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-xl font-medium transition-all"
                >
                  + Add Glass (250ml)
                </button>
              </div>

              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Calories Burned 🔥
                </h3>
                <div className="mb-4">
                  <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {caloriesBurned}
                  </div>
                  <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    kcal burned today
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Estimated from workout duration
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diet Tab - Enhanced with Meal Prep */}
        {activeTab === 'diet' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Nutrition Plan
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={generateDiet} 
                disabled={loading} 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-8 py-4 rounded-xl font-medium disabled:opacity-50 transition-all"
              >
                {loading ? 'Generating...' : 'Generate Daily Diet Plan'}
              </button>

              <button 
                onClick={generateMealPrep} 
                disabled={loading} 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white px-8 py-4 rounded-xl font-medium disabled:opacity-50 transition-all"
              >
                {loading ? 'Generating...' : '🛒 Generate Meal Prep Plan'}
              </button>
            </div>

            {/* Meal Prep Plan */}
            {mealPrep && (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {mealPrep.days}-Day Meal Prep Plan
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {mealPrep.daily_calories}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        kcal/day
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(mealPrep.meals).map(([meal, description]) => (
                      <div 
                        key={meal}
                        className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}
                      >
                        <div className={`font-semibold capitalize mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {meal}
                        </div>
                        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shopping List */}
                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="text-green-500" size={24} />
                    <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Shopping List
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(mealPrep.shopping_list).map(([category, items]) => (
                      <div key={category}>
                        <div className={`font-semibold capitalize mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {category}
                        </div>
                        <ul className={`space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {items.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-green-500">✓</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prep Instructions */}
                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Prep Instructions
                  </h3>
                  <ol className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {mealPrep.prep_instructions.map((instruction, i) => (
                      <li key={i}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Regular Diet Plan */}
            {dietPlan && !mealPrep && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Calories', value: dietPlan.calories, unit: 'kcal' },
                    { label: 'Protein', value: dietPlan.protein_g, unit: 'g' },
                    { label: 'Carbs', value: dietPlan.carbs_g, unit: 'g' },
                    { label: 'Fats', value: dietPlan.fats_g, unit: 'g' }
                  ].map((macro) => (
                    <div 
                      key={macro.label} 
                      className={`p-4 rounded-xl border text-center ${
                        darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {macro.label}
                      </div>
                      <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {macro.value}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {macro.unit}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Meal Plan
                  </h3>
                  <div className="space-y-3">
                    {dietPlan.meals.map((meal, i) => (
                      <div 
                        key={i} 
                        className={`p-4 rounded-xl ${
                          darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {meal}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Tab - Enhanced with Analytics */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Progress & Analytics
              </h2>
              <button 
                onClick={clearHistory} 
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all"
              >
                Clear History
              </button>
            </div>

            {/* Advanced Analytics */}
            {analytics && analytics.total_workouts > 0 && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-purple-500" size={24} />
                  <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    AI Insights
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Favorite Exercise
                    </div>
                    <div className={`text-xl font-bold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {analytics.favorite_exercise?.replaceAll('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Needs Work
                    </div>
                    <div className={`text-xl font-bold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {analytics.needs_work?.replaceAll('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Consistency
                    </div>
                    <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {analytics.weekly_consistency}%
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Trend
                    </div>
                    <div className={`text-xl font-bold capitalize ${
                      analytics.trend === 'improving' ? 'text-green-500' : 'text-orange-500'
                    }`}>
                      {analytics.trend}
                    </div>
                  </div>
                </div>

                {/* Exercise Improvement */}
                {analytics.exercise_improvement && Object.keys(analytics.exercise_improvement).length > 0 && (
                  <div className="mt-4">
                    <div className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Exercise Improvement:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analytics.exercise_improvement).map(([ex, improvement]) => (
                        <div 
                          key={ex}
                          className={`px-3 py-1 rounded-full text-sm ${
                            improvement > 0 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-orange-500/20 text-orange-400'
                          }`}
                        >
                          {ex.replaceAll('_', ' ')}: {improvement > 0 ? '+' : ''}{improvement}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Workouts
                  </div>
                  <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.total_workouts}
                  </div>
                </div>
                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Average Score
                  </div>
                  <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.average_score}
                  </div>
                </div>
                <div className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Most Done
                  </div>
                  <div className={`text-2xl font-bold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {exerciseData[0]?.exercise || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {exerciseData.length > 0 && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Exercise Distribution
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={exerciseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#333' : '#e5e7eb'} />
                    <XAxis dataKey="exercise" stroke={darkMode ? '#666' : '#999'} />
                    <YAxis stroke={darkMode ? '#666' : '#999'} />
                    <Tooltip contentStyle={{
                      backgroundColor: darkMode ? '#1a1a1a' : '#fff',
                      border: '1px solid #a855f7',
                      borderRadius: '8px'
                    }} />
                    <Bar dataKey="count" fill="#a855f7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab - Keep existing */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Profile Settings
            </h2>
            
            <div className={`p-6 rounded-2xl border ${
              darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Name', type: 'text', value: 'name' },
                  { label: 'Age', type: 'number', value: 'age' },
                  { label: 'Weight (kg)', type: 'number', value: 'weight' },
                  { label: 'Height (cm)', type: 'number', value: 'height' },
                ].map(field => (
                  <div key={field.value}>
                    <label className={`block mb-2 text-sm font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {field.label}
                    </label>
                    <input 
                      type={field.type}
                      value={profile[field.value]} 
                      onChange={(e) => setProfile({
                        ...profile, 
                        [field.value]: field.type === 'number' 
                          ? (parseFloat(e.target.value) || 0) 
                          : e.target.value
                      })} 
                      className={`w-full p-3 rounded-xl border focus:border-purple-500 focus:outline-none transition-all ${
                        darkMode 
                          ? 'bg-gray-800 text-white border-gray-700' 
                          : 'bg-white text-gray-900 border-gray-300'
                      }`} 
                    />
                  </div>
                ))}
                
                {[
                  { label: 'Gender', value: 'gender', options: [
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' }
                  ]},
                  { label: 'Goal', value: 'goal', options: [
                    { value: 'weight_loss', label: 'Weight Loss' },
                    { value: 'muscle_gain', label: 'Muscle Gain' },
                    { value: 'maintenance', label: 'Maintenance' }
                  ]},
                  { label: 'Activity Level', value: 'activity_level', options: [
                    { value: 'sedentary', label: 'Sedentary' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'active', label: 'Active' },
                    { value: 'very_active', label: 'Very Active' }
                  ]},
                  { label: 'Diet Type 🌱', value: 'diet_type', options: [
                    { value: 'regular', label: 'Regular' },
                    { value: 'vegetarian', label: 'Vegetarian' },
                    { value: 'vegan', label: 'Vegan' }
                  ]}
                ].map(field => (
                  <div key={field.value}>
                    <label className={`block mb-2 text-sm font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {field.label}
                    </label>
                    <select 
                      value={profile[field.value]} 
                      onChange={(e) => setProfile({...profile, [field.value]: e.target.value})} 
                      className={`w-full p-3 rounded-xl border focus:border-purple-500 focus:outline-none transition-all ${
                        darkMode 
                          ? 'bg-gray-800 text-white border-gray-700' 
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    >
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={saveProfile} 
                disabled={loading} 
                className="mt-6 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 transition-all"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            {bmiData && (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Your BMI
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                      {bmiData.bmi}
                    </div>
                    <div className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {bmiData.bmi_category}
                    </div>
                  </div>
                  <div className="text-4xl">
                    {bmiData.bmi_status === 'healthy' ? '✅' : bmiData.bmi_status === 'warning' ? '⚠️' : '🔴'}
                  </div>
                </div>
                <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {bmiData.bmi_advice}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}