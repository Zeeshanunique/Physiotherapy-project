# Test Current Squat Sequences

Write-Host "Testing Current Squat Test Sequences..."
Write-Host "======================================"

# Reset session
$emptyBody = '{}' 
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "✅ Session reset: $($resetResponse.message)"

# Current squat sequences from frontend
$currentSquatSequences = @(
    @{ name = 'standing'; angles = @(90, 90, 90, 90, 170, 170, 170, 170, 175) },
    @{ name = 'squat_down'; angles = @(90, 90, 90, 90, 100, 100, 100, 100, 175) },
    @{ name = 'stand_up_rep1'; angles = @(90, 90, 90, 90, 160, 160, 160, 160, 175) }, # Rep 1
    @{ name = 'squat_down_2'; angles = @(90, 90, 90, 90, 95, 95, 95, 95, 175) },
    @{ name = 'stand_up_rep2'; angles = @(90, 90, 90, 90, 165, 165, 165, 165, 175) }, # Rep 2
    @{ name = 'squat_down_3'; angles = @(90, 90, 90, 90, 105, 105, 105, 105, 175) },
    @{ name = 'stand_up_rep3'; angles = @(90, 90, 90, 90, 170, 170, 170, 170, 175) } # Rep 3
)

Write-Host ""
Write-Host "Testing squat sequences:"
Write-Host "------------------------"

$repCount = 0
foreach ($sequence in $currentSquatSequences) {
    Write-Host ""
    Write-Host "Testing: $($sequence.name)"
    
    $testData = @{
        joint_angles = $sequence.angles
        selected_exercise = "squat"
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
        
        Write-Host "  → Exercise: $($response.exercise)"
        Write-Host "  → Confidence: $([math]::Round(($response.confidence * 100), 1))%"
        Write-Host "  → Phase: $($response.phase)"
        Write-Host "  → Rep Count: $($response.rep_count)"
        Write-Host "  → Exercise Match: $($response.exercise_match)"
        
        if ($response.rep_count -gt $repCount) {
            Write-Host "  🎉 REP COMPLETED! $repCount → $($response.rep_count)" -ForegroundColor Green
            $repCount = $response.rep_count
        }
        
        Start-Sleep -Milliseconds 300
        
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "======================================"
Write-Host "Squat Results:"
Write-Host "  Expected Reps: 3"
Write-Host "  Actual Reps: $repCount"
if ($repCount -eq 3) {
    Write-Host "  Status: ✅ PASSED" -ForegroundColor Green
} else {
    Write-Host "  Status: ⚠️ NEEDS IMPROVEMENT" -ForegroundColor Yellow
}
Write-Host "======================================"
