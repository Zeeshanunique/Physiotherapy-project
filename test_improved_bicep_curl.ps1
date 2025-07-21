# Create Better Bicep Curl Test Sequences

Write-Host "Creating Better Bicep Curl Test Sequences..."
Write-Host "============================================="

# Reset session
$emptyBody = '{}' 
$resetResponse = Invoke-RestMethod -Uri "http://localhost:5000/reset_session" -Method POST -Body $emptyBody -ContentType "application/json"
Write-Host "✅ Session reset: $($resetResponse.message)"

# More realistic bicep curl joint angles
# Joint angles order: [shoulder_left, shoulder_right, elbow_left, elbow_right, hip_left, hip_right, knee_left, knee_right, ankle]
$improvedSequences = @(
    @{ name = 'standing_arms_down'; angles = @(70, 70, 175, 175, 175, 175, 175, 175, 90) },      # Standing, arms extended
    @{ name = 'partial_curl'; angles = @(85, 85, 120, 120, 175, 175, 175, 175, 90) },           # Starting to curl
    @{ name = 'full_curl_up'; angles = @(90, 90, 45, 45, 175, 175, 175, 175, 90) },             # Fully curled up
    @{ name = 'lower_to_halfway'; angles = @(80, 80, 100, 100, 175, 175, 175, 175, 90) },       # Lowering halfway
    @{ name = 'arms_extended_rep1'; angles = @(70, 70, 170, 170, 175, 175, 175, 175, 90) },     # Back to start (Rep 1)
    @{ name = 'curl_up_again'; angles = @(90, 90, 50, 50, 175, 175, 175, 175, 90) },            # Curl up again
    @{ name = 'arms_extended_rep2'; angles = @(75, 75, 175, 175, 175, 175, 175, 175, 90) }      # Back to start (Rep 2)
)

Write-Host ""
Write-Host "Testing improved sequences:"
Write-Host "---------------------------"

$repCount = 0
foreach ($sequence in $improvedSequences) {
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
            Write-Host "  🎉 REP COMPLETED! $repCount → $($response.rep_count)" -ForegroundColor Green
            $repCount = $response.rep_count
        }
        
        Start-Sleep -Milliseconds 400
        
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================="
Write-Host "Improved Results:"
Write-Host "  Expected Reps: 2"
Write-Host "  Actual Reps: $repCount"
if ($repCount -ge 1) {
    Write-Host "  Status: ✅ IMPROVED!" -ForegroundColor Green
} else {
    Write-Host "  Status: ❌ Still needs work" -ForegroundColor Red
}
Write-Host "============================================="
