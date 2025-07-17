#!/usr/bin/env python3
"""
Train a scikit-learn model for exercise classification
This script creates a Random Forest classifier to replace the TensorFlow BiLSTM model
"""

import os
import numpy as np
import pandas as pd
import joblib
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# Exercise definitions
EXERCISES = [
    'squats', 'bicep_curls', 'push_ups', 'lunges', 
    'deadlifts', 'shoulder_press', 'planks', 'jumping_jacks',
    'bench_press', 'pull_ups', 'burpees', 'mountain_climbers',
    'dips', 'overhead_press', 'rows', 'calf_raises',
    'high_knees', 'butt_kicks', 'wall_sits', 'tricep_dips',
    'lat_pulldown', 'hip_thrust'
]

def generate_exercise_data(exercise_name, n_samples=100):
    """Generate synthetic joint angle data for a specific exercise"""
    np.random.seed(hash(exercise_name) % 2**32)  # Consistent seed per exercise
    
    # Define typical angle ranges for different exercises
    angle_profiles = {
        'squats': [120, 120, 150, 150, 90, 90, 90, 90, 175],
        'push_ups': [90, 90, 80, 80, 160, 160, 170, 170, 178],
        'bicep_curls': [70, 70, 60, 60, 160, 160, 170, 170, 175],
        'lunges': [110, 140, 150, 170, 90, 120, 60, 120, 175],
        'deadlifts': [140, 140, 170, 170, 120, 120, 170, 170, 160],
        'shoulder_press': [60, 60, 170, 170, 160, 160, 170, 170, 175],
        'planks': [160, 160, 170, 170, 140, 140, 170, 170, 178],
        'jumping_jacks': [100, 100, 140, 140, 120, 120, 140, 140, 175],
        'bench_press': [80, 80, 70, 70, 160, 160, 170, 170, 180],
        'pull_ups': [50, 50, 40, 40, 140, 140, 170, 170, 175],
        'burpees': [100, 100, 120, 120, 100, 100, 120, 120, 170],
        'mountain_climbers': [120, 120, 150, 150, 90, 90, 60, 150, 170],
        'dips': [90, 90, 70, 70, 150, 150, 170, 170, 175],
        'overhead_press': [50, 50, 170, 170, 160, 160, 170, 170, 175],
        'rows': [110, 110, 90, 90, 140, 140, 170, 170, 175],
        'calf_raises': [170, 170, 170, 170, 160, 160, 160, 160, 175],
        'high_knees': [120, 120, 150, 150, 100, 100, 60, 60, 175],
        'butt_kicks': [130, 130, 140, 140, 110, 110, 45, 45, 178],
        'wall_sits': [140, 140, 160, 160, 120, 120, 90, 90, 180],
        'tricep_dips': [90, 90, 60, 60, 150, 150, 170, 170, 175],
        'lat_pulldown': [70, 70, 50, 50, 140, 140, 170, 170, 175],
        'hip_thrust': [110, 110, 170, 170, 90, 90, 170, 170, 160]
    }
    
    # Get base angles for this exercise or use default
    base_angles = angle_profiles.get(exercise_name, [120, 120, 150, 150, 120, 120, 120, 120, 175])
    
    # Generate variations around base angles
    samples = []
    for _ in range(n_samples):
        # Add random variations (±20 degrees)
        sample = []
        for base_angle in base_angles:
            variation = np.random.normal(0, 15)  # Standard deviation of 15 degrees
            angle = max(0, min(180, base_angle + variation))  # Clamp to [0, 180]
            sample.append(angle)
        samples.append(sample)
    
    return np.array(samples)

def create_features(angles_array):
    """Create feature vector from joint angles (same as in app.py)"""
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
    
    # Angle differences (4 features)
    for i in range(4):
        if i * 2 + 1 < len(angles_array):
            features.append(abs(angles_array[i * 2] - angles_array[i * 2 + 1]))
    
    return np.array(features)

def main():
    print("🏋️  Training scikit-learn model for exercise classification...")
    
    # Create model directory if it doesn't exist
    os.makedirs('model', exist_ok=True)
    
    # Generate training data
    print("📊 Generating synthetic training data...")
    X = []
    y = []
    
    for exercise in EXERCISES:
        print(f"   Generating data for: {exercise}")
        exercise_data = generate_exercise_data(exercise, n_samples=200)
        
        # Create features for each sample
        for sample in exercise_data:
            features = create_features(sample)
            X.append(features)
            y.append(exercise)
    
    X = np.array(X)
    y = np.array(y)
    
    print(f"✅ Generated {len(X)} samples with {X.shape[1]} features each")
    print(f"📝 Exercises: {list(set(y))}")
    
    # Create label encoder
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    # Scale features
    print("🔧 Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest model
    print("🌳 Training Random Forest classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )
    
    rf_model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    print("📊 Evaluating model...")
    y_pred = rf_model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"✅ Test Accuracy: {accuracy:.3f}")
    
    # Cross-validation
    cv_scores = cross_val_score(rf_model, X_train_scaled, y_train, cv=5)
    print(f"📈 Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
    
    # Classification report
    print("\n📋 Classification Report:")
    report = classification_report(y_test, y_pred, target_names=label_encoder.classes_)
    print(report)
    
    # Save models
    print("💾 Saving models...")
    
    # Save Random Forest model
    joblib.dump(rf_model, 'model/exercise_classifier.joblib')
    print("   ✅ Random Forest model saved to model/exercise_classifier.joblib")
    
    # Save scaler
    joblib.dump(scaler, 'model/feature_scaler.joblib')
    print("   ✅ Feature scaler saved to model/feature_scaler.joblib")
    
    # Save label encoder
    with open('model/label_encoder.pkl', 'wb') as f:
        pickle.dump(label_encoder, f)
    print("   ✅ Label encoder saved to model/label_encoder.pkl")
    
    # Feature importance
    print("\n🎯 Top 10 Most Important Features:")
    feature_names = (['raw_angle_' + str(i) for i in range(9)] +
                    ['norm_angle_' + str(i) for i in range(9)] +
                    ['sin_angle_' + str(i) for i in range(9)] +
                    ['cos_angle_' + str(i) for i in range(9)] +
                    ['mean', 'std', 'min', 'max', 'median'] +
                    ['diff_' + str(i) for i in range(4)])
    
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': rf_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(feature_importance.head(10).to_string(index=False))
    
    print("\n🎉 Model training completed successfully!")
    print("🚀 You can now run the Flask app with the new scikit-learn model.")

if __name__ == "__main__":
    main()
