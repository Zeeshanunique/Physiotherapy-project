import os
import pickle
import numpy as np
from datetime import datetime
import json
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

# Load environment variables
load_dotenv()

# ML Framework imports with OpenCV and scikit-learn
try:
    import cv2
    import sklearn
    ML_FRAMEWORK = "opencv_sklearn"
    print(f"✅ OpenCV {cv2.__version__} loaded successfully")
    print(f"✅ scikit-learn {sklearn.__version__} loaded successfully")
except ImportError as e:
    print(f"❌ OpenCV or scikit-learn not available: {e}")
    print("🔄 Running in compatibility mode without ML predictions")
    ML_FRAMEWORK = None
    
    # Mock classes for compatibility
    class MockModel:
        def predict(self, data):
            # Return mock predictions for compatibility with proper shape
            # Simulate predictions for 22 exercises (19 original + 3 new)
            num_classes = 22
            predictions = np.random.random(num_classes)
            # Normalize to make it look like softmax output
            predictions = predictions / np.sum(predictions)
            return np.array([predictions])
        
        def predict_proba(self, data):
            return self.predict(data)
        
        def score(self, X, y):
            return 0.85  # Mock accuracy score

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
    'MODEL_PATH': os.getenv('MODEL_PATH', 'model/exercise_classifier.joblib'),
    'SCALER_PATH': os.getenv('SCALER_PATH', 'model/feature_scaler.joblib'),
    'ENCODER_PATH': os.getenv('ENCODER_PATH', 'model/label_encoder.pkl'),
    'DEBUG': os.getenv('FLASK_DEBUG', 'True').lower() == 'true',
    'HOST': os.getenv('FLASK_HOST', '0.0.0.0'),
    'PORT': int(os.getenv('FLASK_PORT', 5000)),
    'CONFIDENCE_THRESHOLD': float(os.getenv('CONFIDENCE_THRESHOLD', 0.7)),
    'PHASE_THRESHOLD': float(os.getenv('PHASE_THRESHOLD', 0.7))
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

def load_models():
    """Load the scikit-learn model, scaler and label encoder with improved error handling"""
    global model, scaler, label_encoder
    
    try:
        if ML_FRAMEWORK == "opencv_sklearn":
            # Load the trained scikit-learn model
            model_path = CONFIG['MODEL_PATH']
            if os.path.exists(model_path):
                model = joblib.load(model_path)
                print(f"✅ Scikit-learn model loaded successfully from {model_path}")
                print(f"📋 Model type: {type(model).__name__}")
            else:
                print(f"⚠️  Model file not found: {model_path}")
                print("🔧 Creating fallback Random Forest model...")
                model = create_fallback_model()
            
            # Load the feature scaler
            scaler_path = CONFIG['SCALER_PATH']
            if os.path.exists(scaler_path):
                scaler = joblib.load(scaler_path)
                print(f"✅ Feature scaler loaded successfully from {scaler_path}")
            else:
                print(f"⚠️  Scaler file not found: {scaler_path}")
                print("🔧 Creating fallback scaler...")
                scaler = StandardScaler()
                # Fit with dummy data to make it functional
                dummy_data = np.random.randn(100, 45)  # 45 features from joint angles
                scaler.fit(dummy_data)
        else:
            # Use mock model when ML framework is not available
            model = create_fallback_model()
            scaler = StandardScaler()
            dummy_data = np.random.randn(100, 45)
            scaler.fit(dummy_data)
            print("🔧 Mock model and scaler created (ML framework not available)")
        
        # Load the label encoder
        encoder_path = CONFIG['ENCODER_PATH']
        if os.path.exists(encoder_path):
            with open(encoder_path, 'rb') as f:
                label_encoder = pickle.load(f)
            print(f"✅ Label encoder loaded successfully from {encoder_path}")
            print(f"📝 Available exercises: {list(label_encoder.classes_)}")
        else:
            print(f"⚠️  Encoder file not found: {encoder_path}")
            print("🔧 Creating fallback label encoder...")
            label_encoder = create_fallback_label_encoder()
        
    except Exception as e:
        print(f"❌ Error loading models: {str(e)}")
        print("🔧 Creating fallback components...")
        model = create_fallback_model()
        scaler = StandardScaler()
        dummy_data = np.random.randn(100, 45)
        scaler.fit(dummy_data)
        label_encoder = create_fallback_label_encoder()
        return False
    return True

