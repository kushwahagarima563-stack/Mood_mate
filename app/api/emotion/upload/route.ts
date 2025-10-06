import { NextRequest, NextResponse } from "next/server";
import {prisma }from "../../../../lib/prisma"; // make sure Prisma client is setup

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get("photo") as Blob;

    if (!photo) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    const apiKey = process.env.LUXAND_API_KEY;

    // Call Luxand API to detect emotions
    const luxandForm = new FormData();
    luxandForm.append("photo", photo, "photo.jpg");

    const luxandResponse = await fetch("https://api.luxand.cloud/photo/emotions", {
      method: "POST",
      headers: { token: apiKey! },
      body: luxandForm,
    });

    if (!luxandResponse.ok) {
      return NextResponse.json({ error: "Luxand API error" }, { status: luxandResponse.status });
    }

    const apiData = await luxandResponse.json();

    // Save response to Prisma DB
    const savedLog = await prisma.faceEmotionLog.create({
      data: {
        apiResponse: apiData,
      },
    });

    return NextResponse.json({ message: "Face emotion logged successfully", log: savedLog });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
