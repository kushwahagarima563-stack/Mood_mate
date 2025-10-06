import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.url ? new URL(req.url) : { searchParams: null };
  const query = searchParams?.get("q");

  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
      query
    )}&key=${process.env.YOUTUBE_API_KEY}&maxResults=5`
  );

  const data = await res.json();
  return NextResponse.json(data);
}
