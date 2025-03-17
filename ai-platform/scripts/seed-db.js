// Simple script to seed the database with test users
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Hash the test password
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Test users
    const users = [
      {
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        subscription: 'free'
      },
      {
        name: 'Free User',
        email: 'free@example.com',
        password: hashedPassword,
        subscription: 'free'
      }
    ];
    
    for (const user of users) {
      // Check if user exists
      const existing = await prisma.user.findUnique({
        where: { email: user.email }
      });
      
      if (\!existing) {
        // Create user
        await prisma.user.create({
          data: {
            name: user.name,
            email: user.email,
            password: user.password,
            subscription: user.subscription,
            usageLimit: 100000,
            usageTotal: 0
          }
        });
        console.log(`Created user: ${user.email}`);
      } else {
        console.log(`User already exists: ${user.email}`);
      }
    }
    
    console.log('Database seeded successfully\!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
