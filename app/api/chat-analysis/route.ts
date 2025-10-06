import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Fetch all chat sessions (you can filter by userId if auth is implemented)
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: 'Failed to fetch chat sessions.' }, { status: 500 });
  }
}
