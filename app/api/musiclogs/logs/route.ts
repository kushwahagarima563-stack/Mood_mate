import { NextResponse } from "next/server";
import {prisma} from "../../../../lib/prisma"; // make sure you have prisma client setup

export async function GET() {
  try {
    const musicLogs = await prisma.musicLog.findMany({
      orderBy: { played_at: "desc" },
    });

    const faceEmotionLogs = await prisma.faceEmotionLog.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ musicLogs, faceEmotionLogs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