def create_fallback_model():
    """Create a fallback Random Forest model for exercise classification"""
    from sklearn.ensemble import RandomForestClassifier
    
    # Create a Random Forest classifier with good default parameters
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced'
    )
    
    # Train with dummy data to make it functional
    n_samples = 1000
    n_features = 45  # Features from joint angles
    n_classes = 22   # Number of exercises
    
    X_dummy = np.random.randn(n_samples, n_features)
    y_dummy = np.random.randint(0, n_classes, n_samples)
    
    model.fit(X_dummy, y_dummy)
    print("🔧 Fallback Random Forest model created and trained with dummy data")
    
    return model

def create_fallback_label_encoder():
    """Create a fallback label encoder with enhanced exercises"""
    class MockLabelEncoder:
        def __init__(self):
            self.classes_ = np.array([
                # Original exercises
                'squats', 'bicep_curls', 'push_ups', 'lunges', 
                'deadlifts', 'shoulder_press', 'planks', 'jumping_jacks',
                # Additional common exercises 
                'bench_press', 'pull_ups', 'burpees', 'mountain_climbers',
                'dips', 'overhead_press', 'rows', 'calf_raises',
                # NEW: Additional exercises
                'high_knees', 'butt_kicks', 'wall_sits', 'tricep_dips',
                'lat_pulldown', 'hip_thrust'
            ])
        
        def inverse_transform(self, encoded):
            if hasattr(encoded, '__iter__'):
                return [self.classes_[i % len(self.classes_)] for i in encoded]
            return self.classes_[encoded % len(self.classes_)]
        
        def transform(self, labels):
            """Transform exercise names to indices"""
            if hasattr(labels, '__iter__') and not isinstance(labels, str):
                return [np.where(self.classes_ == label)[0][0] if label in self.classes_ else 0 for label in labels]
            return np.where(self.classes_ == labels)[0][0] if labels in self.classes_ else 0
    
    encoder = MockLabelEncoder()
    print(f"🔧 Fallback label encoder created with exercises: {list(encoder.classes_)}")
    return encoder

