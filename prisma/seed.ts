import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding test user...');

  // Create household
  const household = await prisma.household.upsert({
    where: { id: 'test-household-1' },
    update: {},
    create: {
      id: 'test-household-1',
      name: 'The Test Family',
    },
  });
  console.log('✓ Household created:', household.name);

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@familyos.app' },
    update: {
      householdId: household.id,
    },
    create: {
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@familyos.app',
      emailVerified: new Date(),
      householdId: household.id,
    },
  });
  console.log('✓ User created:', user.email);

  // Create family member profile
  await prisma.familyMember.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      householdId: household.id,
      displayName: 'Test Parent',
      role: 'parent_a',
      color: '#6366F1',
    },
  });
  console.log('✓ Family member profile created');

  // Create a session that expires in 30 days
  const sessionToken = 'test-session-token-' + Date.now();
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  await prisma.session.upsert({
    where: { sessionToken },
    update: { expires },
    create: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });
  console.log('✓ Session created');
  console.log('\n📋 Session token:', sessionToken);
  console.log('\n🍪 To use this session, set this cookie in your browser:');
  console.log(`   next-auth.session-token=${sessionToken}`);
  console.log('\n   Or run this in browser console:');
  console.log(`   document.cookie = "next-auth.session-token=${sessionToken}; path=/"`);

  // Create some sample children
  const child1 = await prisma.childProfile.upsert({
    where: { id: 'test-child-1' },
    update: {},
    create: {
      id: 'test-child-1',
      householdId: household.id,
      name: 'Emma',
      avatarEmoji: '🦋',
      color: '#EC4899',
      birthdate: new Date('2019-03-15'),
    },
  });
  console.log('✓ Child created:', child1.name);

  const child2 = await prisma.childProfile.upsert({
    where: { id: 'test-child-2' },
    update: {},
    create: {
      id: 'test-child-2',
      householdId: household.id,
      name: 'Jake',
      avatarEmoji: '🚀',
      color: '#3B82F6',
      birthdate: new Date('2021-08-22'),
    },
  });
  console.log('✓ Child created:', child2.name);

  // Create some sample tasks
  const weekKey = getWeekKey();

  await prisma.task.upsert({
    where: { id: 'test-task-1' },
    update: {},
    create: {
      id: 'test-task-1',
      householdId: household.id,
      weekKey,
      title: 'Book soccer practice for Emma',
      type: 'standalone',
      status: 'pending',
      priority: 'high',
      assignedTo: 'parent_a',
      childId: child1.id,
      createdBy: user.id,
    },
  });

  await prisma.task.upsert({
    where: { id: 'test-task-2' },
    update: {},
    create: {
      id: 'test-task-2',
      householdId: household.id,
      weekKey,
      title: 'Confirm babysitter for Friday',
      type: 'event-prep',
      status: 'pending',
      priority: 'normal',
      assignedTo: 'both',
      createdBy: user.id,
    },
  });

  await prisma.task.upsert({
    where: { id: 'test-task-3' },
    update: {},
    create: {
      id: 'test-task-3',
      householdId: household.id,
      weekKey,
      title: 'Call pediatrician about vaccines',
      type: 'decision-followup',
      status: 'completed',
      priority: 'normal',
      assignedTo: 'parent_a',
      childId: child2.id,
      createdBy: user.id,
      completedAt: new Date(),
      completedBy: user.id,
    },
  });

  console.log('✓ Sample tasks created');

  // Create a week snapshot for analytics
  await prisma.weekSnapshot.upsert({
    where: {
      householdId_weekKey: {
        householdId: household.id,
        weekKey,
      },
    },
    update: {},
    create: {
      householdId: household.id,
      weekKey,
      parentAEvents: 12,
      parentBEvents: 9,
      parentAHandoffs: 4,
      parentBHandoffs: 3,
      parentASoloDays: 1,
      parentBSoloDays: 2,
      totalEvents: 21,
      conflictCount: 2,
      conflictResolved: 1,
      intensity: 'moderate',
      ritualCompletedAt: new Date(),
      prepItemsTotal: 8,
      prepItemsCompleted: 6,
      tasksTotal: 3,
      tasksCompleted: 1,
    },
  });

  // Create a previous week snapshot for trends
  const prevWeekKey = getPrevWeekKey();
  await prisma.weekSnapshot.upsert({
    where: {
      householdId_weekKey: {
        householdId: household.id,
        weekKey: prevWeekKey,
      },
    },
    update: {},
    create: {
      householdId: household.id,
      weekKey: prevWeekKey,
      parentAEvents: 10,
      parentBEvents: 11,
      parentAHandoffs: 3,
      parentBHandoffs: 4,
      parentASoloDays: 2,
      parentBSoloDays: 1,
      totalEvents: 18,
      conflictCount: 1,
      conflictResolved: 1,
      intensity: 'light',
      ritualCompletedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      prepItemsTotal: 5,
      prepItemsCompleted: 5,
      tasksTotal: 2,
      tasksCompleted: 2,
    },
  });

  console.log('✓ Week snapshots created for analytics');

  console.log('\n✅ Seed completed successfully!');
}

function getWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getPrevWeekKey(): string {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  const year = now.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
