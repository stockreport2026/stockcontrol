import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const [orgCount, branchCount, staffCount, salesCount] = await Promise.all([
      prisma.organization.count(),
      prisma.branch.count(),
      prisma.staff.count(),
      prisma.staffSales.count(),
    ]);
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      counts: {
        organizations: orgCount,
        branches: branchCount,
        staff: staffCount,
        salesRecords: salesCount,
      },
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
