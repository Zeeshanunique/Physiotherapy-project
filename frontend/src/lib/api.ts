// API client and types for PhysioTracker frontend

const BACKEND_URL = 'http://localhost:5000'; // Change this if your backend runs on a different port

// --- Types ---
export type HealthStatus = {
  ml_framework: string;
  available_exercises: string[];
  [key: string]: any;
};

export type ExercisePrediction = {
  exercise: string;
  confidence: number;
  [key: string]: any;
};

export type UserSession = {
  id: string;
  date: string;
  exercises: string[];
  [key: string]: any;
};

// --- API Service ---
export const APIService = {
  async checkHealth(): Promise<HealthStatus> {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) throw new Error('Backend offline');
    return res.json();
  },
  
  async getExercises(): Promise<{ exercises: string[] }> {
    const res = await fetch(`${BACKEND_URL}/exercises`);
    if (!res.ok) throw new Error('Failed to fetch exercises');
    return res.json();
  },
  
  async predictExercise(jointAngles: number[], selectedExercise?: string): Promise<ExercisePrediction> {
    const res = await fetch(`${BACKEND_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        joint_angles: jointAngles,
        selected_exercise: selectedExercise 
      })
    });
    if (!res.ok) throw new Error('Failed to predict exercise');
    return res.json();
  },
  
  async resetSession(selectedExercise?: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/reset_session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        selected_exercise: selectedExercise,
        phase_threshold: 0.65 
      })
    });
    if (!res.ok) throw new Error('Failed to reset session');
    return res.json();
  },
  
  async getSessionState(): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/session_state`);
    if (!res.ok) throw new Error('Failed to get session state');
    return res.json();
  },
  
  async logSession(sessionData: any): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/log_session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    if (!res.ok) throw new Error('Failed to log session');
    return res.json();
  }
};

// --- API Utils (stub) ---
export const APIUtils = {
  formatExerciseName(name: string): string {
    // Replace underscores/hyphens with spaces, capitalize each word
    return name
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  },
  formatTimestamp(timestamp: string | number): string {
    // Convert to Date and format as local string
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    return date.toLocaleString();
  },
}; 