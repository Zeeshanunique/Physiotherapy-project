# Test Enhanced Real-Time System

Write-Host "Testing Enhanced Real-Time Exercise Monitoring System..."
Write-Host "===================================================="

# First check if both servers are responsive
Write-Host ""
Write-Host "1. Checking server connectivity..."

try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Backend (Flask): RESPONSIVE" -ForegroundColor Green
    Write-Host "   📊 Available exercises: $($backendHealth.available_exercises.Count)"
} catch {
    Write-Host "   ❌ Backend (Flask): NOT RESPONSIVE" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    exit 1
}

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method HEAD -TimeoutSec 5
    Write-Host "   ✅ Frontend (Next.js): RESPONSIVE" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend (Next.js): NOT RESPONSIVE" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    exit 1
}

Write-Host ""
Write-Host "2. Testing enhanced rep counting system..."

# Reset session
$emptyBody = '{}' 
try {
    $resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
    Write-Host "   ✅ Session reset: $($resetResponse.message)"
} catch {
    Write-Host "   ⚠️  Reset failed, continuing anyway: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test with improved bicep curl sequence (our working version)
$workingSequence = @(
    @{ name = 'arms_down'; angles = @(70, 70, 175, 175, 175, 175, 175, 175, 90) },
    @{ name = 'curl_up'; angles = @(90, 90, 45, 45, 175, 175, 175, 175, 90) },
    @{ name = 'arms_down_rep1'; angles = @(70, 70, 170, 170, 175, 175, 175, 175, 90) },
    @{ name = 'curl_up_2'; angles = @(90, 90, 50, 50, 175, 175, 175, 175, 90) },
    @{ name = 'arms_down_rep2'; angles = @(75, 75, 175, 175, 175, 175, 175, 175, 90) }
)

$totalReps = 0
$startTime = Get-Date

foreach ($sequence in $workingSequence) {
    Write-Host ""
    Write-Host "   Testing: $($sequence.name)"
    
    $testData = @{
        joint_angles = $sequence.angles
        selected_exercise = "bicep_curl"
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
        
        Write-Host "      → Predicted: $($response.exercise) ($([math]::Round(($response.confidence * 100), 1))%)"
        Write-Host "      → Phase: $($response.phase)"
        Write-Host "      → Reps: $($response.rep_count)"
        
        if ($response.rep_count -gt $totalReps) {
            Write-Host "      🎉 REP DETECTED! $totalReps → $($response.rep_count)" -ForegroundColor Green
            $totalReps = $response.rep_count
        }
        
        Start-Sleep -Milliseconds 200  # Simulate real-time 5fps rate
        
    } catch {
        Write-Host "      ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host ""
Write-Host "===================================================="
Write-Host "📊 Enhanced System Test Results:"
Write-Host "   ⏱️  Test Duration: $($duration.ToString('F1'))s"
Write-Host "   🏃 Reps Detected: $totalReps"
Write-Host "   ⚡ System Status: $(if ($totalReps -gt 0) { 'WORKING' } else { 'NEEDS DEBUG' })" -ForegroundColor $(if ($totalReps -gt 0) { 'Green' } else { 'Red' })

if ($totalReps -gt 0) {
    Write-Host ""
    Write-Host "🎯 The enhanced real-time system is ready!" -ForegroundColor Green
    Write-Host "   Users can now:" -ForegroundColor Green
    Write-Host "   1. Select an exercise (e.g., 'bicep_curl')" -ForegroundColor Green  
    Write-Host "   2. Enable camera and pose detection" -ForegroundColor Green
    Write-Host "   3. Click 'Start Session' for real-time monitoring" -ForegroundColor Green
    Write-Host "   4. Perform exercises and get instant rep counting" -ForegroundColor Green
    Write-Host "   5. View live statistics and phase detection" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ System needs debugging - check backend logs" -ForegroundColor Yellow
}

Write-Host "===================================================="
