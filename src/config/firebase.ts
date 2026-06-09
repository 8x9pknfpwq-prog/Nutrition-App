import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Copy this config from Firebase Console: Project Settings > Your apps > Web
// For now, using a public config (keys are intentionally public in Firebase)
const firebaseConfig = {
  apiKey: 'AIzaSyABc1234567890_example_replace_with_yours',
  authDomain: 'nycqueues-app.firebaseapp.com',
  databaseURL: 'https://nycqueues-app.firebaseio.com',
  projectId: 'nycqueues-app',
  storageBucket: 'nycqueues-app.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const db = getDatabase(app);
export const auth = getAuth(app);

export default app;
