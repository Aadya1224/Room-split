import { PrismaClient, Category, SplitType, Frequency } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const [arjun, priya, rohan] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'arjun@example.com' },
      update: {},
      create: {
        email: 'arjun@example.com',
        name: 'Arjun Sharma',
        passwordHash: await bcrypt.hash('password123', 12),
      },
    }),
    prisma.user.upsert({
      where: { email: 'priya@example.com' },
      update: {},
      create: {
        email: 'priya@example.com',
        name: 'Priya Patel',
        passwordHash: await bcrypt.hash('password123', 12),
      },
    }),
    prisma.user.upsert({
      where: { email: 'rohan@example.com' },
      update: {},
      create: {
        email: 'rohan@example.com',
        name: 'Rohan Mehta',
        passwordHash: await bcrypt.hash('password123', 12),
      },
    }),
  ]);

  // Create a group
  const group = await prisma.group.upsert({
    where: { inviteCode: 'demo-apartment' },
    update: {},
    create: {
      name: 'Koramangala Flat',
      inviteCode: 'demo-apartment',
      createdBy: arjun.id,
      members: {
        create: [
          { userId: arjun.id, role: 'ADMIN' },
          { userId: priya.id, role: 'MEMBER' },
          { userId: rohan.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('✅ Created group:', group.name);

  // Create a recurring rent template
  await prisma.recurringTemplate.upsert({
    where: { id: 'seed-rent-template' },
    update: {},
    create: {
      id: 'seed-rent-template',
      groupId: group.id,
      description: 'Monthly Rent',
      amount: 30000,
      category: Category.RENT,
      splitType: SplitType.EQUAL,
      frequency: Frequency.MONTHLY,
      nextRunDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
  });

  console.log('✅ Created recurring rent template');
  console.log('\n📧 Demo accounts:');
  console.log('   arjun@example.com / password123');
  console.log('   priya@example.com / password123');
  console.log('   rohan@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
