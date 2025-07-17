import os
import pickle
import numpy as np
from datetime import datetime
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ML Framework imports - Using OpenCV + scikit-learn approach
try:
    import cv2
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, classification_report
    import joblib
    ML_FRAMEWORK = "opencv-sklearn"
    print(f"✅ OpenCV {cv2.__version__} and scikit-learn loaded successfully")
except ImportError as e:
    print(f"❌ OpenCV or scikit-learn not available: {e}")
    print("🔄 Running in compatibility mode without ML predictions")
    ML_FRAMEWORK = None
    
    # Mock classes for compatibility
    class MockModel:
        def predict(self, data):
            # Return mock predictions for compatibility
            num_classes = 22
            predictions = np.random.random(num_classes)
            predictions = predictions / np.sum(predictions)
            return np.array([predictions])
        
        def predict_proba(self, data):
            return self.predict(data)
        
        def fit(self, X, y):
            pass
    
    class MockScaler:
        def fit_transform(self, data):
            return data
        def transform(self, data):
            return data

app = Flask(__name__)

# Configure CORS with explicit settings for frontend communication
CORS(app, 
     origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Allow frontend origins
     allow_headers=["Content-Type", "Authorization"],             # Allow these headers
     methods=["GET", "POST", "OPTIONS"],                         # Allow these methods
     supports_credentials=True                                   # Allow credentials
)

# Configuration
CONFIG = {
    'MODEL_PATH': os.getenv('MODEL_PATH', 'model/exercise_classifier_rf.pkl'),
    'SCALER_PATH': os.getenv('SCALER_PATH', 'model/feature_scaler.pkl'),
    'ENCODER_PATH': os.getenv('ENCODER_PATH', 'model/label_encoder.pkl'),
    'DEBUG': os.getenv('FLASK_DEBUG', 'True').lower() == 'true',
    'HOST': os.getenv('FLASK_HOST', '0.0.0.0'),
    'PORT': int(os.getenv('FLASK_PORT', 5000)),
    'CONFIDENCE_THRESHOLD': float(os.getenv('CONFIDENCE_THRESHOLD', 0.65)),
    'PHASE_THRESHOLD': float(os.getenv('PHASE_THRESHOLD', 0.65))
}

# Global variables for model, scaler and encoder
model = None
scaler = None
label_encoder = None
exercise_sessions = []  # In-memory storage for demo (use database in production)

# Exercise phase tracking
current_exercise_state = {
    'current_phase': 'down',  # 'up' or 'down'
    'rep_count': 0,
    'last_prediction': None,
    'phase_threshold': CONFIG['PHASE_THRESHOLD']  # Confidence threshold for phase detection
}

