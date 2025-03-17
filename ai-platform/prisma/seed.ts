import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create demo users if they don't exist
  const demoUsers = [
    {
      name: 'Free User',
      email: 'free@example.com',
      password: 'password',
      subscription: 'free',
      usageLimit: 100000,
      usageTotal: 1245
    },
    {
      name: 'Pro User',
      email: 'pro@example.com',
      password: 'password',
      subscription: 'pro',
      usageLimit: 1000000,
      usageTotal: 352890
    },
    {
      name: 'Enterprise User',
      email: 'enterprise@example.com',
      password: 'password',
      subscription: 'enterprise',
      usageLimit: 10000000,
      usageTotal: 1237845
    }
  ];

  for (const user of demoUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (!existingUser) {
      const hashedPassword = await hash(user.password, 10);
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          subscription: user.subscription,
          usageLimit: user.usageLimit,
          usageTotal: user.usageTotal
        }
      });
      console.log(`Created demo user: ${user.name} (${user.email})`);
    } else {
      console.log(`Demo user already exists: ${user.email}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });