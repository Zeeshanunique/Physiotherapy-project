# Test Rep Counting PowerShell Script

# Sample joint angles for testing (9 angles required)
$testData = @{
    joint_angles = @(85.2, 92.1, 88.5, 45.0, 120.3, 95.7, 78.4, 105.2, 67.8)
    selected_exercise = "squat"
} | ConvertTo-Json -Depth 10

Write-Host "Testing Backend Rep Counting..."
Write-Host "Sending test data to: http://localhost:5000/predict"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/predict" -Method POST -Body $testData -ContentType "application/json"
    Write-Host "Response received:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
}