def create_exercise_features(joint_angles):
    """
    Create comprehensive feature vector from joint angles for ML classification
    This replaces the TensorFlow model with traditional ML feature engineering
    """
    if len(joint_angles) < 9:
        # Pad with average angles if insufficient data
        avg_angle = np.mean(joint_angles) if joint_angles else 90.0
        joint_angles = joint_angles + [avg_angle] * (9 - len(joint_angles))
    
    joint_angles = np.array(joint_angles[:9], dtype=np.float32)
    
    # Feature engineering for exercise classification
    features = []
    
    # 1. Raw joint angles (9 features)
    features.extend(joint_angles)
    
    # 2. Normalized angles (9 features)
    features.extend(joint_angles / 180.0)
    
    # 3. Trigonometric features (18 features)
    features.extend(np.sin(np.radians(joint_angles)))
    features.extend(np.cos(np.radians(joint_angles)))
    
    # 4. Joint differences (8 features)
    for i in range(8):
        features.append(abs(joint_angles[i] - joint_angles[i+1]))
    
    # 5. Joint ratios (8 features)
    for i in range(8):
        if joint_angles[i+1] != 0:
            features.append(joint_angles[i] / joint_angles[i+1])
        else:
            features.append(0.0)
    
    # 6. Statistical features (5 features)
    features.extend([
        np.mean(joint_angles),
        np.std(joint_angles),
        np.min(joint_angles),
        np.max(joint_angles),
        np.median(joint_angles)
    ])
    
    # 7. Exercise-specific features (15 features)
    # Upper body indicators
    shoulder_avg = (joint_angles[0] + joint_angles[1]) / 2
    elbow_avg = (joint_angles[2] + joint_angles[3]) / 2
    features.extend([
        shoulder_avg,  # Shoulder position
        elbow_avg,     # Elbow position
        abs(joint_angles[0] - joint_angles[1]),  # Shoulder symmetry
        abs(joint_angles[2] - joint_angles[3]),  # Elbow symmetry
    ])
    
    # Lower body indicators
    hip_avg = (joint_angles[4] + joint_angles[5]) / 2
    knee_avg = (joint_angles[6] + joint_angles[7]) / 2
    features.extend([
        hip_avg,       # Hip position
        knee_avg,      # Knee position
        abs(joint_angles[4] - joint_angles[5]),  # Hip symmetry
        abs(joint_angles[6] - joint_angles[7]),  # Knee symmetry
    ])
    
    # Core stability indicator
    features.append(joint_angles[8])  # Torso angle
    
    # Compound movement indicators
    features.extend([
        shoulder_avg + elbow_avg,  # Upper body compound
        hip_avg + knee_avg,        # Lower body compound
        abs(shoulder_avg - hip_avg),  # Upper-lower coordination
        np.sum(joint_angles),      # Total body activation
        np.std([shoulder_avg, elbow_avg, hip_avg, knee_avg])  # Movement variability
    ])
    
    # 8. Advanced biomechanical features (10 features)
    # Joint velocity approximations (using angle differences)
    features.extend([
        abs(joint_angles[0] - 90),  # Shoulder deviation from neutral
        abs(joint_angles[2] - 90),  # Elbow deviation from neutral
        abs(joint_angles[4] - 90),  # Hip deviation from neutral
        abs(joint_angles[6] - 90),  # Knee deviation from neutral
    ])
    
    # Movement patterns
    features.extend([
        max(joint_angles) - min(joint_angles),  # Range of motion
        np.sum(joint_angles > 90),              # Joints above neutral
        np.sum(joint_angles < 90),              # Joints below neutral
        np.sum(np.abs(joint_angles - 90) < 15), # Joints near neutral
        np.sum(np.abs(joint_angles - 180) < 30), # Extended joints
        np.sum(np.abs(joint_angles) < 30),      # Highly flexed joints
    ])
    
    return np.array(features, dtype=np.float32)

