
import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse, getEmbedding } from '../../../lib/gemini';
import { supabase } from '../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 });
    }

    // 1. Get the user's message and generate an embedding for it.
    const userMessageEmbedding = await getEmbedding(message);

    // 2. Find relevant past messages using vector similarity search with Supabase.
    const { data: similarMessages, error: supabaseError } = await supabase.rpc('match_messages', {
      query_embedding: userMessageEmbedding,
      match_threshold: 0.78,
      match_count: 5,
      session_id: sessionId,
    });

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return NextResponse.json({ error: 'Error fetching similar messages' }, { status: 500 });
    }

    // 3. Construct the prompt for the Gemini API.
    const history = (similarMessages as any[]).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    // 4. Send the prompt to the Gemini API and get the response.
    const text = await getChatResponse(history, message);

    // 5. Store the user's message and the AI's response in the database.
    const userMessageToStore = {
      content: message,
      role: 'user',
      sessionId: sessionId,
      embedding: userMessageEmbedding,
    };

    const aiMessageToStore = {
      content: text,
      role: 'model',
      sessionId: sessionId,
      embedding: await getEmbedding(text),
    };

    const { error: insertError } = await supabase.from('messages').insert([userMessageToStore, aiMessageToStore]);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json({ error: 'Error saving messages' }, { status: 500 });
    }

    // 6. Return the AI's response.
    return NextResponse.json({ response: text });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
