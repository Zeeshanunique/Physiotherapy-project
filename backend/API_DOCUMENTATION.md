# Physiotherapy Exercise Monitoring Backend API

## Overview
This backend provides AI-powered exercise monitoring and form analysis for physiotherapy applications.

## Base URL
```
http://localhost:5000
```

## Authentication
Currently no authentication required (for development).

## Endpoints

### Health Check
**GET** `/health`

Returns system health status and configuration.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-10T10:30:00",
  "ml_framework": "keras",
  "model_loaded": true,
  "encoder_loaded": true,
  "available_exercises": ["squats", "push_ups", "lunges", ...],
  "config": {
    "confidence_threshold": 0.7,
    "phase_threshold": 0.7,
    "debug_mode": true
  },
  "session_state": {
    "current_phase": "down",
    "rep_count": 0
  }
}
```

### Get Available Exercises
**GET** `/exercises`

Returns list of exercises the AI model can recognize.

**Response:**
```json
{
  "exercises": ["squats", "bicep_curls", "push_ups", "lunges", ...]
}
```

### Exercise Prediction
**POST** `/predict`

Analyzes pose data and predicts exercise type, phase, and counts repetitions.

**Request Body:**
```json
{
  "joint_angles": [120.5, 115.0, 90.0, 95.0, 140.0, 142.0, 160.0, 158.0, 175.0],
  "selected_exercise": "squats"  // optional
}
```

**Parameters:**
- `joint_angles` (required): Array of 9 joint angles in degrees
  - [0]: Left shoulder angle
  - [1]: Right shoulder angle  
  - [2]: Left elbow angle
  - [3]: Right elbow angle
  - [4]: Left hip angle
  - [5]: Right hip angle
  - [6]: Left knee angle
  - [7]: Right knee angle
  - [8]: Spine angle
- `selected_exercise` (optional): Expected exercise type for improved accuracy

**Response:**
```json
{
  "exercise": "squats",
  "confidence": 0.89,
  "phase": "down",
  "rep_count": 5,
  "joint_angles": [120.5, 115.0, ...],
  "timestamp": "2025-07-10T10:30:00",
  "exercise_match": true,
  "selected_exercise": "squats",
  "quality_score": 0.85,
  "ml_framework": "keras",
  "all_predictions": [0.1, 0.89, 0.01, ...]
}
```

### Reset Exercise Session
**POST** `/reset_session`

Resets the current exercise session (rep count, phase, etc.).

**Request Body (optional):**
```json
{
  "phase_threshold": 0.8  // optional: custom threshold
}
```

**Response:**
```json
{
  "message": "Session reset successfully",
  "new_state": {
    "current_phase": "down",
    "rep_count": 0,
    "last_prediction": null,
    "phase_threshold": 0.7
  },
  "timestamp": "2025-07-10T10:30:00"
}
```

### Log Exercise Session
**POST** `/log_session`

Logs completed exercise session data.

**Request Body:**
```json
{
  "user_id": "user123",
  "exercise": "squats",
  "total_reps": 15,
  "duration": 120,  // seconds
  "session_data": []  // optional: detailed session data
}
```

**Response:**
```json
{
  "message": "Session logged successfully",
  "session_id": 42
}
```

### Get User Sessions
**GET** `/sessions/{user_id}`

Retrieves all exercise sessions for a specific user.

**Response:**
```json
{
  "user_id": "user123",
  "sessions": [...],
  "summary": {
    "total_sessions": 10,
    "total_reps": 150,
    "total_duration": 1200,
    "exercise_breakdown": {
      "squats": {
        "sessions": 5,
        "total_reps": 75,
        "total_duration": 600
      }
    }
  }
}
```

### Get All Sessions (Admin)
**GET** `/sessions`

Retrieves all exercise sessions (for debugging/admin).

### Test Exercise (New!)
**POST** `/test_exercise/{exercise_name}`

Test endpoint for specific exercises with sample or custom data.

**Parameters:**
- `exercise_name` (path): Name of exercise to test (e.g., "high_knees", "butt_kicks", "wall_sits")

**Request Body (optional):**
```json
{
  "joint_angles": [130, 128, 140, 142, 110, 108, 45, 47, 178]
}
```

**Response:** Same format as `/predict` endpoint

**Example:**
```bash
curl -X POST http://localhost:5000/test_exercise/high_knees \
  -H "Content-Type: application/json" \
  -d '{"joint_angles": [120, 118, 150, 152, 100, 98, 60, 58, 175]}'
```

## Enhanced Exercise Support

**NEW EXERCISES ADDED:**
1. **High Knees** (`high_knees`)
   - Cardio exercise focusing on bringing knees up high
   - Phase detection: Down = knees lowered, Up = knees raised high
   - Form tips: Bring knees towards chest, maintain upright posture

2. **Butt Kicks** (`butt_kicks`) 
   - Cardio exercise kicking heels toward glutes
   - Phase detection: Down = legs extended, Up = heels to glutes
   - Form tips: Keep torso upright, kick heels back towards glutes

3. **Wall Sits** (`wall_sits`)
   - Isometric leg strengthening exercise
   - Phase detection: Hold = proper 90-degree position, Rest = standing
   - Form tips: Maintain 90-degree knee angle, back flat against wall

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid input)
- `500`: Internal Server Error

**Error Response Format:**
```json
{
  "error": "Error description",
  "timestamp": "2025-07-10T10:30:00"
}
```

## Joint Angles Specification

The `joint_angles` array should contain 9 angles calculated from MediaPipe pose landmarks:

1. **Left Shoulder Angle**: Shoulder-Elbow-Wrist angle
2. **Right Shoulder Angle**: Shoulder-Elbow-Wrist angle
3. **Left Elbow Angle**: Shoulder-Elbow-Wrist angle  
4. **Right Elbow Angle**: Shoulder-Elbow-Wrist angle
5. **Left Hip Angle**: Shoulder-Hip-Knee angle
6. **Right Hip Angle**: Shoulder-Hip-Knee angle
7. **Left Knee Angle**: Hip-Knee-Ankle angle
8. **Right Knee Angle**: Hip-Knee-Ankle angle
9. **Spine Angle**: Torso inclination angle

All angles should be in degrees (0-180).

## Configuration

The backend can be configured using environment variables or a `.env` file:

```bash
FLASK_DEBUG=True
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
MODEL_PATH=model/bilstm_exercise_classifier.h5
ENCODER_PATH=model/label_encoder.pkl
CONFIDENCE_THRESHOLD=0.7
PHASE_THRESHOLD=0.7
```

## Development

### Starting the Server
```bash
# Method 1: Using the enhanced runner
python run.py

# Method 2: Direct Flask
python app.py
```

### Testing
```bash
# Health check
curl http://localhost:5000/health

# Get exercises
curl http://localhost:5000/exercises

# Predict exercise
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"joint_angles": [120, 115, 90, 95, 140, 142, 160, 158, 175]}'
```
