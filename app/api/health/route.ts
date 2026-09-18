import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const orgCount = await prisma.organization.count();
    const branchCount = await prisma.branch.count();
    const salesCount = await prisma.dailySale.count();
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      counts: { organizations: orgCount, branches: branchCount, sales: salesCount },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      database: 'error',
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
