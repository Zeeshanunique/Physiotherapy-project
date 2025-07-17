import numpy as np
import math
from typing import List, Tuple, Optional, Dict

def calculate_angle(point1: Tuple[float, float], point2: Tuple[float, float], point3: Tuple[float, float]) -> float:
    """
    Calculate angle between three points (in degrees)
    point2 is the vertex of the angle
    
    Args:
        point1: First point (x, y)
        point2: Vertex point (x, y) 
        point3: Third point (x, y)
        
    Returns:
        Angle in degrees (0-180)
    """
    try:
        # Calculate vectors
        vector1 = np.array([point1[0] - point2[0], point1[1] - point2[1]])
        vector2 = np.array([point3[0] - point2[0], point3[1] - point2[1]])
        
        # Handle zero vectors
        norm1 = np.linalg.norm(vector1)
        norm2 = np.linalg.norm(vector2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Calculate angle using dot product
        cosine_angle = np.dot(vector1, vector2) / (norm1 * norm2)
        
        # Handle numerical errors
        cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
        
        angle = np.arccos(cosine_angle)
        return float(np.degrees(angle))
        
    except Exception as e:
        print(f"Error calculating angle: {e}")
        return 0.0

def calculate_distance(point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two points"""
    return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

def validate_landmarks(landmarks) -> bool:
    """Validate that landmarks contain required pose points"""
    try:
        if not hasattr(landmarks, 'landmark'):
            return False
        if len(landmarks.landmark) < 33:  # MediaPipe has 33 pose landmarks
            return False
        return True
    except:
        return False

def extract_pose_angles(landmarks):
    """
    Extract key joint angles from MediaPipe pose landmarks
    Returns a list of angles that can be used for exercise classification
    
    MediaPipe Pose landmark indices:
    0: nose, 11: left_shoulder, 12: right_shoulder
    13: left_elbow, 14: right_elbow, 15: left_wrist, 16: right_wrist
    23: left_hip, 24: right_hip, 25: left_knee, 26: right_knee
    27: left_ankle, 28: right_ankle
    """
    
    angles = []
    
    try:
        # Convert landmarks to list of [x, y] coordinates
        points = [[lm.x, lm.y] for lm in landmarks.landmark]
        
        # Left arm angles
        if len(points) > 16:
            # Left shoulder angle (shoulder-elbow-wrist)
            left_shoulder_angle = calculate_angle(points[11], points[13], points[15])
            angles.append(left_shoulder_angle)
            
            # Right shoulder angle (shoulder-elbow-wrist)
            right_shoulder_angle = calculate_angle(points[12], points[14], points[16])
            angles.append(right_shoulder_angle)
            
            # Left elbow angle (shoulder-elbow-wrist)
            left_elbow_angle = calculate_angle(points[11], points[13], points[15])
            angles.append(left_elbow_angle)
            
            # Right elbow angle (shoulder-elbow-wrist)
            right_elbow_angle = calculate_angle(points[12], points[14], points[16])
            angles.append(right_elbow_angle)
        
        # Torso angles
        if len(points) > 24:
            # Left hip angle (shoulder-hip-knee)
            left_hip_angle = calculate_angle(points[11], points[23], points[25])
            angles.append(left_hip_angle)
            
            # Right hip angle (shoulder-hip-knee)
            right_hip_angle = calculate_angle(points[12], points[24], points[26])
            angles.append(right_hip_angle)
        
        # Leg angles
        if len(points) > 28:
            # Left knee angle (hip-knee-ankle)
            left_knee_angle = calculate_angle(points[23], points[25], points[27])
            angles.append(left_knee_angle)
            
            # Right knee angle (hip-knee-ankle)
            right_knee_angle = calculate_angle(points[24], points[26], points[28])
            angles.append(right_knee_angle)
        
        # Spine angle (approximation using shoulders and hips)
        if len(points) > 24:
            # Calculate spine inclination
            shoulder_midpoint = [(points[11][0] + points[12][0])/2, (points[11][1] + points[12][1])/2]
            hip_midpoint = [(points[23][0] + points[24][0])/2, (points[23][1] + points[24][1])/2]
            
            # Vertical reference point
            vertical_ref = [shoulder_midpoint[0], shoulder_midpoint[1] - 0.1]
            
            spine_angle = calculate_angle(vertical_ref, shoulder_midpoint, hip_midpoint)
            angles.append(spine_angle)
        
        # Ensure we always return a consistent number of angles
        # Pad with zeros if we don't have enough angles
        while len(angles) < 9:  # 9 key angles
            angles.append(0.0)
            
    except Exception as e:
        print(f"Error calculating angles: {e}")
        # Return default angles if calculation fails
        angles = [0.0] * 9
    
    return angles

def normalize_angles(angles):
    """
    Normalize angles to 0-1 range for better model performance
    """
    normalized = []
    for angle in angles:
        # Normalize to 0-1 (angles are typically 0-180 degrees)
        normalized_angle = min(max(angle / 180.0, 0.0), 1.0)
        normalized.append(normalized_angle)
    
    return normalized

def get_exercise_specific_angles(landmarks, exercise_type):
    """
    Get angles specific to particular exercises with enhanced exercise support
    """
    all_angles = extract_pose_angles(landmarks)
    
    if exercise_type.lower() in ['pushup', 'push-up', 'push_up']:
        # For push-ups, focus on arm and torso angles
        return all_angles[:5]  # shoulder, elbow, and hip angles
    
    elif exercise_type.lower() in ['squat', 'squats']:
        # For squats, focus on leg and hip angles
        return all_angles[4:]  # hip, knee, and spine angles
    
    elif exercise_type.lower() in ['jumping_jack', 'jumping-jack']:
        # For jumping jacks, use all angles
        return all_angles
    
    # NEW: High Knees exercise
    elif exercise_type.lower() in ['high_knees', 'high-knees']:
        # Focus on leg angles for high knees
        return all_angles[4:]  # hip, knee, and spine angles
    
    # NEW: Butt Kicks exercise
    elif exercise_type.lower() in ['butt_kicks', 'butt-kicks', 'butt_kick']:
        # Focus on leg and hip angles for butt kicks
        return all_angles[4:]  # hip, knee, and spine angles
    
    # NEW: Wall Sits exercise
    elif exercise_type.lower() in ['wall_sits', 'wall-sits', 'wall_sit']:
        # Focus on leg angles and spine for wall sits
        return all_angles[4:]  # hip, knee, and spine angles
    
    else:
        # Default: return all angles
        return all_angles

def get_pose_quality_score(landmarks) -> float:
    """
    Calculate pose detection quality score (0-1)
    Based on landmark visibility and detection confidence
    """
    try:
        if not validate_landmarks(landmarks):
            return 0.0
            
        # Check visibility and confidence of key landmarks
        key_landmarks = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]  # Key body points
        
        total_visibility = 0
        total_confidence = 0
        
        for idx in key_landmarks:
            if idx < len(landmarks.landmark):
                landmark = landmarks.landmark[idx]
                total_visibility += getattr(landmark, 'visibility', 0.5)
                # Some MediaPipe versions don't have presence, use visibility as fallback
                total_confidence += getattr(landmark, 'presence', getattr(landmark, 'visibility', 0.5))
        
        avg_visibility = total_visibility / len(key_landmarks)
        avg_confidence = total_confidence / len(key_landmarks)
        
        # Combined quality score
        quality_score = (avg_visibility + avg_confidence) / 2
        
        return min(max(quality_score, 0.0), 1.0)
        
    except Exception as e:
        print(f"Error calculating pose quality: {e}")
        return 0.0

def extract_pose_angles_enhanced(landmarks) -> Tuple[List[float], Dict[str, float]]:
    """
    Extract enhanced pose angles with additional metadata
    Returns tuple of (angles_list, metadata_dict)
    """
    angles = []
    metadata = {}
    
    try:
        if not validate_landmarks(landmarks):
            return [0.0] * 9, {'quality': 0.0, 'error': 'Invalid landmarks'}
            
        # Convert landmarks to list of [x, y] coordinates
        points = [[lm.x, lm.y] for lm in landmarks.landmark]
        
        # Calculate pose quality
        quality = get_pose_quality_score(landmarks)
        metadata['quality'] = quality
        
        # Extract the same angles as before but with better error handling
        angles = extract_pose_angles(landmarks)
        
        # Add additional metadata
        metadata['landmark_count'] = len(points)
        metadata['zero_angles'] = sum(1 for angle in angles if abs(angle) < 5.0)
        metadata['valid_angles'] = len(angles) - metadata['zero_angles']
        
        # Calculate body symmetry
        if len(angles) >= 8:
            left_arm_symmetry = abs(angles[0] - angles[1])  # Left vs right shoulder
            left_leg_symmetry = abs(angles[4] - angles[5])  # Left vs right hip
            metadata['arm_symmetry'] = left_arm_symmetry
            metadata['leg_symmetry'] = left_leg_symmetry
            metadata['overall_symmetry'] = (left_arm_symmetry + left_leg_symmetry) / 2
        
        return angles, metadata
        
    except Exception as e:
        print(f"Error in enhanced angle extraction: {e}")
        return [0.0] * 9, {'quality': 0.0, 'error': str(e)}

def get_exercise_recommendations(angles: List[float], exercise_type: str = None) -> Dict[str, any]:
    """
    Provide exercise form recommendations based on joint angles
    """
    recommendations = {
        'form_score': 0.0,
        'suggestions': [],
        'warnings': [],
        'good_points': []
    }
    
    try:
        if len(angles) < 9:
            recommendations['warnings'].append("Insufficient pose data for analysis")
            return recommendations
            
        # Extract key angles with safety checks
        shoulder_l = angles[0] if len(angles) > 0 else 0
        shoulder_r = angles[1] if len(angles) > 1 else 0
        elbow_l = angles[2] if len(angles) > 2 else 0
        elbow_r = angles[3] if len(angles) > 3 else 0
        hip_l = angles[4] if len(angles) > 4 else 0
        hip_r = angles[5] if len(angles) > 5 else 0
        knee_l = angles[6] if len(angles) > 6 else 0
        knee_r = angles[7] if len(angles) > 7 else 0
        spine = angles[8] if len(angles) > 8 else 0
        
        # General form analysis
        form_score = 100.0
        
        # Check symmetry
        shoulder_diff = abs(shoulder_l - shoulder_r)
        if shoulder_diff > 20:
            recommendations['warnings'].append(f"Shoulder asymmetry detected ({shoulder_diff:.1f}° difference)")
            form_score -= 15
        elif shoulder_diff < 10:
            recommendations['good_points'].append("Good shoulder symmetry")
            
        elbow_diff = abs(elbow_l - elbow_r)
        if elbow_diff > 25:
            recommendations['warnings'].append(f"Arm asymmetry detected ({elbow_diff:.1f}° difference)")
            form_score -= 10
            
        # Exercise-specific recommendations
        if exercise_type:
            exercise_lower = exercise_type.lower().replace('-', '_').replace(' ', '_')
            
            if exercise_lower in ['push_up', 'pushup']:
                if spine < 160:
                    recommendations['suggestions'].append("Keep your body in a straight line")
                    form_score -= 20
                if elbow_l > 90 and elbow_r > 90:
                    recommendations['good_points'].append("Good elbow position")
                else:
                    recommendations['suggestions'].append("Lower yourself until elbows are at 90 degrees")
                    
            elif exercise_lower in ['squat', 'squats']:
                if knee_l < 90 or knee_r < 90:
                    recommendations['good_points'].append("Good squat depth")
                else:
                    recommendations['suggestions'].append("Try to squat deeper (thighs parallel to ground)")
                    form_score -= 15
                if spine > 160:
                    recommendations['good_points'].append("Good posture - chest up")
                else:
                    recommendations['suggestions'].append("Keep your chest up and back straight")
                    form_score -= 10
                    
            # NEW: Recommendations for High Knees
            elif exercise_lower in ['high_knees', 'high-knees']:
                if knee_l < 100 and knee_r < 100:
                    recommendations['good_points'].append("Great job lifting knees high")
                else:
                    recommendations['suggestions'].append("Aim to lift your knees higher")
                    form_score -= 15
                
                if shoulder_diff > 10:
                    recommendations['warnings'].append("Shoulder asymmetry detected")
                    form_score -= 10
            
            # NEW: Recommendations for Butt Kicks
            elif exercise_lower in ['butt_kicks', 'butt-kicks', 'butt_kick']:
                if knee_l < 90 and knee_r < 90:
                    recommendations['good_points'].append("Good heel-to-glute range")
                else:
                    recommendations['suggestions'].append("Try to kick your heels towards your glutes")
                    form_score -= 15
                
                if spine < 160:
                    recommendations['warnings'].append("Spine angle suggests leaning forward")
                    form_score -= 10
            
            # NEW: Recommendations for Wall Sits
            elif exercise_lower in ['wall_sits', 'wall-sits', 'wall_sit']:
                if 85 <= knee_l <= 95 and 85 <= knee_r <= 95:
                    recommendations['good_points'].append("Great wall sit position")
                    form_score += 10
                else:
                    recommendations['suggestions'].append("Adjust your position to achieve 90-degree knee angle")
                    form_score -= 15
                
                if spine < 170:
                    recommendations['warnings'].append("Spine angle suggests back is not straight")
                    form_score -= 10
        
        # Normalize form score
        recommendations['form_score'] = max(0.0, min(100.0, form_score)) / 100.0
        
        return recommendations
        
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        recommendations['warnings'].append(f"Analysis error: {str(e)}")
        return recommendations

def analyze_exercise_form_enhanced(angles, exercise_type, quality_score=0.8):
    """
    Enhanced exercise form analysis including the new exercises
    """
    analysis = {
        'form_score': 0.0,
        'recommendations': [],
        'warnings': [],
        'good_points': [],
        'exercise_specific': {}
    }
    
    try:
        if len(angles) < 9:
            analysis['warnings'].append("Insufficient pose data for analysis")
            return analysis
            
        # Extract key angles
        shoulder_l, shoulder_r = angles[0], angles[1]
        elbow_l, elbow_r = angles[2], angles[3]
        hip_l, hip_r = angles[4], angles[5]
        knee_l, knee_r = angles[6], angles[7]
        spine = angles[8]
        
        form_score = 100.0
        
        # Exercise-specific analysis for new exercises
        if exercise_type.lower() in ['high_knees', 'high-knees']:
            analysis['exercise_specific']['type'] = 'cardio_leg_movement'
            
            # Check knee height
            avg_knee = (knee_l + knee_r) / 2
            if avg_knee < 100:  # Knees bent high
                analysis['good_points'].append("Good knee height - bringing knees up high")
                form_score += 10
            else:
                analysis['recommendations'].append("Bring your knees higher towards your chest")
                form_score -= 15
                
            # Check balance and symmetry
            knee_diff = abs(knee_l - knee_r)
            if knee_diff > 20:
                analysis['warnings'].append("Leg asymmetry - try to maintain balance")
                form_score -= 10
                
        elif exercise_type.lower() in ['butt_kicks', 'butt-kicks', 'butt_kick']:
            analysis['exercise_specific']['type'] = 'cardio_leg_movement'
            
            # Check heel-to-glute range
            avg_knee = (knee_l + knee_r) / 2
            if avg_knee < 90:  # Tight knee bend for butt kicks
                analysis['good_points'].append("Great range of motion - heels reaching glutes")
                form_score += 10
            else:
                analysis['recommendations'].append("Try to kick your heels back towards your glutes")
                form_score -= 15
                
            # Check upright posture
            if spine > 160:
                analysis['good_points'].append("Good upright posture")
            else:
                analysis['recommendations'].append("Keep your torso upright")
                form_score -= 10
                
        elif exercise_type.lower() in ['wall_sits', 'wall-sits', 'wall_sit']:
            analysis['exercise_specific']['type'] = 'isometric_strength'
            
            # Check proper wall sit position
            avg_knee = (knee_l + knee_r) / 2
            avg_hip = (hip_l + hip_r) / 2
            
            if 85 <= avg_knee <= 95:  # Ideal 90-degree knee angle
                analysis['good_points'].append("Perfect wall sit position - 90-degree knee angle")
                form_score += 15
            elif avg_knee < 85:
                analysis['recommendations'].append("Slide up slightly - your knees are too bent")
                form_score -= 10
            elif avg_knee > 110:
                analysis['recommendations'].append("Slide down more - get your thighs parallel to ground")
                form_score -= 15
                
            # Check back against wall (spine angle)
            if spine > 170:
                analysis['good_points'].append("Good back position against the wall")
            else:
                analysis['recommendations'].append("Keep your back flat against the wall")
                form_score -= 10
                
        # General form checks for all exercises
        if quality_score < 0.6:
            analysis['warnings'].append("Pose detection quality is low - ensure good lighting and full body visibility")
            form_score -= 20
            
        analysis['form_score'] = max(0.0, min(100.0, form_score)) / 100.0
        
        return analysis
        
    except Exception as e:
        analysis['warnings'].append(f"Analysis error: {str(e)}")
        return analysis