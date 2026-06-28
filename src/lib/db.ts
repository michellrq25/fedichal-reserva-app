// Initialize Prisma Client with PostgreSQL adapter configuration
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Neither DATABASE_URL nor POSTGRES_PRISMA_URL is defined in environment variables.");
  }
  
  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  
  if (!isLocal && connectionString.includes("?")) {
    connectionString = connectionString.split("?")[0];
  }
  
  const poolConfig: any = { connectionString };
  if (!isLocal) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }
  
  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
