#!/usr/bin/env python3
"""
Test script to simulate frontend integration and check session flow
"""

import requests
import json
import time
import random

BASE_URL = "http://localhost:5000"

def test_frontend_integration():
    print("🧪 Testing Frontend Integration Flow")
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
    
    # Test 2: Start session (simulate frontend)
    print("\n2. Testing session start (frontend simulation)...")
    try:
        # Reset session with exercise
        reset_response = requests.post(f"{BASE_URL}/reset_session", 
                                     json={"selected_exercise": "push_up"})
        if reset_response.status_code == 200:
            reset_data = reset_response.json()
            print(f"✅ Session reset successful")
            print(f"   New state: {reset_data['new_state']}")
        else:
            print(f"❌ Session reset failed: {reset_response.status_code}")
            return
        
        # Get session state
        state_response = requests.get(f"{BASE_URL}/session_state")
        if state_response.status_code == 200:
            state_data = state_response.json()
            print(f"✅ Session state retrieved")
            print(f"   Current state: {state_data['session_state']}")
        else:
            print(f"❌ Session state failed: {state_response.status_code}")
            return
            
    except Exception as e:
        print(f"❌ Session start error: {e}")
        return
    
    # Test 3: Simulate real-time predictions (like frontend would send)
    print("\n3. Testing real-time predictions (frontend simulation)...")
    try:
        # Simulate a push-up session with multiple predictions
        push_up_sequence = [
            # Down position (elbows bent)
            [120.0, 120.0, 90.0, 90.0, 170.0, 170.0, 175.0, 175.0, 175.0],
            # Up position (arms extended)
            [120.0, 120.0, 160.0, 160.0, 170.0, 170.0, 175.0, 175.0, 175.0],
            # Down position again
            [120.0, 120.0, 85.0, 85.0, 170.0, 170.0, 175.0, 175.0, 175.0],
            # Up position again
            [120.0, 120.0, 165.0, 165.0, 170.0, 170.0, 175.0, 175.0, 175.0],
            # Down position for third rep
            [120.0, 120.0, 88.0, 88.0, 170.0, 170.0, 175.0, 175.0, 175.0],
            # Up position for third rep
            [120.0, 120.0, 162.0, 162.0, 170.0, 170.0, 175.0, 175.0, 175.0],
        ]
        
        for i, angles in enumerate(push_up_sequence):
            print(f"\n   Prediction {i+1}:")
            response = requests.post(f"{BASE_URL}/predict", 
                                   json={
                                       "joint_angles": angles,
                                       "selected_exercise": "push_up"
                                   })
            if response.status_code == 200:
                data = response.json()
                print(f"     ✅ Success: {data.get('exercise', 'unknown')}")
                print(f"     📊 Confidence: {data.get('confidence', 0):.3f}")
                print(f"     🎯 Phase: {data.get('phase', 'unknown')}")
                print(f"     🔢 Rep count: {data.get('rep_count', 0)}")
                print(f"     🎵 Exercise match: {data.get('exercise_match', False)}")
            else:
                print(f"     ❌ Failed: {response.status_code}")
                print(f"     Response: {response.text}")
            
            # Small delay to simulate real-time
            time.sleep(0.3)
            
    except Exception as e:
        print(f"❌ Real-time predictions error: {e}")
    
    # Test 4: Check final session state
    print("\n4. Checking final session state...")
    try:
        final_state_response = requests.get(f"{BASE_URL}/session_state")
        if final_state_response.status_code == 200:
            final_state_data = final_state_response.json()
            print(f"✅ Final session state:")
            print(f"   Rep count: {final_state_data['session_state']['rep_count']}")
            print(f"   Current phase: {final_state_data['session_state']['current_phase']}")
            print(f"   Selected exercise: {final_state_data['session_state']['selected_exercise']}")
        else:
            print(f"❌ Final state check failed: {final_state_response.status_code}")
    except Exception as e:
        print(f"❌ Final state check error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Frontend integration test completed!")

if __name__ == "__main__":
    test_frontend_integration() 