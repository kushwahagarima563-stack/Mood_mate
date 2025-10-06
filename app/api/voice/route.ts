import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { prisma } from '../../../lib/prisma';

// Environment variables should be configured in your .env file
const AUDIO_BUCKET = process.env.AUDIO_BUCKET || 'audio_analyses';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// Next.js Route Segment Config
export const runtime = 'nodejs';
export const maxDuration = 60; // Max duration for the entire serverless function execution

/**
 * Creates a short-lived signed URL for a file in Supabase storage if the input is a path.
 * If the input is already a full URL, it returns it directly.
 * @param {string} pathOrUrl - The storage path or a full HTTP URL.
 * @returns {Promise<string>} A publicly accessible URL for the audio file.
 */
async function getSignedUrlIfNeeded(pathOrUrl: string): Promise<string> {
  console.log('[DEBUG] getSignedUrlIfNeeded called with:', pathOrUrl);
  if (pathOrUrl.startsWith('http')) {
    return pathOrUrl;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(pathOrUrl, 60 * 5); // 5-minute expiry is sufficient

  if (error || !data?.signedUrl) {
    console.error('[DEBUG] Supabase signed URL creation error:', error);
    throw new Error('Failed to create signed URL. Check bucket name and file path.');
  }

  console.log('[DEBUG] Signed URL created successfully.');
  return data.signedUrl;
}

/**
 * Downloads a file from a URL and returns it as a Blob.
 * @param {string} url - The URL of the file to download.
 * @returns {Promise<Blob>} The downloaded file content as a Blob.
 */
async function downloadAsBlob(url: string): Promise<Blob> {
  console.log('[DEBUG] downloadAsBlob called with URL:', url);
  const response = await fetch(url);
  if (!response.ok) {
    console.error('[DEBUG] Audio download failed:', response.status, response.statusText);
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Downloaded audio file is empty.');
  }

  console.log('[DEBUG] Audio downloaded successfully, size:', arrayBuffer.byteLength);
  // We don't know the exact mime type here, but it's not critical for the next step.
  return new Blob([arrayBuffer]);
}

/**
 * Transcribes an audio blob using the Deepgram API.
 * This function uses FormData to send the audio file.
 * @param {Blob} fileBlob - The audio data as a Blob.
 * @returns {Promise<string>} The transcribed text.
 */
async function transcribeWithDeepgram(fileBlob: Blob): Promise<string> {
  if (!DEEPGRAM_API_KEY) throw new Error('DEEPGRAM_API_KEY is not configured in environment variables.');
  
  // If the blob is empty (e.g., silent audio), return an empty string immediately.
  if (fileBlob.size === 0) {
    console.warn("[DEBUG] Audio file is empty, returning empty transcript.");
    return "";
  }

  const form = new FormData();
  // Deepgram expects a file upload, so we wrap the Blob in a File object.
  form.append('file', new File([fileBlob], 'audio.webm', { type: 'audio/webm' }));

  const resp = await fetch('https://api.deepgram.com/v1/listen?punctuate=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`
      // Note: 'Content-Type' is set automatically by fetch() when using FormData.
    },
    body: form
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error('[DEBUG] Deepgram API error response:', errorText);
    throw new Error(`Deepgram transcription failed: ${resp.status} ${errorText}`);
  }

  const json = await resp.json();
  const transcript = json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';
  return transcript;
}


/**
 * The main API handler for processing audio, transcribing it, and getting a chat response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[DEBUG] Request body received:', body);

    const { sessionId, pathOrUrl, userId = 'anonymous' } = body;
    if (!sessionId || !pathOrUrl) {
      return NextResponse.json({ error: 'Missing required fields: sessionId and pathOrUrl are required.' }, { status: 400 });
    }

    // Step 1: Get a usable URL for the audio file.
    const signedUrl = await getSignedUrlIfNeeded(pathOrUrl);

    // Step 2: Download the audio file as a Blob.
    const audioBlob = await downloadAsBlob(signedUrl);

    // Step 3: Transcribe the audio blob to text using your specified function.
    const transcript = await transcribeWithDeepgram(audioBlob);
    console.log('[DEBUG] Transcript obtained:', transcript);

    // If transcription is empty (e.g., silence), we can return a canned response without calling the chat API.
    if (!transcript) {
        return NextResponse.json({
            sessionId,
            transcript: "",
            chatResponse: "I didn't quite catch that. Could you please say it again?",
        });
    }

    // Step 4: Ensure the session exists in the database, creating one if necessary.
    let currentSessionId = sessionId;
    const existingSession = await prisma.session.findUnique({ where: { id: sessionId } });
    
    if (!existingSession) {
        console.log('[DEBUG] Session not found. Creating a new session...');
        let user;

        if (userId && userId !== 'anonymous') {
          user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user) console.warn(`[DEBUG] User with ID ${userId} not found. Falling back to default user.`);
        }

        if (!user) {
          user = await prisma.user.upsert({
            where: { email: 'default@example.com' },
            update: {},
            create: { email: 'default@example.com', name: 'Default User' },
          });
        }
        
        const newSession = await prisma.session.create({ data: { userId: user.id } });
        currentSessionId = newSession.id;
        console.log(`[DEBUG] Created and using new session ID: ${currentSessionId} for user: ${user.email}`);
    } else {
        console.log(`[DEBUG] Confirmed using existing session ID: ${currentSessionId}`);
    }

    // Step 5: Send the transcript to the /api/chat endpoint.
    console.log('[DEBUG] Sending transcript to /api/chat');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl || !baseUrl.startsWith('http')) {
        console.error('[ERROR] NEXT_PUBLIC_BASE_URL is not defined or is invalid. Please set it in your .env.local file to the full URL of your application (e.g., http://localhost:3000).');
        throw new Error('Server configuration error: NEXT_PUBLIC_BASE_URL is not set.');
    }
    const chatApiUrl = `${baseUrl}/api/chat`;
    
    const chatRes = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        message: transcript,
        history: [] // Pass chat history here if available
      })
    });

    if (!chatRes.ok) {
        const errorText = await chatRes.text();
        console.error(`[DEBUG] Call to /api/chat failed with status ${chatRes.status}:`, errorText);
        throw new Error('Failed to get a response from the chat service.');
    }

    const chatData = await chatRes.json();
    console.log('[DEBUG] Received response from /api/chat:', chatData);

    // Step 6: Return the final combined response to the client.
    return NextResponse.json({
      transcript,
      chatResponse: chatData.text,
      sessionId: chatData.sessionId
    });

  } catch (err: any) {
    console.error('[DEBUG] An unexpected error occurred in the POST handler:', err);
    // Return a generic error message to the client for security.
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