def train_exercise_classifier():
    """
    Train a Random Forest classifier on synthetic exercise data
    This replaces the BiLSTM model with a traditional ML approach
    """
    print("🤖 Training exercise classifier...")
    
    # Define exercise classes
    exercises = [
        'squat', 'push_up', 'bicep_curl', 'shoulder_press', 'deadlift',
        'lunge', 'plank', 'jumping_jack', 'tricep_dip', 'pull_up',
        'bench_press', 'lat_pulldown', 't_bar_row', 'leg_extension',
        'hip_thrust', 'leg_raises', 'russian_twist', 'chest_fly_machine',
        'high_knees', 'butt_kicks', 'wall_sits', 'burpees'
    ]
    
    # Generate synthetic training data based on exercise characteristics
    X_train = []
    y_train = []
    
    for exercise_idx, exercise in enumerate(exercises):
        for _ in range(100):  # 100 samples per exercise
            # Generate realistic joint angles for each exercise
            if exercise == 'squat':
                angles = [130+np.random.normal(0, 10), 132+np.random.normal(0, 10),  # shoulders
                         170+np.random.normal(0, 15), 168+np.random.normal(0, 15),   # elbows
                         100+np.random.normal(0, 20), 102+np.random.normal(0, 20),   # hips
                         90+np.random.normal(0, 25), 88+np.random.normal(0, 25),     # knees
                         175+np.random.normal(0, 5)]                                 # torso
            elif exercise == 'push_up':
                angles = [90+np.random.normal(0, 15), 88+np.random.normal(0, 15),    # shoulders
                         80+np.random.normal(0, 20), 82+np.random.normal(0, 20),     # elbows
                         160+np.random.normal(0, 10), 162+np.random.normal(0, 10),   # hips
                         170+np.random.normal(0, 10), 172+np.random.normal(0, 10),   # knees
                         175+np.random.normal(0, 5)]                                 # torso
            elif exercise == 'bicep_curl':
                angles = [120+np.random.normal(0, 10), 118+np.random.normal(0, 10),  # shoulders
                         60+np.random.normal(0, 30), 62+np.random.normal(0, 30),     # elbows (curled)
                         170+np.random.normal(0, 5), 172+np.random.normal(0, 5),     # hips
                         175+np.random.normal(0, 5), 173+np.random.normal(0, 5),     # knees
                         178+np.random.normal(0, 3)]                                 # torso
            elif exercise == 'high_knees':
                angles = [110+np.random.normal(0, 15), 112+np.random.normal(0, 15),  # shoulders
                         140+np.random.normal(0, 10), 142+np.random.normal(0, 10),   # elbows
                         90+np.random.normal(0, 20), 92+np.random.normal(0, 20),     # hips
                         45+np.random.normal(0, 20), 47+np.random.normal(0, 20),     # knees (high)
                         170+np.random.normal(0, 8)]                                 # torso
            elif exercise == 'wall_sits':
                angles = [140+np.random.normal(0, 5), 138+np.random.normal(0, 5),    # shoulders
                         160+np.random.normal(0, 8), 162+np.random.normal(0, 8),     # elbows
                         90+np.random.normal(0, 5), 88+np.random.normal(0, 5),       # hips (90 degrees)
                         90+np.random.normal(0, 5), 92+np.random.normal(0, 5),       # knees (90 degrees)
                         175+np.random.normal(0, 3)]                                 # torso
            else:
                # Default pattern with some randomness
                angles = [120+np.random.normal(0, 20), 118+np.random.normal(0, 20),
                         90+np.random.normal(0, 30), 92+np.random.normal(0, 30),
                         130+np.random.normal(0, 25), 132+np.random.normal(0, 25),
                         140+np.random.normal(0, 20), 138+np.random.normal(0, 20),
                         170+np.random.normal(0, 10)]
            
            # Ensure angles are within valid range
            angles = [max(0, min(180, angle)) for angle in angles]
            
            # Create features from angles
            features = create_exercise_features(angles)
            X_train.append(features)
            y_train.append(exercise)
    
    X_train = np.array(X_train)
    y_train = np.array(y_train)
    
    print(f"📊 Training data shape: {X_train.shape}")
    print(f"📝 Exercise classes: {len(set(y_train))}")
    
    # Create and train the model
    global model, scaler, label_encoder
    
    # Initialize components
    scaler = StandardScaler()
    label_encoder = LabelEncoder()
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        random_state=42,
        min_samples_split=5,
        min_samples_leaf=2
    )
    
    # Prepare data
    X_scaled = scaler.fit_transform(X_train)
    y_encoded = label_encoder.fit_transform(y_train)
    
    # Train model
    model.fit(X_scaled, y_encoded)
    
    # Evaluate on training data (in production, use separate test set)
    train_predictions = model.predict(X_scaled)
    train_accuracy = accuracy_score(y_encoded, train_predictions)
    
    print(f"✅ Model trained successfully!")
    print(f"📈 Training accuracy: {train_accuracy:.3f}")
    print(f"🎯 Available exercises: {list(label_encoder.classes_)}")
    
    # Save models
    try:
        os.makedirs('model', exist_ok=True)
        joblib.dump(model, CONFIG['MODEL_PATH'])
        joblib.dump(scaler, CONFIG['SCALER_PATH'])
        joblib.dump(label_encoder, CONFIG['ENCODER_PATH'])
        print(f"💾 Models saved successfully")
    except Exception as e:
        print(f"⚠️  Could not save models: {e}")
    
    return True

