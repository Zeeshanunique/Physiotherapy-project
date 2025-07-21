# Detailed Rep Counting Analysis

Write-Host "Analyzing Rep Counting System..."
Write-Host "================================="

# Reset session
$emptyBody = '{}' 
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "✅ Session reset: $($resetResponse.message)"
Write-Host "Initial state: Phase=$($resetResponse.new_state.current_phase), Reps=$($resetResponse.new_state.rep_count)"

Write-Host ""
Write-Host "Testing Down → Up transition for squat:"
Write-Host "========================================"

# Test sequence: down → up (should trigger rep)
$tests = @(
    @{ data = '{"joint_angles": [80, 140, 140, 90, 90, 90, 90, 70, 70], "selected_exercise": "squat"}'; desc = "Deep squat (down)" },
    @{ data = '{"joint_angles": [85, 150, 150, 120, 120, 130, 130, 75, 75], "selected_exercise": "squat"}'; desc = "Rising (transition)" },
    @{ data = '{"joint_angles": [95, 170, 170, 175, 175, 175, 175, 90, 90], "selected_exercise": "squat"}'; desc = "Standing (up)" }
)

for ($i = 0; $i -lt $tests.Count; $i++) {
    $test = $tests[$i]
    Write-Host ""
    Write-Host "Step $($i+1): $($test.desc)"
    
    $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $test.data -ContentType "application/json"
    
    Write-Host "  Result:"
    Write-Host "    Exercise: $($response.exercise)"
    Write-Host "    Phase: $($response.phase)"
    Write-Host "    Rep Count: $($response.rep_count)"
    Write-Host "    Match: $($response.exercise_match)"
    
    if ($i -gt 0 -and $response.rep_count -gt $tests[$i-1].expectedReps) {
        Write-Host "    🎉 REP DETECTED!" -ForegroundColor Green
    }
    
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "================================="
Write-Host "Analysis complete!"
