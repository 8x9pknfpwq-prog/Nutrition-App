import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ~15 real East Village / Lower East Side bars with accurate-ish coordinates.
// distance is a display value in miles (relative to a notional center point).
const BARS = [
  { name: 'The Wren', address: '64 E 1st St', latitude: 40.72335, longitude: -73.99056, rating: 4.5, distance: 0.2 },
  { name: 'Pouring Ribbons', address: '225 Avenue B', latitude: 40.72705, longitude: -73.97874, rating: 4.6, distance: 0.6 },
  { name: 'Death & Co', address: '433 E 6th St', latitude: 40.72627, longitude: -73.98372, rating: 4.7, distance: 0.4 },
  { name: 'Amor y Amargo', address: '443 E 6th St', latitude: 40.72637, longitude: -73.98347, rating: 4.4, distance: 0.4 },
  { name: 'Rue B', address: '188 Avenue B', latitude: 40.72563, longitude: -73.97897, rating: 4.3, distance: 0.6 },
  { name: "Please Don't Tell", address: '113 St Marks Pl', latitude: 40.72732, longitude: -73.98463, rating: 4.6, distance: 0.5 },
  { name: "Angel's Share", address: '8 Stuyvesant St', latitude: 40.72967, longitude: -73.98893, rating: 4.5, distance: 0.6 },
  { name: 'Attaboy', address: '134 Eldridge St', latitude: 40.71903, longitude: -73.99124, rating: 4.7, distance: 0.7 },
  { name: 'Mr. Purple', address: '180 Orchard St', latitude: 40.72122, longitude: -73.98825, rating: 4.2, distance: 0.5 },
  { name: 'The Wayland', address: '700 E 9th St', latitude: 40.72595, longitude: -73.97763, rating: 4.4, distance: 0.7 },
  { name: 'Niagara', address: '112 Avenue A', latitude: 40.72588, longitude: -73.98392, rating: 4.1, distance: 0.4 },
  { name: 'Berlin', address: '25 Avenue A', latitude: 40.72268, longitude: -73.98742, rating: 4.2, distance: 0.3 },
  { name: 'Boilermaker', address: '13 First Ave', latitude: 40.72402, longitude: -73.98826, rating: 4.0, distance: 0.3 },
  { name: 'Bar Goto', address: '245 Eldridge St', latitude: 40.72236, longitude: -73.98968, rating: 4.5, distance: 0.4 },
  { name: 'Ten Bells', address: '247 Broome St', latitude: 40.71803, longitude: -73.99069, rating: 4.4, distance: 0.8 },
];

// A few demo accounts so the social layer has data out of the box.
const DEMO_USERS = [
  { email: 'maya@lineup.app', username: 'maya', password: 'password123' },
  { email: 'leo@lineup.app', username: 'leo', password: 'password123' },
  { email: 'sara@lineup.app', username: 'sara', password: 'password123' },
  { email: 'devin@lineup.app', username: 'devin', password: 'password123' },
];

async function main() {
  console.log('🌱  Seeding NYC Lines...');

  // Reset (order matters for FK constraints).
  await prisma.friendNotification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.bar.deleteMany();
  await prisma.user.deleteMany();

  const bars = [];
  for (const b of BARS) {
    bars.push(await prisma.bar.create({ data: b }));
  }
  console.log(`   • ${bars.length} bars`);

  const users = [];
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    users.push(
      await prisma.user.create({
        data: {
          email: u.email,
          username: u.username,
          passwordHash,
          avatarInitial: u.username[0].toUpperCase(),
        },
      })
    );
  }
  console.log(`   • ${users.length} demo users (password: "password123")`);

  // Make everyone friends with maya (accepted), plus one pending request.
  const [maya, leo, sara, devin] = users;
  await prisma.friendship.createMany({
    data: [
      { fromUserId: maya.id, toUserId: leo.id, status: 'accepted' },
      { fromUserId: maya.id, toUserId: sara.id, status: 'accepted' },
      { fromUserId: devin.id, toUserId: maya.id, status: 'pending' },
    ],
  });

  // Seed recent reports so wait times render immediately.
  const now = Date.now();
  const minsAgo = (m) => new Date(now - m * 60 * 1000);
  const reportPlan = [
    // bar index, [ [waitMin, minutesAgo], ... ]
    [0, [[5, 4], [8, 20], [6, 55]]], // The Wren — short
    [2, [[40, 6], [45, 18], [35, 50], [50, 80]]], // Death & Co — long
    [1, [[18, 10], [22, 35]]], // Pouring Ribbons — moderate
    [5, [[60, 8], [55, 25]]], // PDT — long
    [7, [[30, 12], [25, 40], [35, 70]]], // Attaboy — moderate/long
    [10, [[3, 9]]], // Niagara — single short report
    [8, [[12, 15], [9, 45]]], // Mr. Purple — short/moderate
    [11, [[0, 7], [5, 33]]], // Berlin — short
  ];
  let reportCount = 0;
  for (const [barIdx, entries] of reportPlan) {
    for (const [waitMin, ago] of entries) {
      const user = users[reportCount % users.length];
      await prisma.report.create({
        data: {
          barId: bars[barIdx].id,
          userId: user.id,
          waitMin,
          createdAt: minsAgo(ago),
        },
      });
      reportCount++;
    }
  }
  console.log(`   • ${reportCount} recent reports`);

  // Friend check-ins (FriendNotification) so the map shows friend avatars.
  await prisma.friendNotification.create({
    data: { userId: leo.id, barId: bars[0].id, createdAt: minsAgo(4) }, // Leo @ The Wren
  });
  await prisma.friendNotification.create({
    data: { userId: sara.id, barId: bars[2].id, createdAt: minsAgo(12) }, // Sara @ Death & Co
  });

  console.log('✅  Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
