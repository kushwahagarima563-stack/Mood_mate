import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error in GET /api/sessions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
