import { NextResponse } from 'next/server';
import { getChatResponse } from '../../../lib/gemini';
import { prisma } from '../../../lib/prisma';
import { Content } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { history, message, sessionId } = await req.json();

    let currentSessionId = sessionId;

    // Ensure we have a valid session: create if missing or if provided id doesn't exist
    if (!currentSessionId) {
      let defaultUser = await prisma.user.findUnique({ where: { email: 'default@example.com' } });
      if (!defaultUser) {
        defaultUser = await prisma.user.create({ data: { email: 'default@example.com', name: 'Default User' } });
      }
      const newSession = await prisma.session.create({ data: { userId: defaultUser.id } });
      currentSessionId = newSession.id;
    } else {
      const exists = await prisma.session.findUnique({ where: { id: currentSessionId } });
      if (!exists) {
        let defaultUser = await prisma.user.findUnique({ where: { email: 'default@example.com' } });
        if (!defaultUser) {
          defaultUser = await prisma.user.create({ data: { email: 'default@example.com', name: 'Default User' } });
        }
        const newSession = await prisma.session.create({ data: { userId: defaultUser.id } });
        currentSessionId = newSession.id;
      }
    }

    // Save user message - THE FIX IS APPLIED HERE
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        session: {
          connect: {
            id: currentSessionId,
          },
        },
      },
    });

    const text = await getChatResponse(history as Content[], message);

    // Save assistant response - THE FIX IS APPLIED HERE
    await prisma.message.create({
      data: {
        role: 'assistant',
        content: text,
        session: {
          connect: {
            id: currentSessionId,
          },
        },
      },
    });

    return NextResponse.json({ text, sessionId: currentSessionId });
  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}