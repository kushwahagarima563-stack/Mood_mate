import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';

// Helper: generate a friendly summary from dominant emotion
function generateSummary(emotion: string, _scores: Record<string, number>) {
  const summaries: Record<string, string[]> = {
    happy: [
      "You're radiating joy today!",
      "You look cheerful and bright!",
      "Your smile is contagious!",
    ],
    sad: [
      "You seem a bit down today. Take care of yourself.",
      "Looks like you're feeling melancholic.",
      "Remember, it's okay to have tough days.",
    ],
    angry: [
      "You seem a bit tense. Take a deep breath!",
      "Looks like something's bothering you.",
      "Try to find some calm in your day.",
    ],
    surprised: [
      "You look surprised! Something exciting happen?",
      "Your expression shows amazement!",
      "You seem caught off guard!",
    ],
    neutral: [
      "You're looking calm and composed.",
      "A peaceful, neutral expression today.",
      "You seem relaxed and centered.",
    ],
    fearful: [
      "You seem a bit anxious. Everything okay?",
      "Your expression shows some worry.",
      "Take a moment to relax and breathe.",
    ],
  };
  const messages = summaries[emotion] || summaries.neutral;
  return messages[Math.floor(Math.random() * messages.length)];
}

async function analyzeWithAzure(imageUrl: string) {
  const endpoint = process.env.AZURE_FACE_ENDPOINT;
  const apiKey = process.env.AZURE_FACE_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error('Azure Face API credentials not configured');
  }

  const resp = await fetch(
    `${endpoint}/face/v1.0/detect?returnFaceAttributes=emotion`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body: JSON.stringify({ url: imageUrl }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Azure Face API request failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No face detected in image');
  }

  const emotions = data[0]?.faceAttributes?.emotion as Record<string, number> | undefined;
  if (!emotions) throw new Error('Missing emotion attributes in Azure response');

  let maxEmotion = 'neutral';
  let maxScore = -1;
  for (const [k, v] of Object.entries(emotions)) {
    const score = typeof v === 'number' ? v : Number(v);
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = k;
    }
  }

  return {
    emotion: maxEmotion,
    emotion_scores: emotions,
    summary: generateSummary(maxEmotion, emotions),
  };
}

function analyzeMock(fileName?: string) {
  const emos = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fearful'];
  const emotion = emos[Math.floor(Math.random() * emos.length)];
  const scores: Record<string, number> = {};
  for (const e of emos) {
    scores[e] = e === emotion ? 0.85 : Math.random() * 0.15;
  }
  // Slightly bias based on filename for deterministic dev testing
  if (fileName) {
    const idx = fileName.length % emos.length;
    const chosen = emos[idx];
    for (const e of emos) scores[e] = e === chosen ? 0.9 : Math.random() * 0.1;
    return { emotion: chosen, emotion_scores: scores, summary: generateSummary(chosen, scores) };
  }
  return { emotion, emotion_scores: scores, summary: generateSummary(emotion, scores) };
}

export async function POST(req: NextRequest) {
  try {
    // Create a Supabase client with cookies for auth in App Router
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options?: CookieOptions) {
            try {
              // In Route Handlers, cookies() supports set
              cookieStore.set({ name, value, ...options });
            } catch {
              // no-op if not supported in this context
            }
          },
          remove(name: string, options?: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch {
              // no-op if not supported
            }
          },
        },
      }
    );

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Storage bucket "selfies" under user folder
    const fileExt = file.name.split('.').pop() || 'jpg';
    const objectName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(objectName, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // Public URL (works if bucket is public)
    const { data: pub } = supabase.storage.from('selfies').getPublicUrl(objectName);
    const publicUrl = pub.publicUrl;

    // Analyze emotion: Azure if configured, otherwise mock
    let analysis;
    if (process.env.AZURE_FACE_API_KEY && process.env.AZURE_FACE_ENDPOINT) {
      analysis = await analyzeWithAzure(publicUrl);
    } else {
      console.warn('Using mock emotion analysis. Configure Azure env vars for production.');
      analysis = analyzeMock(file.name);
    }

    // Persist to DB table selfie_logs
    const { data: insert, error: dbError } = await supabase
      .from('selfie_logs')
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        emotion: analysis.emotion,
        emotion_scores: analysis.emotion_scores,
        summary: analysis.summary,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save selfie log' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: insert });
  } catch (err) {
    console.error('Error processing selfie:', err);
    return NextResponse.json({ error: 'Failed to process selfie' }, { status: 500 });
  }
}
