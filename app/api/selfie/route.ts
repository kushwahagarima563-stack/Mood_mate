import { Emotion } from "../../../lib/selfieTypes";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user_id: string | undefined = body?.user_id;
    const image_url: string | undefined = body?.image_url;
    const emotion: Emotion | undefined = body?.emotion;
    const storage_path: string | null = body?.storage_path ?? null; // optional

    if (!user_id || !image_url || !emotion) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, image_url, emotion' },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from('selfies')
      .insert({
        id: crypto.randomUUID(),
        user_id,
        image_url,
        emotion: emotion as Emotion,
        date: new Date().toISOString(),
        storage_bucket: 'selfies',
        storage_path,
      });

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, selfie: { user_id, image_url, emotion, date: new Date().toISOString() } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Optional filter by emotion: /api/selfie?emotion=happy
  const { searchParams } = new URL(req.url);
  const emotion = searchParams.get('emotion');
  const userId = searchParams.get('user_id') || undefined; // optional

  let query = supabaseAdmin
    .from('selfies')
    .select('*')
    .order('date', { ascending: false });

  if (emotion) query = query.eq('emotion', emotion as Emotion);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, selfies: data || [] });
}
