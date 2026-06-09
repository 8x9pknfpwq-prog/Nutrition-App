import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCSqrOAwfkHhQp7PVa56M6plXaaJUR2RsM',
  authDomain: 'lines-856fd.firebaseapp.com',
  databaseURL: 'https://lines-856fd-default-rtdb.firebaseio.com',
  projectId: 'lines-856fd',
  storageBucket: 'lines-856fd.firebasestorage.app',
  messagingSenderId: '798084853336',
  appId: '1:798084853336:web:4b29f595fe2d3c45fa642d',
  measurementId: 'G-YD24H2PGKK',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const db = getDatabase(app);
export const auth = getAuth(app);

export default app;
