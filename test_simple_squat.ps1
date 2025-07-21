# Simple Rep Counting Test

Write-Host "Testing Rep Counting System..."

# Reset session
$emptyBody = '{}' 
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "Session reset: $($resetResponse.message)"

# Test 1: Standing position (up phase)
$testData1 = '{"joint_angles": [95, 170, 170, 175, 175, 175, 175, 90, 90], "selected_exercise": "squat"}'
$response1 = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData1 -ContentType "application/json"
Write-Host ""
Write-Host "Test 1 - Standing (knee=175):"
Write-Host "  Exercise: $($response1.exercise)"
Write-Host "  Phase: $($response1.phase)"
Write-Host "  Rep Count: $($response1.rep_count)"
Write-Host "  Exercise Match: $($response1.exercise_match)"

Start-Sleep -Milliseconds 300

# Test 2: Deep squat (down phase)
$testData2 = '{"joint_angles": [80, 140, 140, 90, 90, 90, 90, 70, 70], "selected_exercise": "squat"}'
$response2 = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData2 -ContentType "application/json"
Write-Host ""
Write-Host "Test 2 - Deep squat (knee=90):"
Write-Host "  Exercise: $($response2.exercise)"
Write-Host "  Phase: $($response2.phase)"
Write-Host "  Rep Count: $($response2.rep_count)"
Write-Host "  Exercise Match: $($response2.exercise_match)"

Start-Sleep -Milliseconds 300

# Test 3: Back to standing (should complete rep)
$testData3 = '{"joint_angles": [95, 170, 170, 175, 175, 175, 175, 90, 90], "selected_exercise": "squat"}'
$response3 = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData3 -ContentType "application/json"
Write-Host ""
Write-Host "Test 3 - Standing again (knee=175):"
Write-Host "  Exercise: $($response3.exercise)"
Write-Host "  Phase: $($response3.phase)"
Write-Host "  Rep Count: $($response3.rep_count)"
Write-Host "  Exercise Match: $($response3.exercise_match)"

Write-Host ""
Write-Host "Final Rep Count: $($response3.rep_count)"
if ($response3.rep_count -gt 0) {
    Write-Host "SUCCESS: Rep counting is working!" -ForegroundColor Green
} else {
    Write-Host "ISSUE: No reps counted" -ForegroundColor Red
}
