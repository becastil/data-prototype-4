import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers
 *
 * Returns:
 * - 200 OK if application and database are healthy
 * - 503 Service Unavailable if database connection fails
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime,
        database: 'connected',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected'
      },
      { status: 503 }
    );
  }
}
