# Test with multiple exercises to see what works best

Write-Host "Testing Rep Counting with Multiple Exercises..."
Write-Host "=============================================="

# Test different exercises that should be easier to detect

# Test 1: Bicep curls (easier to detect, counts on down movement)
Write-Host ""
Write-Host "Test 1: Bicep Curls"
Write-Host "-------------------"

# Reset session
$emptyBody = '{}' 
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "✅ Session reset for bicep curls"

# Bicep curl sequence: up (curled) → down (extended) should count rep
$curlUp = '{"joint_angles": [90, 60, 60, 170, 170, 170, 170, 90, 90], "selected_exercise": "bicep_curl"}'
$curlDown = '{"joint_angles": [90, 170, 170, 170, 170, 170, 170, 90, 90], "selected_exercise": "bicep_curl"}'

$response1 = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $curlUp -ContentType "application/json"
Write-Host "Curl up: Exercise=$($response1.exercise), Phase=$($response1.phase), Reps=$($response1.rep_count), Match=$($response1.exercise_match)"

Start-Sleep -Milliseconds 200

$response2 = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $curlDown -ContentType "application/json"
Write-Host "Curl down: Exercise=$($response2.exercise), Phase=$($response2.phase), Reps=$($response2.rep_count), Match=$($response2.exercise_match)"

# Test 2: Push-ups (counts on up movement)
Write-Host ""
Write-Host "Test 2: Push-ups"
Write-Host "----------------"

# Reset session
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "✅ Session reset for push-ups"

# Push-up sequence: down → up should count rep
$pushDown = '{"joint_angles": [90, 60, 60, 170, 170, 170, 170, 90, 90], "selected_exercise": "push_up"}'
$pushUp = '{"joint_angles": [90, 170, 170, 170, 170, 170, 170, 90, 90], "selected_exercise": "push_up"}'

$response3 = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $pushDown -ContentType "application/json"
Write-Host "Push down: Exercise=$($response3.exercise), Phase=$($response3.phase), Reps=$($response3.rep_count), Match=$($response3.exercise_match)"

Start-Sleep -Milliseconds 200

$response4 = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $pushUp -ContentType "application/json"
Write-Host "Push up: Exercise=$($response4.exercise), Phase=$($response4.phase), Reps=$($response4.rep_count), Match=$($response4.exercise_match)"

Write-Host ""
Write-Host "Summary:"
Write-Host "========="
Write-Host "Bicep curl final reps: $($response2.rep_count)"
Write-Host "Push-up final reps: $($response4.rep_count)"

if ($response2.rep_count -gt 0 -or $response4.rep_count -gt 0) {
    Write-Host "SUCCESS: Rep counting system works!" -ForegroundColor Green
} else {
    Write-Host "ISSUE: Need to debug further" -ForegroundColor Red
}
