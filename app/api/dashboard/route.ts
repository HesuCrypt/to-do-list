import { NextResponse } from 'next/server';
import { getAllDashboardData, saveAllDashboardData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getAllDashboardData();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Failed to retrieve dashboard data from SQLite:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    saveAllDashboardData(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to save dashboard data to SQLite:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save to database' },
      { status: 500 }
    );
  }
}
