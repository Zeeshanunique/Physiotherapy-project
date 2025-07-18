'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Camera,
  CameraOff,
  Activity,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react'
import { APIService, ExercisePrediction, APIUtils } from '@/lib/api'

// Dynamic import for MediaPipe to avoid SSR issues
type MediaPipePoseDetector = any;
type PoseResults = any;
type PoseLandmark = any;

interface ExerciseMonitorProps {}

interface SessionStats {
  startTime: Date
  duration: number
  totalReps: number
  exerciseName: string
  averageConfidence: number
  predictions: ExercisePrediction[]
}

const ExerciseMonitor: React.FC<ExerciseMonitorProps> = () => {
  // Core state
  const [isRunning, setIsRunning] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [availableExercises, setAvailableExercises] = useState<string[]>([])
  const [currentPrediction, setCurrentPrediction] = useState<ExercisePrediction | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Camera state
  const [isCameraEnabled, setIsCameraEnabled] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [poseDetectionEnabled, setPoseDetectionEnabled] = useState(true)
  const [currentPoseLandmarks, setCurrentPoseLandmarks] = useState<PoseLandmark[]>([])
  const [poseDetectionStatus, setPoseDetectionStatus] = useState<'initializing' | 'ready' | 'detecting' | 'error'>('initializing')
  
  // UI state
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [testMode, setTestMode] = useState(false)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseDetectorRef = useRef<MediaPipePoseDetector | null>(null)

  useEffect(() => {
    loadExercises()
    initializePoseDetection()
    return () => {
      stopSession()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (poseDetectorRef.current) {
        poseDetectorRef.current.dispose()
      }
    }
  }, [])

  useEffect(() => {
    if (isCameraEnabled && poseDetectionEnabled) {
      startPoseDetection()
    } else {
      stopPoseDetection()
    }
  }, [isCameraEnabled, poseDetectionEnabled])

  const initializePoseDetection = async () => {
    try {
      setPoseDetectionStatus('initializing')
      
      // Dynamic import for MediaPipe to avoid SSR issues
      const { default: MediaPipePoseDetectorClass } = await import('@/lib/mediapipe')
      
      // Create MediaPipe pose detector
      poseDetectorRef.current = new MediaPipePoseDetectorClass()
      
      // Initialize the detector
      const initialized = await poseDetectorRef.current.initialize()
      
      if (initialized) {
        // Set up pose results callback
        poseDetectorRef.current.setOnResults((results: PoseResults) => {
          if (results.poseLandmarks) {
            setCurrentPoseLandmarks(results.poseLandmarks)
            drawPoseOverlay(results)
            
            // If we're running a session, send real joint angles to backend for prediction
            if (isRunning && selectedExercise && poseDetectorRef.current) {
              const jointAngles = poseDetectorRef.current.calculateJointAngles(results.poseLandmarks)
              
              // Convert joint angles object to array format expected by backend
              // Backend expects: [shoulder, ?, elbow, ?, hip, ?, knee, ?, spine]
              // Based on backend code: shoulder_angle = joint_angles[0], elbow_angle = joint_angles[2], etc.
              const anglesArray = [
                (jointAngles.leftShoulder + jointAngles.rightShoulder) / 2 || 90,  // [0] shoulder_angle
                (jointAngles.leftShoulder + jointAngles.rightShoulder) / 2 || 90,  // [1] backup shoulder
                (jointAngles.leftElbow + jointAngles.rightElbow) / 2 || 90,        // [2] elbow_angle
                (jointAngles.leftElbow + jointAngles.rightElbow) / 2 || 90,        // [3] backup elbow
                (jointAngles.leftHip + jointAngles.rightHip) / 2 || 90,            // [4] hip_angle
                (jointAngles.leftHip + jointAngles.rightHip) / 2 || 90,            // [5] backup hip
                (jointAngles.leftKnee + jointAngles.rightKnee) / 2 || 90,          // [6] knee_angle
                (jointAngles.leftKnee + jointAngles.rightKnee) / 2 || 90,          // [7] backup knee
                jointAngles.spine || 175                                           // [8] spine/torso angle
              ]
              
              console.log(`🎯 Sending angles to backend: Shoulder=${anglesArray[0].toFixed(1)}°, Elbow=${anglesArray[2].toFixed(1)}°, Hip=${anglesArray[4].toFixed(1)}°, Knee=${anglesArray[6].toFixed(1)}°`)
              
              // Send to backend for real ML prediction (throttled)
              throttledSendPrediction(anglesArray)
            }
          }
        })
        
        setPoseDetectionStatus('ready')
        console.log('✅ MediaPipe pose detection initialized')
      } else {
        setPoseDetectionStatus('error')
        console.error('❌ Failed to initialize MediaPipe pose detection')
      }
    } catch (error) {
      console.error('Failed to initialize pose detection:', error)
      setPoseDetectionStatus('error')
    }
  }

  const drawPoseOverlay = useCallback((results: PoseResults) => {
    if (!canvasRef.current || !videoRef.current || !poseDetectorRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    // Use MediaPipe's built-in drawing utilities
    poseDetectorRef.current.drawPose(ctx, results, canvas)
  }, [])

  const loadExercises = async () => {
    try {
      const response = await APIService.getExercises()
      setAvailableExercises(response.exercises || [])
    } catch (error) {
      console.error('Failed to load exercises:', error)
      setError('Failed to load available exercises')
    }
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        streamRef.current = stream
        setIsCameraEnabled(true)
        
        // Start MediaPipe pose detection
        if (poseDetectionEnabled && poseDetectorRef.current) {
          setPoseDetectionStatus('detecting')
          const success = await poseDetectorRef.current.startCamera(videoRef.current)
          if (!success) {
            setPoseDetectionStatus('error')
            console.error('Failed to start MediaPipe camera')
          }
        }
      }
    } catch (error) {
      console.error('Camera access failed:', error)
      setCameraError('Failed to access camera. Please check permissions.')
      setIsCameraEnabled(false)
      setPoseDetectionStatus('error')
    }
  }

  const stopCamera = () => {
    if (poseDetectorRef.current) {
      poseDetectorRef.current.stopCamera()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsCameraEnabled(false)
    setPoseDetectionStatus('ready')
    stopPoseDetection()
  }

  const startPoseDetection = async () => {
    if (isCameraEnabled && poseDetectionEnabled && poseDetectorRef.current && videoRef.current) {
      setPoseDetectionStatus('detecting')
      const success = await poseDetectorRef.current.startCamera(videoRef.current)
      if (!success) {
        setPoseDetectionStatus('error')
      }
    }
  }

  const stopPoseDetection = () => {
    if (poseDetectorRef.current) {
      poseDetectorRef.current.stopCamera()
    }
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    
    setCurrentPoseLandmarks([])
    if (isCameraEnabled) {
      setPoseDetectionStatus('ready')
    }
  }

  const generateMockJointAngles = useCallback(() => {
    if (!selectedExercise || !poseDetectorRef.current || currentPoseLandmarks.length === 0) {
      return Array.from({ length: 9 }, () => Math.random() * 180)
    }
    
    // Use real joint angles from pose detection
    const angles = poseDetectorRef.current.calculateJointAngles(currentPoseLandmarks)
    return Object.values(angles).slice(0, 9) // Return first 9 angles
  }, [selectedExercise, currentPoseLandmarks])

  const sendPredictionToBackend = useCallback(async (jointAngles: number[]) => {
    if (!selectedExercise || isLoading) return
    
    try {
      const prediction = await APIService.predictExercise(jointAngles, selectedExercise)
      
      // Update current prediction with backend response
      setCurrentPrediction(prediction)
      
      // Update session stats
      setSessionStats(prev => {
        if (!prev) return prev
        
        const newStats = {
          ...prev,
          duration: Math.floor((Date.now() - prev.startTime.getTime()) / 1000),
          totalReps: prediction.rep_count,
          averageConfidence: prediction.confidence,
          predictions: [...prev.predictions, prediction]
        }
        
        // Play sound on rep increase
        if (prediction.rep_count > prev.totalReps && soundEnabled) {
          playRepSound()
        }
        
        return newStats
      })
      
    } catch (error) {
      console.error('Failed to get prediction from backend:', error)
      setError('Failed to analyze exercise pose')
    }
  }, [selectedExercise, isLoading, soundEnabled])

  // Throttle utility function
  const throttle = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout | null = null
    let lastExecTime = 0
    
    return (...args: any[]) => {
      const currentTime = Date.now()
      
      if (currentTime - lastExecTime > delay) {
        func(...args)
        lastExecTime = currentTime
      } else {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          func(...args)
          lastExecTime = Date.now()
        }, delay - (currentTime - lastExecTime))
      }
    }
  }

  // Throttle backend calls to avoid overwhelming the API
  const throttledSendPrediction = useCallback(
    throttle(sendPredictionToBackend, 200), // Max 5 calls per second
    [sendPredictionToBackend]
  )

  const startSession = async () => {
    if (!selectedExercise && !testMode) {
      setError('Please select an exercise first')
      return
    }

    if (!isCameraEnabled) {
      setError('Please start the camera first to detect poses')
      return
    }

    if (poseDetectionStatus !== 'detecting') {
      setError('Pose detection not active. Please ensure camera is working.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Reset session on backend
      await APIService.resetSession()

      // Initialize session stats
      setSessionStats({
        startTime: new Date(),
        duration: 0,
        totalReps: 0,
        exerciseName: selectedExercise || 'Test Mode',
        averageConfidence: 0,
        predictions: []
      })

      setIsRunning(true)

      console.log(`✅ Exercise session started: ${selectedExercise}`)
      console.log('📊 Pose detection will now send real joint angles to backend for ML prediction')

    } catch (error) {
      console.error('Failed to start session:', error)
      setError('Failed to start session')
    } finally {
      setIsLoading(false)
    }
  }

  const stopSession = () => {
    setIsRunning(false)
    
    // Log session if there were reps
    if (sessionStats && sessionStats.totalReps > 0) {
      logSession()
    }
    
    console.log('🛑 Exercise session stopped')
  }

  const logSession = async () => {
    if (!sessionStats) return

    try {
      await APIService.logSession({
        user_id: 'demo_user',
        exercise: sessionStats.exerciseName,
        total_reps: sessionStats.totalReps,
        duration: sessionStats.duration,
        session_data: sessionStats.predictions
      })
    } catch (error) {
      console.error('Failed to log session:', error)
    }
  }

  const resetSession = async () => {
    try {
      await APIService.resetSession()
      setCurrentPrediction(null)
      setSessionStats(null)
      setError(null)
    } catch (error) {
      console.error('Failed to reset session:', error)
      setError('Failed to reset session')
    }
  }

  const playRepSound = () => {
    if (!soundEnabled) return
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.2)
  }

  const getPhaseColor = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case 'up': return 'text-green-600 bg-green-100'
      case 'down': return 'text-blue-600 bg-blue-100'
      case 'hold': return 'text-orange-600 bg-orange-100'
      case 'rest': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-400 bg-gray-50'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Exercise Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Exercise:</label>
            <div className="relative">
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                disabled={isRunning}
                className="custom-select w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                style={{ minWidth: '256px' }}
              >
                <option value="">Select an exercise...</option>
                {availableExercises.map((exercise) => (
                  <option key={exercise} value={exercise}>
                    {APIUtils.formatExerciseName(exercise)}
                  </option>
                ))}
              </select>
            </div>
            
            <label className="flex items-center space-x-2 whitespace-nowrap">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                disabled={isRunning}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Test Mode</span>
            </label>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={isCameraEnabled ? stopCamera : startCamera}
              disabled={isRunning}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isCameraEnabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isCameraEnabled ? (
                <>
                  <CameraOff className="w-4 h-4 mr-2 inline" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2 inline" />
                  Start Camera
                </>
              )}
            </button>

            <button
              onClick={soundEnabled ? () => setSoundEnabled(false) : () => setSoundEnabled(true)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
              title={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setPoseDetectionEnabled(!poseDetectionEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                poseDetectionEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
              title={poseDetectionEnabled ? 'Disable pose detection' : 'Enable pose detection'}
            >
              <Activity className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700"
          >
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </motion.div>
        )}

        {/* Camera Error */}
        {cameraError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center text-orange-700"
          >
            <AlertCircle className="w-5 h-5 mr-2" />
            {cameraError}
          </motion.div>
        )}
      </div>

      {/* Main Monitor Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Video Feed / Canvas - Made larger */}
        <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Camera Feed
          </h3>
          
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
            />
            
            {!isCameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center text-gray-400">
                  <Camera className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg mb-2">Camera not active</p>
                  <p className="text-sm opacity-75">Click "Start Camera" to begin pose detection</p>
                  <button
                    onClick={startCamera}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Exercise Progress Overlay */}
            {isRunning && currentPrediction && (
              <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm">
                <div className="text-2xl font-bold">{currentPrediction.rep_count} reps</div>
                <div className="text-sm opacity-75 capitalize">{currentPrediction.phase} phase</div>
                <div className="text-xs opacity-50">Confidence: {(currentPrediction.confidence * 100).toFixed(1)}%</div>
              </div>
            )}

            {/* Pose Detection Indicator */}
            {isCameraEnabled && poseDetectionEnabled && (
              <div className={`absolute top-4 right-4 px-3 py-2 rounded-lg backdrop-blur-sm text-white ${
                poseDetectionStatus === 'detecting' ? 'bg-green-500/80' :
                poseDetectionStatus === 'ready' ? 'bg-blue-500/80' :
                poseDetectionStatus === 'initializing' ? 'bg-yellow-500/80' :
                'bg-red-500/80'
              }`}>
                <div className="flex items-center space-x-2">
                  {poseDetectionStatus === 'detecting' && (
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                  )}
                  {poseDetectionStatus === 'ready' && (
                    <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                  )}
                  {poseDetectionStatus === 'initializing' && (
                    <div className="w-2 h-2 bg-yellow-300 rounded-full animate-spin"></div>
                  )}
                  {poseDetectionStatus === 'error' && (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {poseDetectionStatus === 'detecting' && `Pose Detection: ${currentPoseLandmarks.length}/33 points`}
                    {poseDetectionStatus === 'ready' && 'Pose Detection Ready'}
                    {poseDetectionStatus === 'initializing' && 'Initializing MediaPipe...'}
                    {poseDetectionStatus === 'error' && 'Pose Detection Error'}
                  </span>
                </div>
              </div>
            )}

            {/* Pose Detection Disabled Indicator */}
            {isCameraEnabled && !poseDetectionEnabled && (
              <div className="absolute top-4 right-4 bg-orange-500/80 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-medium">Pose Detection Disabled</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exercise Stats */}
        <div className="space-y-4">
          {/* Rep Counter */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">
                {currentPrediction?.rep_count || 0}
              </div>
              <div className="text-blue-100">Repetitions</div>
              
              {currentPrediction && (
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-3 ${
                  getPhaseColor(currentPrediction.phase)
                }`}>
                  {currentPrediction.phase.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Session Controls */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-center space-x-3">
              {!isRunning ? (
                <button
                  onClick={startSession}
                  disabled={(!selectedExercise && !testMode) || isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>{isLoading ? 'Starting...' : 'Start Session'}</span>
                </button>
              ) : (
                <button
                  onClick={stopSession}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Square className="w-5 h-5" />
                  <span>Stop Session</span>
                </button>
              )}
              
              <button
                onClick={resetSession}
                disabled={isRunning}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Exercise Details */}
          {currentPrediction && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Exercise Details</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Detected Exercise:</span>
                  <span className="font-medium">
                    {APIUtils.formatExerciseName(currentPrediction.exercise)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Confidence:</span>
                  <span className={`font-medium ${getConfidenceColor(currentPrediction.confidence)}`}>
                    {(currentPrediction.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Quality Score:</span>
                  <span className="font-medium">
                    {(currentPrediction.quality_score * 100).toFixed(1)}%
                  </span>
                </div>
                
                {selectedExercise && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Exercise Match:</span>
                    <span className="flex items-center space-x-1">
                      {currentPrediction.exercise_match ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        currentPrediction.exercise_match ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentPrediction.exercise_match ? 'Match' : 'No Match'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Stats */}
          {sessionStats && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Session Stats</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.floor(sessionStats.duration / 60)}:{(sessionStats.duration % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(sessionStats.averageConfidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg. Confidence</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExerciseMonitor
