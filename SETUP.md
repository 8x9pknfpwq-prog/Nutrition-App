# NYC Queues - Setup Guide

## Firebase Setup

1. **Create a Firebase Project**
   - Go to https://firebase.google.com/
   - Create a new project called "nycqueues-app"
   - Enable Realtime Database (start in test mode for development)
   - Enable Authentication → Anonymous

2. **Get Your Firebase Config**
   - In Firebase Console, go to Project Settings → Your apps → Web
   - Copy the config object
   - Paste into `src/config/firebase.ts` replacing the placeholder config

3. **Enable Anonymous Auth**
   - Firebase Console → Authentication → Sign-in method
   - Enable "Anonymous"

4. **Seed Sample Bars**
   - Run: `npm run seed-bars`
   - This adds popular NYC bars and clubs to your database

## Running the App

- **Web**: `npm run web`
- **iOS**: `npm run ios` (requires macOS with Xcode)
- **Android**: `npm run android` (requires Android Studio)

## Database Schema

```
├── bars/{barId}
│   ├── name: string
│   ├── address: string
│   ├── latitude: number
│   ├── longitude: number
│   ├── type: "bar" | "club"
│   └── createdAt: timestamp
│
├── queue_status/{barId}
│   ├── waitTimeMinutes: number
│   ├── crowdLevel: "empty" | "moderate" | "busy" | "packed"
│   ├── userCount: number
│   ├── lastUpdated: timestamp
│   └── updatedBy: userId
│
└── check_ins/{barId}/{checkInId}
    ├── waitTimeMinutes: number
    ├── crowdLevel: string
    ├── userId: string
    └── timestamp: timestamp
```

## Features

- **Real-time Queue Tracking**: See current wait times at bars
- **Crowd Reporting**: Users submit crowd level and wait time estimates
- **Anonymous**: No login required - just start using
- **Cost-effective**: Uses Firebase free tier
