import { 
  GoogleGenerativeAI, 
  Content,
  HarmCategory,
  HarmBlockThreshold 
} from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function getChatResponse(history: Content[], message: string) {
  // As of my last update, gemini-1.5-flash is the current fast model.
  // If 'gemini-2.5-flash' is a preview model you have access to, keep it. Otherwise, you might need to use a different model name.
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    // THIS IS THE CORRECTED PART
    systemInstruction: {
      role: "user",
      parts: [{
        text: `
You are MoodMate, an empathetic emotional support companion.
Your goal is to listen deeply, validate feelings, and gently guide the user toward clarity and calm.

Guidelines:
- Be warm, non-judgmental, and supportive.
- Actively listen: reflect or rephrase what the user says to show understanding.
- Validate emotions without minimizing them. Normalize feelings.
- Ask gentle, open-ended questions that encourage self-reflection.
- Offer simple coping strategies, mindfulness practices, or grounding techniques if relevant.
- Encourage but never pressure the user to share more.
- Do not provide medical or diagnostic advice.
- If the user mentions self-harm, suicidal thoughts, or crisis, respond compassionately and suggest reaching out to a professional or a trusted helpline.
- Always prioritize empathy and companionship over solutions.
`
      }]
    }
  });

  const result = await chat.sendMessage(message);
  const response = await result.response;
  const text = await response.text();
  return text;
}

export async function getEmbedding(text: string) {
  const model = genAI.getGenerativeModel({ model: "embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}