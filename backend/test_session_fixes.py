#!/usr/bin/env python3
"""
Test script to verify session fixes and repetition counting
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_session_fixes():
    print("🧪 Testing Session Fixes and Repetition Counting")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed")
            print(f"   Available exercises: {len(data.get('available_exercises', []))}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return
    
    # Test 2: Get session state
    print("\n2. Testing session state endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/session_state")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Session state retrieved")
            print(f"   Current state: {data['session_state']}")
        else:
            print(f"❌ Session state failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Session state error: {e}")
    
    # Test 3: Reset session with exercise
    print("\n3. Testing session reset with exercise...")
    try:
        response = requests.post(f"{BASE_URL}/reset_session", 
                               json={"selected_exercise": "bench_press"})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Session reset successful")
            print(f"   New state: {data['new_state']}")
        else:
            print(f"❌ Session reset failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Session reset error: {e}")
    
    # Test 4: Test prediction with valid data
    print("\n4. Testing prediction with valid joint angles...")
    try:
        # Simulate bench press joint angles
        joint_angles = [120.0, 120.0, 90.0, 90.0, 170.0, 170.0, 175.0, 175.0, 175.0]
        
        response = requests.post(f"{BASE_URL}/predict", 
                               json={
                                   "joint_angles": joint_angles,
                                   "selected_exercise": "bench_press"
                               })
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Prediction successful")
            print(f"   Exercise: {data.get('exercise', 'unknown')}")
            print(f"   Confidence: {data.get('confidence', 0):.3f}")
            print(f"   Phase: {data.get('phase', 'unknown')}")
            print(f"   Rep count: {data.get('rep_count', 0)}")
        else:
            print(f"❌ Prediction failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Prediction error: {e}")
    
    # Test 5: Test multiple predictions to check rep counting
    print("\n5. Testing repetition counting...")
    try:
        # Simulate a few reps of bench press
        rep_angles = [
            [120.0, 120.0, 90.0, 90.0, 170.0, 170.0, 175.0, 175.0, 175.0],  # Down position
            [120.0, 120.0, 160.0, 160.0, 170.0, 170.0, 175.0, 175.0, 175.0], # Up position
            [120.0, 120.0, 90.0, 90.0, 170.0, 170.0, 175.0, 175.0, 175.0],  # Down position
            [120.0, 120.0, 160.0, 160.0, 170.0, 170.0, 175.0, 175.0, 175.0], # Up position
        ]
        
        for i, angles in enumerate(rep_angles):
            response = requests.post(f"{BASE_URL}/predict", 
                                   json={
                                       "joint_angles": angles,
                                       "selected_exercise": "bench_press"
                                   })
            if response.status_code == 200:
                data = response.json()
                print(f"   Rep {i+1}: {data.get('phase', 'unknown')} - Count: {data.get('rep_count', 0)}")
            else:
                print(f"   Rep {i+1}: Failed - {response.status_code}")
            time.sleep(0.5)  # Small delay between predictions
    except Exception as e:
        print(f"❌ Rep counting test error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Session fixes test completed!")

if __name__ == "__main__":
    test_session_fixes() 