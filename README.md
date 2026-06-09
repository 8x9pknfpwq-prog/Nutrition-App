# NYC Lines

Real-time crowd tracking for NYC bars and clubs — like Waze, but for lines.

## Features

- **Real-time Queue Tracking**: See wait times and crowd levels at NYC bars and clubs
- **Community Reports**: Submit crowd levels and wait times to help others
- **No Sign-up Required**: Anonymous auth — open and use instantly
- **Free to run**: Firebase free tier covers early growth

## Tech Stack

- React Native + Expo (iOS & Android)
- Firebase Realtime Database
- Firebase Anonymous Auth

## Quick Start

1. **Install**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Create a project at https://firebase.google.com/
   - Enable Realtime Database (test mode) and Anonymous Authentication
   - Paste your config into `src/config/firebase.ts`

3. **Seed sample bars** (requires `serviceAccountKey.json` from Firebase)
   ```bash
   npm run seed-bars
   ```

4. **Run**
   ```bash
   npm run ios      # iOS
   npm run android  # Android
   npm run web      # Browser (dev only)
   ```

## Project Structure

```
src/
├── app/
│   ├── index.tsx       # Home: bar list with wait times
│   ├── bar/[id].tsx    # Bar detail + check-in form
│   └── explore.tsx     # Settings
├── config/firebase.ts  # Firebase setup
├── hooks/useQueues.ts  # Real-time data hooks
└── types/index.ts      # TypeScript types
```

## Firebase Schema

```
bars/{barId}            # Venue info (name, address, coords, type)
queue_status/{barId}    # Current crowd level + wait time
check_ins/{barId}/{id}  # User-submitted reports
```

## Crowd Levels

| Level    | Color  | Meaning              |
|----------|--------|----------------------|
| empty    | green  | Walk right in        |
| moderate | yellow | Small wait           |
| busy     | orange | 15–30 min wait       |
| packed   | red    | 30+ min wait         |

## Roadmap

- [ ] Map view using OpenStreetMap (free)
- [ ] Filter by neighborhood
- [ ] Venue photos
- [ ] Opening hours
- [ ] User favorites
- [ ] Push notifications for crowd changes