def load_models():
    """Load the Random Forest model, scaler, and label encoder"""
    global model, scaler, label_encoder
    
    try:
        if ML_FRAMEWORK == "opencv-sklearn":
            # Try to load existing models
            if (os.path.exists(CONFIG['MODEL_PATH']) and 
                os.path.exists(CONFIG['SCALER_PATH']) and 
                os.path.exists(CONFIG['ENCODER_PATH'])):
                
                model = joblib.load(CONFIG['MODEL_PATH'])
                scaler = joblib.load(CONFIG['SCALER_PATH'])
                label_encoder = joblib.load(CONFIG['ENCODER_PATH'])
                
                print(f"✅ Models loaded successfully from disk")
                print(f"📝 Available exercises: {list(label_encoder.classes_)}")
            else:
                print("📚 No existing models found, training new classifier...")
                return train_exercise_classifier()
        else:
            # Use mock models when ML framework is not available
            print("🔧 Using mock models (ML framework not available)")
            
            class MockLabelEncoder:
                def __init__(self):
                    self.classes_ = np.array([
                        'squat', 'push_up', 'bicep_curl', 'shoulder_press', 'deadlift',
                        'lunge', 'plank', 'jumping_jack', 'tricep_dip', 'pull_up',
                        'bench_press', 'lat_pulldown', 't_bar_row', 'leg_extension',
                        'hip_thrust', 'leg_raises', 'russian_twist', 'chest_fly_machine',
                        'high_knees', 'butt_kicks', 'wall_sits', 'burpees'
                    ])
                
                def inverse_transform(self, encoded):
                    if hasattr(encoded, '__iter__'):
                        return [self.classes_[i % len(self.classes_)] for i in encoded]
                    return self.classes_[encoded % len(self.classes_)]
            
            model = MockModel()
            scaler = MockScaler()
            label_encoder = MockLabelEncoder()
            print(f"🔧 Mock models created with exercises: {list(label_encoder.classes_)}")
        
    except Exception as e:
        print(f"❌ Error loading models: {str(e)}")
        return False
    return True