def detect_exercise_phase(joint_angles, predicted_exercise, selected_exercise=None):
    """
    Detect if the exercise is in 'up' or 'down' phase based on joint angles
    Updated for the actual trained exercises
    Only counts reps if exercise matches selection
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
    
    # Upper body pressing exercises - ADJUSTED THRESHOLDS
    if exercise_lower in ['bench_press', 'incline_bench_press', 'decline_bench_press', 'push_up']:
        # Down = arms bent (lower angle), Up = arms extended (higher angle)
        threshold = 120  # CHANGED: More realistic threshold for pressing exercises
        if elbow_angle < threshold:  
            new_phase = 'down'
        else:  # Arms extended - up position
            new_phase = 'up'
        print(f"   🔧 Pressing exercise logic: elbow_angle {elbow_angle:.1f}° < {threshold}° = {elbow_angle < threshold} → {new_phase}")
    
    # Bicep/Arm curl exercises - ADJUSTED
    elif exercise_lower in ['barbell_biceps_curl', 'hammer_curl']:
        # Down = arms extended (lower elbow angle), Up = arms curled (higher elbow angle)
        if elbow_angle < 120:  # CHANGED: from 90 to 120
            new_phase = 'down'
        else:  # Arms curled - up position
            new_phase = 'up'
    
    # Tricep exercises - ADJUSTED
    elif exercise_lower in ['tricep_dips', 'tricep_pushdown']:
        # Down = arms bent, Up = arms extended
        if elbow_angle < 100:  # CHANGED: from 60 to 100
            new_phase = 'down'
        else:  # Arms extended - up position
            new_phase = 'up'
    
    # Shoulder exercises - ADJUSTED
    elif exercise_lower in ['shoulder_press', 'lateral_raise']:
        # Down = arms lowered, Up = arms raised
        if shoulder_angle < 100:  # CHANGED: from 70 to 100
            new_phase = 'down'
        else:  # Arms raised - up position
            new_phase = 'up'
    
    # Leg exercises - squats - ADJUSTED
    elif exercise_lower in ['squat']:
        # Down = knees bent (lower knee angle), Up = legs extended (higher knee angle)
        if knee_angle < 120:  # CHANGED: from 90 to 120
            new_phase = 'down'
        else:  # Legs extended - up position
            new_phase = 'up'
    
    # Deadlift variations
    elif exercise_lower in ['deadlift', 'romanian_deadlift']:
        # Down = bent forward (lower hip angle), Up = standing (higher hip angle)
        if hip_angle < 140:  # CHANGED: from 120 to 140
            new_phase = 'down'
        else:  # Standing - up position
            new_phase = 'up'
    
    # Leg extension - ADJUSTED
    elif exercise_lower in ['leg_extension']:
        # Down = knees bent, Up = legs extended
        if knee_angle < 120:  # CHANGED: from 90 to 120
            new_phase = 'down'
        else:  # Legs extended - up position
            new_phase = 'up'
    
    # Hip thrust - ADJUSTED
    elif exercise_lower in ['hip_thrust']:
        # Down = hips lowered, Up = hips raised
        if hip_angle < 110:  # CHANGED: from 90 to 110
            new_phase = 'down'
        else:  # Hips raised - up position
            new_phase = 'up'
    
    # Pulling exercises (pull-ups, lat pulldown, t-bar row) - ADJUSTED
    elif exercise_lower in ['pull_up', 'lat_pulldown', 't_bar_row']:
        # Down = arms extended, Up = arms pulled
        if elbow_angle > 140:  # CHANGED: from 120 to 140
            new_phase = 'down'
        else:  # Arms pulled - up position
            new_phase = 'up'
    
    # Core exercises (leg raises, russian twist)
    elif exercise_lower in ['leg_raises']:
        # Down = legs lowered, Up = legs raised
        if hip_angle < 110:  # CHANGED: from 90 to 110
            new_phase = 'down'
        else:  # Legs raised - up position
            new_phase = 'up'
    
    elif exercise_lower in ['russian_twist']:
        # Use shoulder angle to detect rotation
        if shoulder_angle < 85:  # CHANGED: from 70 to 85
            new_phase = 'down'
        else:  # Center or other side - up
            new_phase = 'up'
    
    # Isometric exercises (plank)
    elif exercise_lower in ['plank']:
        # For plank, we maintain the phase and count based on time held
        new_phase = 'hold'
    
    # Machine exercises - ADJUSTED
    elif exercise_lower in ['chest_fly_machine']:
        # Down = arms wide, Up = arms together
        if shoulder_angle > 110:  # CHANGED: from 90 to 110
            new_phase = 'down'
        else:  # Arms together - up position
            new_phase = 'up'
    
    # NEW: High Knees exercise
    elif exercise_lower in ['high_knees']:
        # Down = knees lowered, Up = knees raised high
        if knee_angle > 130:  # Legs more extended = down phase
            new_phase = 'down'
        else:  # Knees bent high = up phase
            new_phase = 'up'
    
    # NEW: Butt Kicks exercise  
    elif exercise_lower in ['butt_kicks', 'butt_kick']:
        # Down = legs extended, Up = heels to glutes
        if knee_angle > 140:  # Legs extended = down phase
            new_phase = 'down'
        else:  # Heels kicked back = up phase
            new_phase = 'up'
    
    # NEW: Wall Sits exercise (isometric)
    elif exercise_lower in ['wall_sits', 'wall_sit']:
        # Isometric exercise - maintain hold position
        if knee_angle < 100:  # Proper wall sit position (90-degree angle)
            new_phase = 'hold'
        else:  # Standing or not in proper position
            new_phase = 'rest'
    
    else:
        # Default phase detection for unknown exercises - ADJUSTED
        if shoulder_angle < 100:  # CHANGED: from 90 to 100
            new_phase = 'down'
        else:
            new_phase = 'up'
    
    # Debug current state
    old_phase = current_exercise_state['current_phase']
    old_rep_count = current_exercise_state['rep_count']
    
    # Count reps on phase transitions (except for isometric exercises)
    if new_phase not in ['hold', 'rest'] and current_exercise_state['current_phase'] != new_phase:
        if current_exercise_state['current_phase'] == 'down' and new_phase == 'up':
            current_exercise_state['rep_count'] += 1
            print(f"   🔥 REP COMPLETED! {old_rep_count} → {current_exercise_state['rep_count']}")
        current_exercise_state['current_phase'] = new_phase
        print(f"   📈 Phase transition: {old_phase} → {new_phase}")
    elif new_phase in ['hold', 'rest']:
        # For isometric exercises, handle time-based or position-based counting
        if exercise_lower in ['wall_sits', 'wall_sit'] and new_phase == 'hold':
            # For wall sits, count time held in proper position
            if current_exercise_state['current_phase'] != 'hold':
                current_exercise_state['rep_count'] += 1
                print(f"   🔥 WALL SIT HOLD! {old_rep_count} → {current_exercise_state['rep_count']}")
        elif exercise_lower in ['plank'] and new_phase == 'hold':
            # For planks, count time held in proper position
            if current_exercise_state['current_phase'] != 'hold':
                current_exercise_state['rep_count'] += 1
                print(f"   🔥 PLANK HOLD! {old_rep_count} → {current_exercise_state['rep_count']}")
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
        if ML_FRAMEWORK == "opencv_sklearn":
            import cv2
            import sklearn
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
    """Predict exercise from joint angles with enhanced validation and error handling"""
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
        if zero_count > 6:
            return jsonify({
                'exercise': 'unknown',
                'confidence': 0.0,
                'phase': 'unknown',
                'rep_count': current_exercise_state['rep_count'],
                'joint_angles': joint_angles,
                'timestamp': datetime.now().isoformat(),
                'error': 'Poor pose detection - please ensure you are fully visible in the camera',
                'quality_score': (9 - zero_count) / 9  # Quality score from 0-1
            })
        
        # Use internal prediction function
        result = predict_internal(data)
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Prediction endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

def create_model_input(angles_array):
    """Create feature vector for scikit-learn model from joint angles"""
    # Enhanced feature engineering for traditional ML algorithms
    features = []
    
    # Raw joint angles (9 features)
    features.extend(angles_array)
    
    # Normalized angles (9 features)
    normalized = angles_array / 180.0
    features.extend(normalized)
    
    # Trigonometric features (18 features)
    features.extend(np.sin(np.radians(angles_array)))
    features.extend(np.cos(np.radians(angles_array)))
    
    # Statistical features (5 features)
    features.append(np.mean(angles_array))
    features.append(np.std(angles_array))
    features.append(np.min(angles_array))
    features.append(np.max(angles_array))
    features.append(np.median(angles_array))
    
    # Angle differences (4 features - relationships between adjacent angles)
    for i in range(4):
        if i * 2 + 1 < len(angles_array):
            features.append(abs(angles_array[i * 2] - angles_array[i * 2 + 1]))
    
    # Total features: 9 + 9 + 9 + 9 + 5 + 4 = 45 features
    return np.array(features).reshape(1, -1)

@app.route('/reset_session', methods=['POST'])
def reset_session():
    """Reset the current exercise session with optional configuration"""
    global current_exercise_state
    
    try:
        data = request.get_json() if request.is_json else {}
        
        # Allow custom phase threshold in reset
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
    """
    Log exercise session data
    Expected input: {
        'user_id': 'user123',
        'exercise': 'pushup',
        'total_reps': 10,
        'duration': 120,  # seconds
        'session_data': [...] # optional detailed data
    }
    """
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
    
    # Calculate summary statistics
    total_sessions = len(user_sessions)
    total_reps = sum(session['total_reps'] for session in user_sessions)
    total_duration = sum(session['duration'] for session in user_sessions)
    
    # Group by exercise
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

@app.route('/test_exercise/<exercise_name>', methods=['POST'])
def test_exercise(exercise_name):
    """Test endpoint for specific exercise with sample data"""
    try:
        # Sample joint angles for different exercises
        sample_angles = {
            'squat': [110, 112, 160, 158, 120, 118, 90, 88, 175],
            'push_up': [90, 88, 80, 82, 160, 162, 170, 172, 178],
            'high_knees': [120, 118, 150, 152, 100, 98, 60, 58, 175],
            'butt_kicks': [130, 128, 140, 142, 110, 108, 45, 47, 178],
            'wall_sits': [140, 138, 160, 162, 120, 118, 90, 88, 180],
            'plank': [160, 158, 170, 172, 140, 142, 170, 168, 178]
        }
        
        # Get sample angles or use provided data
        data = request.get_json() if request.is_json else {}
        joint_angles = data.get('joint_angles', sample_angles.get(exercise_name.lower(), sample_angles['squat']))
        
        # Test the prediction
        test_data = {
            'joint_angles': joint_angles,
            'selected_exercise': exercise_name
        }
        
        # Call the predict function internally
        return predict_internal(test_data)
        
    except Exception as e:
        return jsonify({
            'error': f'Test failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

def predict_internal(data):
    """Internal prediction function for scikit-learn model"""
    joint_angles = data.get('joint_angles', [])
    selected_exercise = data.get('selected_exercise', None)
    
    if len(joint_angles) < 9:
        raise ValueError(f'Insufficient joint angles: got {len(joint_angles)}, need at least 9')
    
    joint_angles = [float(angle) for angle in joint_angles[:9]]
    zero_count = sum(1 for angle in joint_angles if abs(angle) < 5.0)
    quality_score = (9 - zero_count) / 9
    
    angles_array = np.array(joint_angles, dtype=np.float32)
    model_input = create_model_input(angles_array)
    
    # Scale the features
    if scaler is not None:
        model_input = scaler.transform(model_input)
    
    # Make prediction with scikit-learn model
    if hasattr(model, 'predict_proba'):
        # Get probabilities for all classes
        prediction_probs = model.predict_proba(model_input)[0]
        predicted_class_idx = np.argmax(prediction_probs)
        confidence = float(np.max(prediction_probs))
    else:
        # Fallback for models without predict_proba
        predicted_class_idx = model.predict(model_input)[0]
        confidence = 0.8  # Default confidence for models without probability
        prediction_probs = np.zeros(len(label_encoder.classes_))
        prediction_probs[predicted_class_idx] = confidence
    
    if predicted_class_idx >= len(label_encoder.classes_):
        predicted_class_idx = predicted_class_idx % len(label_encoder.classes_)
    
    predicted_exercise = label_encoder.inverse_transform([predicted_class_idx])[0]
    
    # Exercise matching logic
    exercise_match = False
    if selected_exercise:
        exercise_match = (
            predicted_exercise.lower().replace('_', ' ') == selected_exercise.lower().replace('_', ' ') 
            and confidence >= CONFIG['CONFIDENCE_THRESHOLD'] * 0.8
        )
    else:
        exercise_match = confidence >= CONFIG['CONFIDENCE_THRESHOLD']
    
    # Phase detection
    phase = 'unknown'
    if exercise_match and quality_score > 0.5:
        phase = detect_exercise_phase(joint_angles, predicted_exercise, selected_exercise)
    
    return {
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
        'all_predictions': prediction_probs.tolist() if hasattr(prediction_probs, 'tolist') else []
    }

if __name__ == '__main__':
    print("🚀 Starting Physiotherapy Exercise Monitoring Backend...")
    print(f"🔧 Configuration:")
    print(f"   - ML Framework: {ML_FRAMEWORK}")
    print(f"   - Debug Mode: {CONFIG['DEBUG']}")
    print(f"   - Host: {CONFIG['HOST']}")
    print(f"   - Port: {CONFIG['PORT']}")
    print(f"   - Model Path: {CONFIG['MODEL_PATH']}")
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
        print("❌ Failed to load models. Please check model files.")
        print("🔧 You can still test the API endpoints, but predictions will use mock data.")