# Test Complete Rep Sequence

Write-Host "Testing Complete Rep Sequence (like frontend test)..."
Write-Host "===================================================="

# Reset session
$emptyBody = '{}'
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "Session reset: $($resetResponse.message)"

# Send complete sequence like frontend test does
$repSequence = @(
    @{ name = 'arms_down_start'; angles = @(70, 70, 175, 175, 175, 175, 175, 175, 90) },
    @{ name = 'curl_up_1'; angles = @(90, 90, 45, 45, 175, 175, 175, 175, 90) },
    @{ name = 'arms_down_rep1'; angles = @(70, 70, 170, 170, 175, 175, 175, 175, 90) },
    @{ name = 'curl_up_2'; angles = @(90, 90, 50, 50, 175, 175, 175, 175, 90) },
    @{ name = 'arms_down_rep2'; angles = @(75, 75, 175, 175, 175, 175, 175, 175, 90) }
)

$repCount = 0
foreach ($step in $repSequence) {
    Write-Host ""
    Write-Host "Sending: $($step.name)"
    
    $testData = @{
        joint_angles = $step.angles
        selected_exercise = "bicep_curl"
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
        
        Write-Host "   Exercise: $($response.exercise)"
        Write-Host "   Phase: $($response.phase)"
        Write-Host "   Rep Count: $($response.rep_count)"
        Write-Host "   Confidence: $([math]::Round(($response.confidence * 100), 1))%"
        
        if ($response.rep_count -gt $repCount) {
            Write-Host "   REP DETECTED! $repCount -> $($response.rep_count)" -ForegroundColor Green
            $repCount = $response.rep_count
        }
        
        Start-Sleep -Milliseconds 300
        
    } catch {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "FINAL RESULT: $repCount reps detected"

Write-Host ""
Write-Host "The key insight: Rep counting requires SEQUENCE of angles (phase transitions)"
Write-Host "Real-time camera must send varying angles over time, not static poses"
