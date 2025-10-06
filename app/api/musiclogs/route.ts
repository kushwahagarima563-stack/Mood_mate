import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { emotion, weather, song_title, song_id, played_at } = body;

    // Validate required fields
    if (!emotion || !weather || !song_title || !song_id) {
      return NextResponse.json(
        { error: "Missing required fields: emotion, weather, song_title, song_id" },
        { status: 400 }
      );
    }

    // Create music log entry
    const musicLog = await prisma.musicLog.create({
      data: {
        emotion,
        weather,
        song_title,
        song_id,
        played_at: played_at ? new Date(played_at) : new Date(),
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        data: musicLog,
        message: "Music log created successfully" 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating music log:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to create music log", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emotion = searchParams.get("emotion");
    const weather = searchParams.get("weather");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build where clause based on filters
    const where: any = {};
    if (emotion) where.emotion = emotion;
    if (weather) where.weather = weather;

    // Fetch music logs with optional filters
    const musicLogs = await prisma.musicLog.findMany({
      where,
      orderBy: {
        played_at: "desc",
      },
      take: limit,
    });

    return NextResponse.json(
      { 
        success: true, 
        count: musicLogs.length,
        data: musicLogs 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching music logs:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch music logs", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    // Delete music log by id
    const deletedLog = await prisma.musicLog.delete({
      where: { id },
    });

    return NextResponse.json(
      { 
        success: true, 
        data: deletedLog,
        message: "Music log deleted successfully" 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting music log:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to delete music log", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}