def detect_exercise_phase(joint_angles, predicted_exercise, selected_exercise=None):
    """
    Detect if the exercise is in 'up' or 'down' phase based on joint angles
    Enhanced version with better thresholds for the scikit-learn approach
    """
    global current_exercise_state
    
    # Get key joint angles with safety checks
    shoulder_angle = joint_angles[0] if len(joint_angles) > 0 else 90
    elbow_angle = joint_angles[2] if len(joint_angles) > 2 else 90
    hip_angle = joint_angles[4] if len(joint_angles) > 4 else 90
    knee_angle = joint_angles[6] if len(joint_angles) > 6 else 90
    
    # Debug logging
    print(f"🔍 DEBUG Phase Detection:")
    print(f"   Exercise: {predicted_exercise}")
    print(f"   Angles - Shoulder: {shoulder_angle:.1f}°, Elbow: {elbow_angle:.1f}°, Hip: {hip_angle:.1f}°, Knee: {knee_angle:.1f}°")
    
    # Phase detection logic for each exercise type
    exercise_lower = predicted_exercise.lower().replace('-', '_')
    
    # Squats
    if exercise_lower in ['squat']:
        if knee_angle < 110:
            new_phase = 'down'
        else:
            new_phase = 'up'
    
    # Push-ups
    elif exercise_lower in ['push_up']:
        if elbow_angle < 110:
            new_phase = 'down'
        else:
            new_phase = 'up'
    
    # Bicep curls
    elif exercise_lower in ['bicep_curl']:
        if elbow_angle < 100:
            new_phase = 'up'  # Curled position
        else:
            new_phase = 'down'  # Extended position
    
    # High knees
    elif exercise_lower in ['high_knees']:
        if knee_angle < 100:
            new_phase = 'up'  # Knee raised
        else:
            new_phase = 'down'  # Knee lowered
    
    # Wall sits (isometric)
    elif exercise_lower in ['wall_sits', 'wall_sit']:
        if knee_angle < 110 and knee_angle > 70:
            new_phase = 'hold'
        else:
            new_phase = 'rest'
    
    # Butt kicks
    elif exercise_lower in ['butt_kicks', 'butt_kick']:
        if knee_angle < 120:
            new_phase = 'up'  # Heel to glute
        else:
            new_phase = 'down'  # Extended
    
    # Default
    else:
        if shoulder_angle < 100 or elbow_angle < 100:
            new_phase = 'down'
        else:
            new_phase = 'up'
    
    # Count reps on phase transitions
    old_phase = current_exercise_state['current_phase']
    old_rep_count = current_exercise_state['rep_count']
    
    if new_phase not in ['hold', 'rest'] and current_exercise_state['current_phase'] != new_phase:
        if current_exercise_state['current_phase'] == 'down' and new_phase == 'up':
            current_exercise_state['rep_count'] += 1
            print(f"   🔥 REP COMPLETED! {old_rep_count} → {current_exercise_state['rep_count']}")
        current_exercise_state['current_phase'] = new_phase
        print(f"   📈 Phase transition: {old_phase} → {new_phase}")
    elif new_phase in ['hold', 'rest']:
        if current_exercise_state['current_phase'] != new_phase:
            if new_phase == 'hold':
                current_exercise_state['rep_count'] += 1
                print(f"   🔥 HOLD COMPLETED! {old_rep_count} → {current_exercise_state['rep_count']}")
        current_exercise_state['current_phase'] = new_phase
        print(f"   📈 Phase change: {old_phase} → {new_phase}")
    else:
        print(f"   ➡️  Phase maintained: {new_phase}")
    
    print(f"   🎯 Final: Phase={new_phase}, Reps={current_exercise_state['rep_count']}")
    
    return new_phase

@app.route('/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint with detailed system information"""
    try:
        system_info = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'ml_framework': ML_FRAMEWORK,
            'model_loaded': model is not None,
            'scaler_loaded': scaler is not None,
            'encoder_loaded': label_encoder is not None,
            'available_exercises': list(label_encoder.classes_) if label_encoder else [],
            'config': {
                'confidence_threshold': CONFIG['CONFIDENCE_THRESHOLD'],
                'phase_threshold': CONFIG['PHASE_THRESHOLD'],
                'debug_mode': CONFIG['DEBUG']
            },
            'session_state': {
                'current_phase': current_exercise_state['current_phase'],
                'rep_count': current_exercise_state['rep_count']
            }
        }
        
        # Add ML framework version if available
        if ML_FRAMEWORK == "opencv-sklearn":
            import cv2, sklearn
            system_info['opencv_version'] = cv2.__version__
            system_info['sklearn_version'] = sklearn.__version__
        else:
            system_info['ml_version'] = "mock"
            
        return jsonify(system_info)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/exercises', methods=['GET'])
