# NutriTrack — Calorie & Macro Tracker

A mobile-first nutrition tracking web app powered by Claude AI.

## Features

- **Body photo analysis** — upload a shirtless photo + your metrics; Claude estimates body composition and calculates personalized calorie/macro targets
- **AI food scanning** — photograph any meal and get instant calorie + macro estimates
- **Manual food logging** — enter food name, calories, protein, carbs, fat, fiber by hand
- **Full macro tracking** — daily progress for calories, protein, carbs, and fat with visual bars
- **Food log** — browse and edit your history by date
- **Calorie calculator** — Mifflin-St Jeor BMR + TDEE with activity-level and goal adjustments

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure your API key
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run in development
```bash
npm run dev
```
- React app: http://localhost:5173
- API server: http://localhost:3001

### 4. Production build
```bash
npm run build
npm start        # serves built app + API from port 3001
```

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **Backend**: Express.js
- **AI**: Anthropic Claude (vision model for body and food analysis)
- **Storage**: localStorage (no database required)
