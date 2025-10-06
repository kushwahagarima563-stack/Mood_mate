import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const AUDIO_BUCKET = process.env.AUDIO_BUCKET || 'audio-analyses';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const sessionId = (form.get('sessionId') as string) || 'no-session';
    const userId = (form.get('userId') as string) || 'anonymous';

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Basic validations
    if (buffer.length < 2000) {
      return NextResponse.json({ error: 'Audio too short or empty' }, { status: 400 });
    }

    const ext = file.type.includes('webm') ? 'webm' : file.type.includes('mp4') || file.type.includes('m4a') ? 'm4a' : 'webm';
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `${userId}/${sessionId}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || 'audio/webm' });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    const { data: signed } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(storagePath, 60 * 60); // 1 hour

    return NextResponse.json({
      storagePath,
      bucket: AUDIO_BUCKET,
      signedUrl: signed?.signedUrl || null,
      mimeType: file.type,
    });
  } catch (err) {
    console.error('Error in /api/audio/upload:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
