# PhysioTracker Frontend

A modern Next.js frontend for the PhysioTracker AI-powered exercise monitoring system.

## Features

- 🎯 **Real-time Exercise Monitoring** - Live pose detection and exercise tracking
- 📊 **Interactive Dashboard** - Comprehensive system overview and statistics
- 📈 **Session History** - Track progress over time with detailed analytics
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- 🔧 **TypeScript** - Full type safety and better developer experience
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **Axios** - HTTP client for API communication
- **Lucide React** - Beautiful, customizable icons

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- Running PhysioTracker backend on `http://localhost:5000`

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables (optional):**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard
│   ├── ExerciseMonitor.tsx # Exercise monitoring interface
│   ├── Navigation.tsx     # Navigation component
│   └── SessionHistory.tsx # Session history view
└── lib/                   # Utilities and services
    └── api.ts             # API service layer
```

## Backend Integration

The frontend communicates with the PhysioTracker backend through RESTful APIs:

- **Health Check** - `/health` - System status and configuration
- **Exercise List** - `/exercises` - Available exercises
- **Predictions** - `/predict` - Real-time exercise predictions
- **Session Management** - `/reset_session`, `/log_session` - Session control
- **History** - `/sessions/<user_id>` - Session history

## Key Features

### 1. Exercise Monitoring
- Real-time pose detection using MediaPipe
- Live rep counting and phase detection
- Exercise matching and confidence scoring
- Camera feed with pose overlay visualization

### 2. Dashboard
- System health monitoring
- ML framework status
- Exercise statistics
- Quick action buttons

### 3. Session History
- Comprehensive workout tracking
- Filtering and sorting capabilities
- Progress analytics
- Export functionality

## Camera Integration

The application uses WebRTC to access the user's camera for pose detection:

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { 
    width: { ideal: 640 }, 
    height: { ideal: 480 },
    facingMode: 'user'
  }
});
```

## API Service Layer

All backend communication is handled through a centralized API service:

```typescript
import { APIService } from '@/lib/api'

// Check backend health
const health = await APIService.checkHealth()

// Predict exercise
const prediction = await APIService.predictExercise(jointAngles, selectedExercise)

// Get session history
const sessions = await APIService.getUserSessions(userId)
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the PhysioTracker system and follows the same licensing terms.

## Support

For issues and support, please check the main PhysioTracker repository or create an issue in the project tracker.
