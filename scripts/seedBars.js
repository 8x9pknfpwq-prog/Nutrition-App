const admin = require('firebase-admin');

// Download service account key from Firebase Console > Project Settings > Service Accounts
// Save as serviceAccountKey.json in the root directory
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://nycqueues-app.firebaseio.com',
});

const db = admin.database();

const nyxBars = [
  {
    name: 'Marquee NYC',
    address: '289 10th Ave, New York, NY 10011',
    latitude: 40.7445,
    longitude: -74.0025,
    type: 'club',
  },
  {
    name: 'Output',
    address: '74 Wythe Ave, Brooklyn, NY 11249',
    latitude: 40.7185,
    longitude: -73.9566,
    type: 'club',
  },
  {
    name: 'The Box',
    address: '189 Chrystie St, New York, NY 10002',
    latitude: 40.7207,
    longitude: -73.9788,
    type: 'club',
  },
  {
    name: 'Bacchanal',
    address: '160 E 46th St, New York, NY 10017',
    latitude: 40.7535,
    longitude: -73.9685,
    type: 'bar',
  },
  {
    name: 'Angel\'s Share',
    address: '8 E 36th St, New York, NY 10016',
    latitude: 40.7481,
    longitude: -73.9742,
    type: 'bar',
  },
  {
    name: 'Please Don\'t Tell (PDT)',
    address: '113 St Marks Pl, New York, NY 10009',
    latitude: 40.7267,
    longitude: -73.9849,
    type: 'bar',
  },
  {
    name: 'Employees Only',
    address: '510 Hudson St, New York, NY 10014',
    latitude: 40.7356,
    longitude: -74.0038,
    type: 'bar',
  },
  {
    name: 'Atera',
    address: '77 Worth St, New York, NY 10013',
    latitude: 40.7169,
    longitude: -74.0034,
    type: 'bar',
  },
  {
    name: 'Rockwood Music Hall',
    address: '196 Allen St, New York, NY 10002',
    latitude: 40.7191,
    longitude: -73.9797,
    type: 'club',
  },
  {
    name: 'Mercury Lounge',
    address: '217 E Houston St, New York, NY 10002',
    latitude: 40.7214,
    longitude: -73.9786,
    type: 'club',
  },
  {
    name: 'Baby\'s All Right',
    address: '146 Broadway, Brooklyn, NY 11249',
    latitude: 40.7168,
    longitude: -73.9570,
    type: 'bar',
  },
  {
    name: 'Schimanski',
    address: '54 N 4th St, Brooklyn, NY 11249',
    latitude: 40.7148,
    longitude: -73.9599,
    type: 'bar',
  },
  {
    name: 'Lodge',
    address: '412 Park Ave S, New York, NY 10016',
    latitude: 40.7442,
    longitude: -73.9817,
    type: 'club',
  },
  {
    name: 'Pacha NYC',
    address: '618 W 46th St, New York, NY 10036',
    latitude: 40.7609,
    longitude: -73.9917,
    type: 'club',
  },
  {
    name: 'Lily Pad',
    address: '93 Eldridge St, New York, NY 10002',
    latitude: 40.7201,
    longitude: -73.9799,
    type: 'bar',
  },
];

async function seedBars() {
  try {
    console.log('Seeding bars...');

    for (const bar of nyxBars) {
      const barRef = db.ref('bars').push();
      await barRef.set({
        ...bar,
        createdAt: admin.database.ServerValue.TIMESTAMP,
      });
      console.log(`✓ Added ${bar.name}`);
    }

    console.log('\n✓ All bars seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding bars:', error);
    process.exit(1);
  }
}

seedBars();
