# Debug Bicep Curl Test Sequences

Write-Host "Debugging Bicep Curl Test Sequences..."
Write-Host "======================================"

# Reset session first
$emptyBody = '{}' 
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "✅ Session reset: $($resetResponse.message)"

# Test the exact sequences used in the frontend - UPDATED WITH WORKING SEQUENCES
$testSequences = @(
    @{ name = 'arms_down_start'; angles = @(70, 70, 175, 175, 175, 175, 175, 175, 90) },      # Standing, arms extended
    @{ name = 'curl_up_1'; angles = @(90, 90, 45, 45, 175, 175, 175, 175, 90) },             # Fully curled up
    @{ name = 'arms_down_rep1'; angles = @(70, 70, 170, 170, 175, 175, 175, 175, 90) },      # Back to start (Rep 1) 
    @{ name = 'curl_up_2'; angles = @(90, 90, 50, 50, 175, 175, 175, 175, 90) },             # Curl up again
    @{ name = 'arms_down_rep2'; angles = @(75, 75, 175, 175, 175, 175, 175, 175, 90) },      # Back to start (Rep 2)
    @{ name = 'curl_up_3'; angles = @(90, 90, 45, 45, 175, 175, 175, 175, 90) },             # Curl up third time
    @{ name = 'arms_down_rep3'; angles = @(70, 70, 175, 175, 175, 175, 175, 175, 90) }       # Back to start (Rep 3)
)

Write-Host ""
Write-Host "Testing each sequence:"
Write-Host "----------------------"

$repCount = 0
foreach ($sequence in $testSequences) {
    Write-Host ""
    Write-Host "Testing: $($sequence.name)"
    
    $testData = @{
        joint_angles = $sequence.angles
        selected_exercise = "bicep_curl"
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
        
        Write-Host "  → Exercise: $($response.exercise)"
        Write-Host "  → Confidence: $([math]::Round(($response.confidence * 100), 1))%"
        Write-Host "  → Phase: $($response.phase)"
        Write-Host "  → Rep Count: $($response.rep_count)"
        Write-Host "  → Exercise Match: $($response.exercise_match)"
        
        if ($response.rep_count -gt $repCount) {
            Write-Host "  🎉 REP DETECTED! $repCount → $($response.rep_count)" -ForegroundColor Green
            $repCount = $response.rep_count
        }
        
        Start-Sleep -Milliseconds 300
        
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "======================================"
Write-Host "Final Results:"
Write-Host "  Expected Reps: 3"
Write-Host "  Actual Reps: $repCount"
if ($repCount -eq 3) {
    Write-Host "  Status: ✅ PASSED" -ForegroundColor Green
} else {
    Write-Host "  Status: ❌ FAILED" -ForegroundColor Red
    Write-Host "  Issue: Joint angles may not be realistic enough for ML model"
}
Write-Host "======================================"