def get_exercises():
    """Get list of available exercises from label encoder"""
    if label_encoder is None:
        return jsonify({'error': 'Label encoder not loaded'}), 500
    
    return jsonify({
        'exercises': list(label_encoder.classes_)
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict exercise from joint angles using Random Forest"""
    try:
        # Validate request content type
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        joint_angles = data.get('joint_angles', [])
        selected_exercise = data.get('selected_exercise', None)
        
        # Enhanced input validation
        if not joint_angles:
            return jsonify({'error': 'Missing joint_angles in request'}), 400
            
        if not isinstance(joint_angles, list):
            return jsonify({'error': 'joint_angles must be a list'}), 400
            
        if len(joint_angles) < 9:
            return jsonify({'error': f'Insufficient joint angles: got {len(joint_angles)}, need at least 9'}), 400
        
        # Validate angle values
        try:
            joint_angles = [float(angle) for angle in joint_angles[:9]]  # Take first 9 and convert to float
        except (ValueError, TypeError):
            return jsonify({'error': 'All joint angles must be numeric values'}), 400
            
        # Enhanced pose quality validation
        zero_count = sum(1 for angle in joint_angles if abs(angle) < 5.0)
        quality_score = (9 - zero_count) / 9
        
        if zero_count > 6:
            return jsonify({
                'exercise': 'unknown',
                'confidence': 0.0,
                'phase': 'unknown',
                'rep_count': current_exercise_state['rep_count'],
                'joint_angles': joint_angles,
                'timestamp': datetime.now().isoformat(),
                'error': 'Poor pose detection - please ensure you are fully visible in the camera',
                'quality_score': quality_score
            })
        
        # Create features from joint angles
        features = create_exercise_features(joint_angles)
        
        # Scale features
        if ML_FRAMEWORK == "opencv-sklearn":
            features_scaled = scaler.transform(features.reshape(1, -1))
            
            # Get prediction probabilities
            probabilities = model.predict_proba(features_scaled)[0]
            predicted_class_idx = np.argmax(probabilities)
            confidence = float(probabilities[predicted_class_idx])
        else:
            # Mock prediction
            probabilities = np.random.random(len(label_encoder.classes_))
            probabilities = probabilities / np.sum(probabilities)
            predicted_class_idx = np.argmax(probabilities)
            confidence = float(probabilities[predicted_class_idx])
        
        # Get exercise name
        predicted_exercise = label_encoder.inverse_transform([predicted_class_idx])[0]
        
        # Exercise matching logic
        exercise_match = False
        if selected_exercise:
            exercise_match = (
                predicted_exercise.lower().replace('_', ' ') == selected_exercise.lower().replace('_', ' ') 
                and confidence >= CONFIG['CONFIDENCE_THRESHOLD'] * 0.6  # Lowered threshold
            )
        else:
            exercise_match = confidence >= CONFIG['CONFIDENCE_THRESHOLD'] * 0.6  # Lowered threshold
        
        # Phase detection - Allow phase detection even with lower confidence for better rep counting
        phase = 'unknown'
        if quality_score > 0.4:  # Lowered quality threshold
            # Always detect phase for selected exercise, even with lower confidence
            if selected_exercise and predicted_exercise.lower().replace('_', ' ') == selected_exercise.lower().replace('_', ' '):
                phase = detect_exercise_phase(joint_angles, predicted_exercise, selected_exercise)
            elif confidence >= CONFIG['CONFIDENCE_THRESHOLD'] * 0.4:  # Much lower threshold for phase detection
                phase = detect_exercise_phase(joint_angles, predicted_exercise, selected_exercise)
        
        return jsonify({
            'exercise': predicted_exercise,
            'confidence': confidence,
            'phase': phase,
            'rep_count': current_exercise_state['rep_count'],
            'joint_angles': joint_angles,
            'timestamp': datetime.now().isoformat(),
            'exercise_match': exercise_match,
            'selected_exercise': selected_exercise,
            'quality_score': quality_score,
            'ml_framework': ML_FRAMEWORK,
            'all_predictions': probabilities.tolist() if hasattr(probabilities, 'tolist') else []
        })
        
    except Exception as e:
        print(f"❌ Prediction endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/reset_session', methods=['POST'])
def reset_session():
    """Reset the current exercise session"""
    global current_exercise_state
    
    try:
        data = request.get_json() if request.is_json else {}
        phase_threshold = data.get('phase_threshold', CONFIG['PHASE_THRESHOLD'])
        
        current_exercise_state = {
            'current_phase': 'down',
            'rep_count': 0,
            'last_prediction': None,
            'phase_threshold': phase_threshold
        }
        
        return jsonify({
            'message': 'Session reset successfully',
            'new_state': current_exercise_state,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to reset session: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/log_session', methods=['POST'])
def log_session():
    """Log exercise session data"""
    try:
        data = request.get_json()
        
        required_fields = ['user_id', 'exercise', 'total_reps', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        session_entry = {
            'user_id': data['user_id'],
            'exercise': data['exercise'],
            'total_reps': data['total_reps'],
            'duration': data['duration'],  # in seconds
            'timestamp': datetime.now().isoformat(),
            'session_data': data.get('session_data', [])
        }
        
        # Store session (in production, save to database)
        exercise_sessions.append(session_entry)
        
        return jsonify({
            'message': 'Session logged successfully',
            'session_id': len(exercise_sessions) - 1
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to log session: {str(e)}'}), 500

@app.route('/sessions/<user_id>', methods=['GET'])
def get_user_sessions(user_id):
    """Get all sessions for a specific user"""
    user_sessions = [session for session in exercise_sessions if session['user_id'] == user_id]
    
    total_sessions = len(user_sessions)
    total_reps = sum(session['total_reps'] for session in user_sessions)
    total_duration = sum(session['duration'] for session in user_sessions)
    
    exercise_stats = {}
    for session in user_sessions:
        exercise = session['exercise']
        if exercise not in exercise_stats:
            exercise_stats[exercise] = {'sessions': 0, 'total_reps': 0, 'total_duration': 0}
        exercise_stats[exercise]['sessions'] += 1
        exercise_stats[exercise]['total_reps'] += session['total_reps']
        exercise_stats[exercise]['total_duration'] += session['duration']
    
    return jsonify({
        'user_id': user_id,
        'sessions': user_sessions,
        'summary': {
            'total_sessions': total_sessions,
            'total_reps': total_reps,
            'total_duration': total_duration,
            'exercise_breakdown': exercise_stats
        }
    })

@app.route('/sessions', methods=['GET'])
def get_all_sessions():
    """Get all sessions (for admin/debugging)"""
    return jsonify({'sessions': exercise_sessions})

@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Retrain the model with fresh data"""
    try:
        print("🔄 Retraining exercise classifier...")
        success = train_exercise_classifier()
        if success:
            return jsonify({
                'message': 'Model retrained successfully',
                'timestamp': datetime.now().isoformat(),
                'available_exercises': list(label_encoder.classes_)
            })
        else:
            return jsonify({'error': 'Failed to retrain model'}), 500
    except Exception as e:
        return jsonify({'error': f'Retraining failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting Physiotherapy Exercise Monitoring Backend (OpenCV + scikit-learn)...")
    print(f"🔧 Configuration:")
    print(f"   - ML Framework: {ML_FRAMEWORK}")
    print(f"   - Debug Mode: {CONFIG['DEBUG']}")
    print(f"   - Host: {CONFIG['HOST']}")
    print(f"   - Port: {CONFIG['PORT']}")
    print(f"   - Model Path: {CONFIG['MODEL_PATH']}")
    print(f"   - Scaler Path: {CONFIG['SCALER_PATH']}")
    print(f"   - Encoder Path: {CONFIG['ENCODER_PATH']}")
    print(f"   - Confidence Threshold: {CONFIG['CONFIDENCE_THRESHOLD']}")
    print(f"   - Phase Threshold: {CONFIG['PHASE_THRESHOLD']}")
    
    # Load models on startup
    if load_models():
        print("✅ Models loaded successfully. Starting Flask server...")
        try:
            app.run(
                debug=CONFIG['DEBUG'], 
                host=CONFIG['HOST'], 
                port=CONFIG['PORT']
            )
        except KeyboardInterrupt:
            print("\n👋 Server stopped by user")
        except Exception as e:
            print(f"❌ Server startup error: {e}")
    else:
        print("❌ Failed to load models. Please check configuration.")
        print("🔧 You can still test the API endpoints, but predictions will use mock data.")
