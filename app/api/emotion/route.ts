import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const photo = formData.get("photo") as Blob;
  if (!photo) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }

  const apiKey = process.env.LUXAND_API_KEY; // store securely in .env

  const luxandForm = new FormData();
  luxandForm.append("photo", photo, "photo.jpg");

  try {
    const response = await fetch("https://api.luxand.cloud/photo/emotions", {
      method: "POST",
      headers: {
        token: apiKey!,
      },
      body: luxandForm,
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Luxand API error" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
