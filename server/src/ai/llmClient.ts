import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Groq client - fast responses for live debate
export const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Fast model for during-debate responses
export const FAST_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Reasoning model for post-debate analysis
export const ANALYSIS_MODEL = 'llama-3.3-70b-versatile';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Retry wrapper for rate limits (HTTP 429). Groq free tier throttles bursts,
// so we back off and retry instead of failing the whole debate turn.
async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (status === 429 && attempt < maxRetries) {
        const wait = 1500 * (attempt + 1); // 1.5s, 3s, 4.5s
        console.warn(`[${label}] rate limited, retrying in ${wait}ms (attempt ${attempt + 1})`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function streamCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onChunk: (chunk: string) => void,
  model: string = FAST_MODEL
): Promise<string> {
  return withRetry(async () => {
    const stream = await groqClient.chat.completions.create({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 400,
      stream: true,
    });

    let full = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        full += content;
        onChunk(content);
      }
    }
    return full;
  }, 'stream');
}

export async function completion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string = ANALYSIS_MODEL,
  maxTokens: number = 1000
): Promise<string> {
  return withRetry(async () => {
    const response = await groqClient.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content || '';
  }, 'completion');
}
