# Advanced Rep Counting Test - Simulating Squat Movement Sequence

Write-Host "Testing Rep Counting with Squat Movement Sequence..."
Write-Host "=================================================="

# First, reset the session
try {
    Write-Host "1. Resetting session..."
    $emptyBody = @{} | ConvertTo-Json
    $resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
    Write-Host "Session reset: $($resetResponse.message)"
} catch {
    Write-Host "Reset failed: $($_.Exception.Message)"
}

# Simulate squat movement phases
$squatPositions = @(
    @{ # Standing position (up phase)
        angles = @(90, 85, 88, 170, 170, 95, 78, 180, 180)
        description = "Standing position"
    },
    @{ # Quarter squat (transition)
        angles = @(90, 85, 88, 150, 150, 95, 78, 160, 160)
        description = "Quarter squat"
    },
    @{ # Deep squat (down phase)
        angles = @(90, 85, 88, 90, 90, 95, 78, 90, 90)
        description = "Deep squat"
    },
    @{ # Rising (transition)
        angles = @(90, 85, 88, 130, 130, 95, 78, 140, 140)
        description = "Rising"
    },
    @{ # Back to standing (up phase)
        angles = @(90, 85, 88, 170, 170, 95, 78, 180, 180)
        description = "Standing again"
    }
)

$repCount = 0
foreach ($position in $squatPositions) {
    Write-Host ""
    Write-Host "2. Testing: $($position.description)"
    
    $testData = @{
        joint_angles = $position.angles
        selected_exercise = "squat"
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
        
        Write-Host "   Exercise: $($response.exercise)"
        Write-Host "   Confidence: $([math]::Round($response.confidence * 100, 1))%"
        Write-Host "   Phase: $($response.phase)"
        Write-Host "   Rep Count: $($response.rep_count)"
        Write-Host "   Exercise Match: $($response.exercise_match)"
        
        if ($response.rep_count -gt $repCount) {
            Write-Host "   🎉 REP COMPLETED! Count increased from $repCount to $($response.rep_count)" -ForegroundColor Green
            $repCount = $response.rep_count
        }
        
        Start-Sleep -Milliseconds 200  # Simulate 200ms between poses
        
    } catch {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Final Rep Count: $repCount" -ForegroundColor Yellow
Write-Host "Test completed!"
