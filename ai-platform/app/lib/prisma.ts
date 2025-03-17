import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Check if the database file exists
const dbFilePath = path.resolve(process.cwd(), 'prisma/dev.db');
if (!fs.existsSync(dbFilePath) && process.env.NODE_ENV === 'development') {
  console.warn(`⚠️ SQLite database file not found at: ${dbFilePath}`);
  console.warn('Please ensure the database file exists and has proper permissions.');
}

// Initialize Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: `file:${dbFilePath}`
      }
    }
  });
}

const prisma = globalForPrisma.prisma;

export default prisma;