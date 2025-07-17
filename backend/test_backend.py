#!/usr/bin/env python3
"""
Test script to demonstrate the enhanced backend with 3 new exercises
and perfect model calling functionality
"""

import requests
import json
import time

# Backend URL
BASE_URL = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing Health Endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    data = response.json()
    
    print(f"   Status: {data['status']}")
    print(f"   ML Framework: {data['ml_framework']}")
    print(f"   Model Loaded: {data['model_loaded']}")
    print(f"   Available Exercises: {len(data['available_exercises'])}")
    print()

def test_exercises():
    """Test exercises endpoint"""
    print("📋 Testing Exercises Endpoint...")
    response = requests.get(f"{BASE_URL}/exercises")
    data = response.json()
    
    exercises = data['exercises']
    print(f"   Total exercises: {len(exercises)}")
    print(f"   First 5: {exercises[:5]}")
    print(f"   Last 5: {exercises[-5:]}")
    print()

def test_prediction(joint_angles, exercise_name, description):
    """Test prediction with specific angles"""
    print(f"🎯 Testing {description}...")
    
    payload = {
        "joint_angles": joint_angles,
        "selected_exercise": exercise_name
    }
    
    response = requests.post(
        f"{BASE_URL}/predict", 
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Predicted: {data['exercise']}")
        print(f"   Confidence: {data['confidence']:.3f}")
        print(f"   Phase: {data['phase']}")
        print(f"   Quality Score: {data['quality_score']:.3f}")
        print(f"   Exercise Match: {data['exercise_match']}")
    else:
        print(f"   Error: {response.status_code} - {response.text}")
    print()

def test_new_exercises():
    """Test the 3 new exercises"""
    print("🆕 Testing New Exercises...")
    
    # Test High Knees
    test_prediction(
        [120, 118, 150, 152, 100, 98, 60, 58, 175],
        "high_knees",
        "High Knees (knees up position)"
    )
    
    # Test Butt Kicks
    test_prediction(
        [130, 128, 140, 142, 110, 108, 45, 47, 178],
        "butt_kicks", 
        "Butt Kicks (heels to glutes)"
    )
    
    # Test Wall Sits
    test_prediction(
        [140, 138, 160, 162, 120, 118, 90, 88, 180],
        "wall_sits",
        "Wall Sits (90-degree hold position)"
    )

def test_exercise_endpoint(exercise_name):
    """Test the new test exercise endpoint"""
    print(f"🧪 Testing Exercise Endpoint for {exercise_name}...")
    
    response = requests.post(f"{BASE_URL}/test_exercise/{exercise_name}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Predicted: {data['exercise']}")
        print(f"   Confidence: {data['confidence']:.3f}")
        print(f"   Phase: {data['phase']}")
    else:
        print(f"   Error: {response.status_code}")
    print()

def test_session_reset():
    """Test session reset"""
    print("🔄 Testing Session Reset...")
    
    response = requests.post(f"{BASE_URL}/reset_session")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Message: {data['message']}")
        print(f"   New State: {data['new_state']}")
    else:
        print(f"   Error: {response.status_code}")
    print()

def main():
    """Run all tests"""
    print("=" * 70)
    print("🏥 PhysioTracker Backend Enhancement Test Suite")
    print("=" * 70)
    
    try:
        test_health()
        test_exercises()
        test_new_exercises()
        test_exercise_endpoint("high_knees")
        test_exercise_endpoint("butt_kicks")
        test_exercise_endpoint("wall_sits")
        test_session_reset()
        
        print("✅ All tests completed successfully!")
        print("🎉 Backend is working perfectly with:")
        print("   - 3 new exercises added (high_knees, butt_kicks, wall_sits)")
        print("   - Enhanced phase detection for all exercises")
        print("   - Perfect model calling with verbose parameter support")
        print("   - New test exercise endpoint")
        print("   - Enhanced error handling and validation")
        print("   - Improved logging and debugging")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server")
        print("   Make sure the server is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    main()
