import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { supabaseAdmin, ensureBucket } from '../../../lib/supabaseAdmin';
import { HumeClient } from 'hume';
import { getChatResponse } from '../../../lib/gemini';

// Ensure this route runs on Node.js (Prisma not supported on Edge)
export const runtime = 'nodejs';
// Prevent static optimization attempts during build
export const dynamic = 'force-dynamic';

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY || '',
});

// Retry helper for Supabase Storage uploads
async function uploadWithRetry(
  filePath: string,
  buffer: Buffer,
  contentType: string,
  retries = 3
) {
  for (let i = 0; i < retries; i++) {
    const { error } = await supabaseAdmin.storage
      .from('audio-analyses')
      .upload(filePath, buffer, { contentType });

    if (!error) return null; // success
    console.warn(`Upload attempt ${i + 1} failed:`, error.message);
    await new Promise((r) => setTimeout(r, 1000)); // wait 1s before retry
  }
  return new Error('Failed to upload after multiple attempts');
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file found' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Replace with real authenticated user ID later
    const userId = 'test-user-id';

    const filePath = `audio/${userId}/${Date.now()}_${file.name}`;

    // Ensure bucket exists before upload
    await ensureBucket('audio-analyses', { public: false, allowedMimeTypes: ['audio/*'] });
    const uploadError = await uploadWithRetry(filePath, buffer, file.type, 3);
    if (uploadError) {
      console.error('Supabase upload failed after retries:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('audio-analyses')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    // Analyze with Hume AI
    const job = await hume.expressionMeasurement.batch.startInferenceJob({
      models: { language: {} },
      urls: [publicUrl],
    });

    await job.awaitCompletion();

    const predictions = await hume.expressionMeasurement.batch.getJobPredictions(job.jobId);
    const languagePred = predictions?.[0]?.results?.predictions?.[0]?.models?.language as any;
    const transcript = (languagePred?.text ?? '').substring(0, 5000);
    const sentiment = languagePred?.sentiment ?? {};

    // Get Gemini response
    const prompt = `Transcript: ${transcript}. Tone analysis: ${JSON.stringify(
      sentiment
    )}. Task: respond empathetically.`;
    const geminiResponse = await getChatResponse([], prompt);

    // Save to DB
    const analysis = await prisma.audioAnalysis.create({
      data: { userId, transcript, sentiment, geminiResponse },
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error in analyze-audio route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
