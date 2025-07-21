# Realistic Squat Test with Proper Joint Angles

Write-Host "Testing Rep Counting with Realistic Squat Joint Angles..."
Write-Host "========================================================"

# Reset session first
try {
    Write-Host "1. Resetting session..."
    $emptyBody = @{} | ConvertTo-Json
    $resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
    Write-Host "   ✅ Session reset: $($resetResponse.message)"
} catch {
    Write-Host "   ❌ Reset failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "2. Testing complete squat movement sequence..."

# More realistic squat joint angles based on anatomy
# Order: [shoulder, elbow_left, elbow_right, hip_left, hip_right, knee_left, knee_right, ankle_left, ankle_right]
$squatSequence = @(
    @{ # Standing position
        angles = @(95, 170, 170, 175, 175, 175, 175, 90, 90)
        description = "Standing (knee=175°)"
    },
    @{ # Quarter squat  
        angles = @(90, 160, 160, 160, 160, 150, 150, 85, 85)
        description = "Quarter squat (knee=150°)"
    },
    @{ # Half squat
        angles = @(85, 150, 150, 140, 140, 130, 130, 80, 80)
        description = "Half squat (knee=130°)"
    },
    @{ # Deep squat (should trigger 'down' phase)
        angles = @(80, 140, 140, 90, 90, 90, 90, 70, 70)
        description = "Deep squat (knee=90°) - DOWN PHASE"
    },
    @{ # Rising from deep
        angles = @(85, 150, 150, 120, 120, 110, 110, 75, 75)
        description = "Rising (knee=110°)"
    },
    @{ # Nearly standing
        angles = @(90, 160, 160, 150, 150, 140, 140, 80, 80)
        description = "Nearly standing (knee=140°) - UP PHASE"
    },
    @{ # Full standing (should complete rep)
        angles = @(95, 170, 170, 175, 175, 175, 175, 90, 90)
        description = "Standing again (knee=175°) - REP COMPLETE!"
    }
)

$repCount = 0
for ($i = 0; $i -lt $squatSequence.Count; $i++) {
    $position = $squatSequence[$i]
    Write-Host ""
    Write-Host "   Step $($i+1): $($position.description)"
    
    $testData = @{
        joint_angles = $position.angles
        selected_exercise = "squat"
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
        
        Write-Host "      🔍 Exercise: $($response.exercise) (confidence: $([math]::Round(($response.confidence * 100), 1))%)"
        Write-Host "      📊 Phase: $($response.phase)"
        Write-Host "      🔢 Rep Count: $($response.rep_count)"
        Write-Host "      ✓ Exercise Match: $($response.exercise_match)"
        
        if ($response.rep_count -gt $repCount) {
            Write-Host "      🎉 REP COMPLETED! Count: $repCount → $($response.rep_count)" -ForegroundColor Green
            $repCount = $response.rep_count
        }
        
        Start-Sleep -Milliseconds 300  # Slower for demo
        
    } catch {
        Write-Host "      ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "🏁 Final Results:"
Write-Host "   Total Reps Counted: $repCount" -ForegroundColor Yellow
if ($repCount -gt 0) {
    Write-Host "   ✅ Rep counting system is WORKING!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No reps were counted - needs debugging" -ForegroundColor Red
}
Write-Host "========================================="
