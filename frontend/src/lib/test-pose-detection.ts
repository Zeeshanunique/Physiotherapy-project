// Test file for debugging pose detection issues
export class TestPoseDetector {
  private onResultsCallback: ((results: any) => void) | null = null
  private isRunning = false
  private interval: NodeJS.Timeout | null = null

  async initialize(): Promise<boolean> {
    console.log('🧪 Test pose detector initializing...')
    return true
  }

  async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    console.log('🧪 Test pose detector starting camera...')
    this.isRunning = true
    
    // Start generating test poses immediately
    this.interval = setInterval(() => {
      if (this.onResultsCallback && this.isRunning) {
        const testResults = this.generateTestPose()
        console.log('🧪 Test pose generated:', testResults.poseLandmarks.length, 'landmarks')
        this.onResultsCallback(testResults)
      }
    }, 100) // 10 FPS
    
    return true
  }

  stopCamera(): void {
    console.log('🧪 Test pose detector stopping camera...')
    this.isRunning = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  setOnResults(callback: (results: any) => void): void {
    console.log('🧪 Test pose detector callback set')
    this.onResultsCallback = callback
  }

  calculateJointAngles(landmarks: any[]): Record<string, number> {
    // Generate realistic joint angles for bicep curl
    const time = Date.now() / 1000
    const curlPhase = Math.sin(time * 1.5) // 1.5 second cycle
    
    // Create clear phase transitions for bicep curl
    let elbowAngle: number
    if (curlPhase > 0.5) {
      // CURL UP PHASE: elbows bent (45-60° range)
      elbowAngle = 45 + (curlPhase - 0.5) * 30
    } else if (curlPhase < -0.5) {
      // ARMS DOWN PHASE: elbows extended (165-175° range)
      elbowAngle = 175 - (curlPhase + 0.5) * 20
    } else {
      // TRANSITION PHASE: intermediate angles
      elbowAngle = 90 + curlPhase * 50
    }

    return {
      leftElbow: elbowAngle,
      rightElbow: elbowAngle,
      leftShoulder: 90,
      rightShoulder: 90,
      leftHip: 175,
      rightHip: 175,
      leftKnee: 175,
      rightKnee: 175,
      spine: 90
    }
  }

  private generateTestPose(): any {
    const time = Date.now() / 1000
    const curlPhase = Math.sin(time * 1.5) // 1.5 second cycle
    
    // Generate 33 landmarks with realistic bicep curl motion
    const landmarks = []
    for (let i = 0; i < 33; i++) {
      let x = 0.5, y = 0.5, z = 0
      
      // Create realistic bicep curl motion
      if (i === 11) { // LEFT_SHOULDER
        x = 0.4
        y = 0.3
      } else if (i === 12) { // RIGHT_SHOULDER
        x = 0.6
        y = 0.3
      } else if (i === 13) { // LEFT_ELBOW
        x = 0.4
        y = 0.4 + (curlPhase * 0.1)
      } else if (i === 14) { // RIGHT_ELBOW
        x = 0.6
        y = 0.4 + (curlPhase * 0.1)
      } else if (i === 15) { // LEFT_WRIST
        x = 0.4
        y = 0.5 + (curlPhase * 0.15)
      } else if (i === 16) { // RIGHT_WRIST
        x = 0.6
        y = 0.5 + (curlPhase * 0.15)
      } else if (i === 23) { // LEFT_HIP
        x = 0.4
        y = 0.6
      } else if (i === 24) { // RIGHT_HIP
        x = 0.6
        y = 0.6
      } else {
        // Other landmarks with minimal variation
        x = 0.5 + (Math.random() - 0.5) * 0.02
        y = 0.5 + (Math.random() - 0.5) * 0.02
      }
      
      landmarks.push({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        z: z,
        visibility: 0.95
      })
    }
    
    return {
      poseLandmarks: landmarks,
      poseWorldLandmarks: landmarks,
      segmentationMask: null
    }
  }

  dispose(): void {
    console.log('🧪 Test pose detector disposing...')
    this.stopCamera()
    this.onResultsCallback = null
  }

  // Simple pose drawing for test detector
  drawPose(ctx: CanvasRenderingContext2D, results: any, canvas: HTMLCanvasElement): void {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw simple pose indicators for test mode
    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      ctx.fillStyle = '#00ff00'
      
      // Draw key points
      const keyPoints = [11, 12, 13, 14, 15, 16, 23, 24] // shoulders, elbows, wrists, hips
      keyPoints.forEach(index => {
        if (results.poseLandmarks[index]) {
          const landmark = results.poseLandmarks[index]
          const x = landmark.x * canvas.width
          const y = landmark.y * canvas.height
          
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
      
      // Draw connections
      const connections = [
        [11, 13], [13, 15], // left arm
        [12, 14], [14, 16], // right arm
        [11, 12], // shoulders
        [23, 24], // hips
        [11, 23], [12, 24] // torso
      ]
      
      connections.forEach(([start, end]) => {
        if (results.poseLandmarks[start] && results.poseLandmarks[end]) {
          const startPoint = results.poseLandmarks[start]
          const endPoint = results.poseLandmarks[end]
          
          ctx.beginPath()
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height)
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height)
          ctx.stroke()
        }
      })
    }
  }
}

export default TestPoseDetector 