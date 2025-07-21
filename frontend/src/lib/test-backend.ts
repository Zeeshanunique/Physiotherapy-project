// Test script to verify backend API functionality
import { APIService } from './api'

export class BackendTester {
  static async testBackendConnection() {
    console.log('🧪 Testing backend connection...')
    
    try {
      // Test health endpoint
      const healthResponse = await APIService.getHealth()
      console.log('✅ Health check passed:', healthResponse)
      
      // Test exercises endpoint
      const exercisesResponse = await APIService.getExercises()
      console.log('✅ Exercises loaded:', exercisesResponse.exercises?.length, 'exercises')
      
      // Test session reset
      const resetResponse = await APIService.resetSession()
      console.log('✅ Session reset successful:', resetResponse)
      
      return true
    } catch (error) {
      console.error('❌ Backend test failed:', error)
      return false
    }
  }

  static async testPredictionAPI() {
    console.log('🧪 Testing prediction API...')
    
    try {
      // Create test angles for bicep curl
      const testAngles = [90, 90, 50, 50, 175, 175, 175, 175, 90] // curl up position
      
      console.log('📤 Sending test prediction:', testAngles)
      const prediction = await APIService.predictExercise(testAngles, 'bicep_curl')
      
      console.log('✅ Prediction received:', {
        exercise: prediction.exercise,
        rep_count: prediction.rep_count,
        phase: prediction.phase,
        confidence: prediction.confidence,
        exercise_match: prediction.exercise_match
      })
      
      return prediction
    } catch (error) {
      console.error('❌ Prediction test failed:', error)
      return null
    }
  }

  static async testRepCounting() {
    console.log('🧪 Testing rep counting with sequence...')
    
    try {
      // Reset session first
      await APIService.resetSession()
      
      // Send a sequence of poses that should count as 1 rep
      const poses = [
        [90, 90, 175, 175, 175, 175, 175, 175, 90], // arms down
        [90, 90, 170, 170, 175, 175, 175, 175, 90], // starting curl
        [90, 90, 150, 150, 175, 175, 175, 175, 90], // mid curl
        [90, 90, 100, 100, 175, 175, 175, 175, 90], // more curl
        [90, 90, 50, 50, 175, 175, 175, 175, 90],   // curl up
        [90, 90, 100, 100, 175, 175, 175, 175, 90], // starting down
        [90, 90, 150, 150, 175, 175, 175, 175, 90], // mid down
        [90, 90, 175, 175, 175, 175, 175, 175, 90], // arms down
      ]
      
      let finalPrediction = null
      
      for (let i = 0; i < poses.length; i++) {
        console.log(`📤 Sending pose ${i + 1}/${poses.length}:`, poses[i])
        const prediction = await APIService.predictExercise(poses[i], 'bicep_curl')
        console.log(`📊 Pose ${i + 1} result:`, {
          rep_count: prediction.rep_count,
          phase: prediction.phase,
          confidence: prediction.confidence
        })
        finalPrediction = prediction
        
        // Small delay between poses
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      console.log('✅ Rep counting test completed:', {
        final_rep_count: finalPrediction?.rep_count,
        final_phase: finalPrediction?.phase,
        expected_reps: 1
      })
      
      return finalPrediction
    } catch (error) {
      console.error('❌ Rep counting test failed:', error)
      return null
    }
  }

  static async runAllTests() {
    console.log('🚀 Running all backend tests...')
    
    const results = {
      connection: false,
      prediction: false,
      repCounting: false
    }
    
    // Test 1: Backend connection
    results.connection = await this.testBackendConnection()
    
    if (results.connection) {
      // Test 2: Prediction API
      const prediction = await this.testPredictionAPI()
      results.prediction = prediction !== null
      
      if (results.prediction) {
        // Test 3: Rep counting
        const repResult = await this.testRepCounting()
        results.repCounting = repResult !== null && repResult.rep_count > 0
      }
    }
    
    console.log('📊 Test Results:', results)
    
    if (results.connection && results.prediction && results.repCounting) {
      console.log('🎉 All tests passed! Backend is working correctly.')
    } else {
      console.log('⚠️ Some tests failed. Check the logs above for details.')
    }
    
    return results
  }
}

export default BackendTester 