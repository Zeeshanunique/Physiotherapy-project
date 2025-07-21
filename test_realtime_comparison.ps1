# Test Real-Time vs Test Mode Comparison

Write-Host "Testing Real-Time Camera vs Test Mode Comparison..."
Write-Host "=================================================="

# Test 1: Known working sequence
Write-Host ""
Write-Host "1. Testing KNOWN WORKING bicep curl sequence:"
Write-Host "----------------------------------------------"

# Reset session
$emptyBody = '{}'
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "✅ Session reset: $($resetResponse.message)"

# Test with our verified working sequence
$workingAngles = @(90, 90, 45, 45, 175, 175, 175, 175, 90)  # This produces reps

$testData = @{
    joint_angles = $workingAngles
    selected_exercise = "bicep_curl"
} | ConvertTo-Json -Depth 10

Write-Host "Sending known working angles: $($workingAngles -join ', ')"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
    
    Write-Host "✅ WORKING SEQUENCE RESULT:"
    Write-Host "   → Exercise: $($response.exercise)"
    Write-Host "   → Confidence: $([math]::Round(($response.confidence * 100), 1))%"
    Write-Host "   → Phase: $($response.phase)"
    Write-Host "   → Rep Count: $($response.rep_count)"
    Write-Host "   → Exercise Match: $($response.exercise_match)"
    Write-Host "   → Quality Score: $($response.quality_score)"
    
} catch {
    Write-Host "❌ Error with working sequence: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Backend health
Write-Host ""
Write-Host "2. Backend health check:"
Write-Host "------------------------"

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
    Write-Host "✅ Backend is healthy"
    Write-Host "   → Available exercises: $($health.available_exercises.Count)"
    Write-Host "   → ML Framework: $($health.ml_framework)"
    Write-Host "   → Current session reps: $($health.session_state.rep_count)"
    Write-Host "   → Current phase: $($health.session_state.current_phase)"
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================================="
Write-Host "📋 DEBUG INSTRUCTIONS:"
Write-Host "1. Open browser console at http://localhost:3000"
Write-Host "2. Select 'bicep_curl' exercise"
Write-Host "3. Enable camera and click 'Start Session'"
Write-Host "4. Check console for real-time angle logs"
Write-Host "5. Compare real angles with working angles above"
Write-Host ""
Write-Host "🎯 Working angles that produce reps:"
Write-Host "   Shoulder: 90°, Elbow: 45°, Hip: 175°, Knee: 175°, Spine: 90°"
Write-Host "=================================================="
