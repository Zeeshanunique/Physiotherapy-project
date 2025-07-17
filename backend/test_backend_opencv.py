import requests
import json

# Test the backend prediction endpoint
def test_prediction():
    url = "http://localhost:5000/predict"
    
    # Test data for squats
    test_data = {
        "joint_angles": [130, 132, 160, 158, 120, 118, 90, 88, 175],
        "selected_exercise": "squat"
    }
    
    try:
        response = requests.post(url, json=test_data)
        result = response.json()
        
        print("🔥 BACKEND PREDICTION TEST:")
        print(f"Status Code: {response.status_code}")
        print(f"Exercise Predicted: {result.get('exercise', 'N/A')}")
        print(f"Confidence: {result.get('confidence', 0):.3f}")
        print(f"Phase: {result.get('phase', 'N/A')}")
        print(f"Rep Count: {result.get('rep_count', 0)}")
        print(f"Exercise Match: {result.get('exercise_match', False)}")
        print(f"Quality Score: {result.get('quality_score', 0):.3f}")
        print(f"ML Framework: {result.get('ml_framework', 'N/A')}")
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
        else:
            print("✅ Prediction successful!")
            
        return result
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return None

def test_multiple_reps():
    """Test multiple predictions to simulate rep counting"""
    url = "http://localhost:5000/predict"
    
    # Reset session first
    reset_response = requests.post("http://localhost:5000/reset_session")
    print(f"🔄 Session reset: {reset_response.json()}")
    
    # Simulate squat movement: down -> up -> down -> up
    squat_phases = [
        # Down position (deep squat)
        {"joint_angles": [130, 132, 160, 158, 100, 98, 70, 68, 175], "phase": "down"},
        # Up position (standing)
        {"joint_angles": [130, 132, 160, 158, 140, 138, 160, 158, 175], "phase": "up"},
        # Down position (deep squat)
        {"joint_angles": [130, 132, 160, 158, 95, 93, 65, 63, 175], "phase": "down"},
        # Up position (standing)  
        {"joint_angles": [130, 132, 160, 158, 145, 143, 165, 163, 175], "phase": "up"},
    ]
    
    print("\n🏋️ Testing rep counting with squat movement:")
    
    for i, phase_data in enumerate(squat_phases):
        test_data = {
            "joint_angles": phase_data["joint_angles"],
            "selected_exercise": "squat"
        }
        
        response = requests.post(url, json=test_data)
        result = response.json()
        
        print(f"Phase {i+1} ({phase_data['phase']}): "
              f"Detected={result.get('phase', 'N/A')}, "
              f"Reps={result.get('rep_count', 0)}, "
              f"Confidence={result.get('confidence', 0):.3f}")

if __name__ == "__main__":
    # Test single prediction
    print("Testing backend prediction...")
    test_prediction()
    
    print("\n" + "="*50)
    
    # Test rep counting
    test_multiple_reps()
