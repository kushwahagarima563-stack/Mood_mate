import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const { content, userId } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'empty' }, { status: 400 });
    }

    // Minimal mood derivation; replace with real AI analysis later
    const text = content.toLowerCase();
    let mood = 'Neutral';
    if (/(happy|joy|glad|excited)/.test(text)) mood = 'Positive';
    else if (/(sad|angry|upset|depress|anxious|worried)/.test(text)) mood = 'Negative';

    const entry = await prisma.entry.create({
      data: {
        userId: userId ?? 'anonymous',
        content,
        mood,
      },
    });

    return NextResponse.json(entry);
  } catch (err: any) {
    console.error('Error in POST /journal:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const entries = await prisma.entry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(entries);
  } catch (err: any) {
    console.error('Error in GET /journal:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    );
  }
}
