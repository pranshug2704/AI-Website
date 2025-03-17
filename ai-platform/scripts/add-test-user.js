
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Hash the test password
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Test user
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      subscription: 'free'
    };
    
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: testUser.email }
    });
    
    if (!existing) {
      // Create user
      await prisma.user.create({
        data: {
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
          subscription: testUser.subscription,
          usageLimit: 100000,
          usageTotal: 0
        }
      });
      console.log('Created test user:', testUser.email);
    } else {
      console.log('Test user already exists:', testUser.email);
    }
    
    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

