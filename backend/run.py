#!/usr/bin/env python3
"""
PhysioTracker Backend Runner

Enhanced script to start the Flask backend server with better error handling
"""

import os
import sys
import signal
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = ['flask', 'flask_cors', 'numpy', 'pickle']
    optional_packages = ['keras', 'tensorflow', 'scikit-learn', 'pandas']
    
    print("🔍 Checking dependencies...")
    
    missing_required = []
    missing_optional = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            missing_required.append(package)
            print(f"  ❌ {package} (REQUIRED)")
    
    for package in optional_packages:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            missing_optional.append(package)
            print(f"  ⚠️  {package} (optional)")
    
    if missing_required:
        print(f"\n❌ Missing required packages: {', '.join(missing_required)}")
        print("Install them with: pip install -r requirements.txt")
        return False
        
    if missing_optional:
        print(f"\n⚠️  Missing optional packages: {', '.join(missing_optional)}")
        print("Some features may not work properly.")
    
    return True

def check_model_files():
    """Check if model files exist and are accessible"""
    model_path = os.getenv('MODEL_PATH', 'model/bilstm_exercise_classifier.h5')
    encoder_path = os.getenv('ENCODER_PATH', 'model/label_encoder.pkl')
    
    print("🔍 Checking model files...")
    
    model_exists = os.path.exists(model_path)
    encoder_exists = os.path.exists(encoder_path)
    
    if model_exists:
        print(f"  ✅ Model file: {model_path}")
        model_size = os.path.getsize(model_path)
        print(f"     Size: {model_size / (1024*1024):.1f} MB")
    else:
        print(f"  ❌ Model file not found: {model_path}")
    
    if encoder_exists:
        print(f"  ✅ Encoder file: {encoder_path}")
    else:
        print(f"  ❌ Encoder file not found: {encoder_path}")
    
    if not model_exists or not encoder_exists:
        print("\n⚠️  Some model files are missing.")
        print("   The server will start with mock models for testing.")
        print("   Please ensure model files are in the correct location for full functionality.")
        
    return model_exists and encoder_exists
def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n👋 Received interrupt signal. Shutting down gracefully...")
    sys.exit(0)

def main():
    """Main function to start the backend server"""
    print("=" * 70)
    print("🏥 PhysioTracker - AI Exercise Monitoring Backend")
    print("=" * 70)
    
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install required packages.")
        sys.exit(1)
    
    # Check model files
    models_available = check_model_files()
    
    # Import app after dependency check
    try:
        from app import app, load_models
        print("✅ Flask app imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import Flask app: {e}")
        sys.exit(1)
    
    # Load models
    print("\n🔄 Loading AI models...")
    models_loaded = load_models()
    
    if models_loaded:
        print("✅ Models loaded successfully")
    else:
        print("⚠️  Models failed to load, using fallback mode")
    
    # Get configuration
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    
    print(f"\n🚀 Starting Flask server...")
    print(f"   🌐 Backend URL: http://localhost:{port}")
    print(f"   🔧 Debug mode: {debug}")
    print(f"   🎯 Host: {host}")
    print(f"   📊 Models loaded: {models_loaded}")
    print("   📋 Available endpoints:")
    print("      GET  /health - Health check")
    print("      GET  /exercises - List available exercises")
    print("      POST /predict - Exercise prediction")
    print("      POST /reset_session - Reset exercise session")
    print("      POST /log_session - Log exercise session")
    print("      GET  /sessions/<user_id> - Get user sessions")
    print(f"\n   Press Ctrl+C to stop the server")
    print("=" * 70)
    
    # Start Flask app
    try:
        app.run(
            debug=debug,
            host=host,
            port=port,
            use_reloader=False  # Disable reloader to prevent double loading
        )
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 