# 🚀 Session Startup Guide - Fix "Not sending to backend" Issue

## 🔍 **Current Issue Analysis**

Your logs show:
```
📹 Pose detection callback triggered {hasLandmarks: true, isRunning: false, selectedExercise: '', landmarksCount: 33}
⏸️ Not sending to backend: {isRunning: false, selectedExercise: false, hasPoseDetector: true}
```

**Problem**: Pose detection is working, but session isn't started!

## ✅ **Step-by-Step Solution**

### **Step 1: Start Camera**
1. Click **"Start Camera"** button
2. Allow camera permissions when prompted
3. Verify camera feed appears
4. Check console for: `✅ MediaPipe pose detection initialized`

### **Step 2: Select Exercise**
1. **Open the exercise dropdown** (should show available exercises)
2. **Select an exercise** (e.g., "bicep_curl", "push_up", "squat")
3. Verify `selectedExercise` is no longer empty

### **Step 3: Start Session**
1. **Click "Start Session"** button
2. Check console for:
   ```
   ✅ Exercise session started: [exercise_name]
   📊 Pose detection will now send real joint angles to backend for ML prediction
   ```

### **Step 4: Verify Data Flow**
After starting session, you should see:
```
🎯 Session is running, calculating joint angles...
📐 Calculated joint angles: {leftShoulder: ..., rightShoulder: ..., ...}
🎯 Sending angles to backend: Shoulder=120.0°, Elbow=90.0°, Hip=170.0°, Knee=175.0°
📡 Sending prediction to backend...
📊 Prediction: [exercise] (85.2%) - Reps: 1
```

## 🧪 **Test Mode (Recommended for Testing)**

### **Enable Test Mode:**
1. **Check the "Test Mode" checkbox**
2. This will automatically send mock predictions every 1 second
3. No need to perform actual exercises
4. Perfect for testing the full flow

### **Test Mode Benefits:**
- ✅ **Automatic predictions** every 1 second
- ✅ **No camera required** for testing
- ✅ **Realistic mock data** for all exercises
- ✅ **Full backend integration** testing

## 🎯 **Expected Flow After Session Start**

### **Real Mode (with camera):**
1. **Pose Detection**: MediaPipe detects your pose
2. **Joint Calculation**: Calculate 9 joint angles
3. **Backend Prediction**: Send to ML model
4. **Rep Counting**: Count repetitions automatically
5. **UI Updates**: Show current prediction and rep count

### **Test Mode (mock data):**
1. **Mock Generation**: Generate realistic pose data
2. **Joint Calculation**: Same as real mode
3. **Backend Prediction**: Same ML model
4. **Rep Counting**: Same counting logic
5. **UI Updates**: Same UI updates

## 🔧 **Troubleshooting**

### **If "Start Session" is disabled:**
- ✅ **Select an exercise** first
- ✅ **Start camera** first
- ✅ **Wait for pose detection** to be ready

### **If no exercises in dropdown:**
- ✅ **Check backend is running** (`python app.py`)
- ✅ **Check network connection** to backend
- ✅ **Refresh page** to reload exercises

### **If session starts but no predictions:**
- ✅ **Check backend logs** for errors
- ✅ **Verify MediaPipe is working** (pose overlay visible)
- ✅ **Try test mode** to isolate frontend/backend issues

## 📊 **Success Indicators**

### **✅ Session Started Successfully:**
```
✅ Exercise session started: bicep_curl
📊 Pose detection will now send real joint angles to backend for ML prediction
🎯 Session parameters updated successfully
```

### **✅ Data Being Sent:**
```
🎯 Session is running, calculating joint angles...
🎯 Sending angles to backend: Shoulder=120.0°, Elbow=90.0°, Hip=170.0°, Knee=175.0°
📡 Sending prediction to backend...
📊 Prediction: bicep_curl (85.2%) - Reps: 1
```

### **✅ Repetition Counting:**
```
🎉 Rep completed! Total: 1
🎉 Rep completed! Total: 2
🎉 Rep completed! Total: 3
```

## 🚀 **Quick Test Steps**

1. **Start backend**: `cd backend && python app.py`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Open browser**: Go to `http://localhost:3000`
4. **Start camera**: Click "Start Camera"
5. **Select exercise**: Choose "bicep_curl" from dropdown
6. **Enable test mode**: Check "Test Mode" checkbox
7. **Start session**: Click "Start Session"
8. **Watch repetition counting**: Should see reps increasing every few seconds

## 🎉 **Expected Result**

After following these steps, you should see:
- ✅ **Session running** with selected exercise
- ✅ **Real-time predictions** being sent to backend
- ✅ **Repetition counting** working automatically
- ✅ **No more "Not sending to backend" messages**

The key is that **pose detection alone doesn't send data** - you need an **active session** with a **selected exercise**! 🎯 