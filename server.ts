import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GoogleGenAI,
  type Content,
  type GenerateContentResponse,
  type Part,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-flash-lite-latest';
const CHAT_MODEL_CHAIN = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
] as const;
const TRANSCRIBE_MODEL_CHAIN = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
] as const;
const IMAGE_MODEL_NAME = 'gemini-3.1-flash-lite-image';
const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4']);
const STREAM_TIMEOUT_MS = 30000;
const STREAM_MULTIMODAL_TIMEOUT_MS = 45000;
const STREAM_MID_CHUNK_TIMEOUT_MS = 30000;
const TRANSCRIBE_TIMEOUT_MS = 30000;
const IMAGE_GENERATION_TIMEOUT_MS = 45000;
const MAX_HISTORY_MESSAGES = 14;
const MAX_INLINE_HISTORY_USER_TURNS = 2;
const MAX_ATTACHMENTS_PER_MESSAGE = 6;
const MAX_TEXT_ATTACHMENT_CHARS = 2 * 1024 * 1024;
const MAX_BINARY_BASE64_CHARS = 26 * 1024 * 1024; // ~19.5 MB binary
const MODEL_UNAVAILABLE_COOLDOWN_MS = 60 * 60 * 1000;

const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const unavailableModelUntil = new Map<string, number>();

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

type AttachmentKind = 'image' | 'pdf' | 'audio' | 'text';
type PromptComplexity = 'simple' | 'standard' | 'complex';

interface IncomingAttachment {
  name?: string;
  mimeType?: string;
  kind?: string;
  data?: string;
}

interface ValidatedAttachment {
  name: string;
  mimeType: string;
  kind: AttachmentKind;
  data: string;
}

interface IncomingMessage {
  role: 'user' | 'assistant';
  content?: string;
  attachments?: IncomingAttachment[];
}

interface ValidatedMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments: ValidatedAttachment[];
}

interface ChatRequestBody {
  messages: IncomingMessage[];
  uiLanguage?: 'en' | 'am';
  responseLanguage?: 'auto' | 'en' | 'am';
}

const COMPLEX_PROMPT_PATTERN =
  /\b(explain in detail|step[- ]by[- ]step|deep dive|comprehensive|thorough|compare|contrast|analyze|analysis|architecture|algorithm|debug|refactor|implement|build me|write (?:a |the )?(?:code|function|script|app|program)|typescript|javascript|python|react|node\.?js|sql|css|html|calculus|integral|derivative|proof|theorem|equation|physics|chemistry|essay|research|strategy|roadmap|business plan|pros and cons)\b|(?:በዝርዝር|ዘርዘር|ደረጃ በደረጃ|ኮድ|ፕሮግራም|ትንታኔ|አወዳድር|አብራራልኝ|ጥልቅ)/i;

const SIMPLE_GREETING_PATTERN =
  /^(?:hi+|hello+|hey+|good\s*(?:morning|afternoon|evening|night)|how are you(?:\s+doing)?|what'?s up|sup|yo|thanks?(?:\s+(?:so\s+much|a\s+lot))?|thank you(?:\s+(?:so\s+much|very\s+much))?|ok(?:ay)?|cool|great|nice|bye|goodbye|see you|ሰላም(?:\s+ነው)?|ታዲያስ|እንዴት\s*(?:ነህ|ነሽ|ናችሁ)|እንደምን\s*(?:አለህ|አለሽ|አላችሁ)|አመሰግናለሁ|በጣም\s*አመሰግናለሁ|እሺ|ቻው)[!.?\s]*$/i;

function classifyPromptComplexity(messages: ValidatedMessage[]): {
  complexity: PromptComplexity;
  hasMultimodalOrLarge: boolean;
} {
  const hasMultimodalOrLarge = messages.some(
    (m) => m.attachments.length > 0 || m.content.length > 12000
  );
  if (hasMultimodalOrLarge) {
    return { complexity: 'complex', hasMultimodalOrLarge: true };
  }

  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  const text = latestUser?.content.trim() ?? '';

  if (text.length === 0) {
    return { complexity: 'simple', hasMultimodalOrLarge: false };
  }

  const lineCount = text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const questionMarks = (text.match(/\?|？/g) ?? []).length;

  if (
    text.length >= 200 ||
    lineCount >= 3 ||
    questionMarks >= 2 ||
    COMPLEX_PROMPT_PATTERN.test(text) ||
    text.includes('```')
  ) {
    return { complexity: 'complex', hasMultimodalOrLarge: false };
  }

  if (SIMPLE_GREETING_PATTERN.test(text)) {
    return { complexity: 'simple', hasMultimodalOrLarge: false };
  }

  return { complexity: 'standard', hasMultimodalOrLarge: false };
}

const systemInstructionCache = new Map<string, string>();

function buildSystemInstruction(
  uiLanguage: 'en' | 'am',
  responseLanguage: 'auto' | 'en' | 'am',
  complexity: PromptComplexity
): string {
  const cacheKey = `${uiLanguage}:${responseLanguage}:${complexity}`;
  const cached = systemInstructionCache.get(cacheKey);
  if (cached) return cached;

  const langRule =
    responseLanguage === 'am'
      ? 'Reply strictly in warm, natural, conversational Amharic (አማርኛ, Ethiopic script); do not mix or duplicate English unless asked.'
      : responseLanguage === 'en'
      ? 'Reply strictly in warm, natural, conversational English; do not duplicate Amharic unless asked.'
      : uiLanguage === 'am'
      ? 'Reply in warm, natural Amharic (አማርኛ) by default, or natural English if the user wrote in English. Never duplicate both languages unless asked.'
      : 'Match the user language naturally and warmly (English by default, or fluent conversational Amharic/አማርኛ if prompted in Amharic). Never duplicate both languages unless asked.';

  const depthRule =
    complexity === 'simple'
      ? 'Reply warmly, naturally, and briefly (1-2 conversational sentences) without stiff robotic phrasing.'
      : complexity === 'complex'
      ? 'Start streaming right away with a clear, friendly, easy-to-understand 1-2 sentence direct answer (no stiff preamble or upfront outline), then organize deeper explanations cleanly with clear steps, bullet points, runnable code, and helpful examples. Keep an encouraging, conversational tone and analyze attached files accurately.'
      : 'Start streaming right away with a warm, direct 1-2 sentence answer in plain conversational language (no stiff preamble), then smoothly organize key points or a short helpful example if useful. Analyze attached files accurately.';

  const prompt = [
    'You are GeriAi (ጌሪኤአይ), a friendly, thoughtful, conversational bilingual AI assistant (English & Amharic).',
    langRule,
    depthRule,
    'Founder (share ONLY if asked who built/founded GeriAi): Gersam Tafesse, 17, Grade 10 student at Abonsa Grace Chun Adventist School, who built GeriAi out of curiosity and passion for AI to help students and everyday users.',
  ].join('\n');

  systemInstructionCache.set(cacheKey, prompt);
  return prompt;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

function unwrapNestedErrorMessage(input: string): string {
  let current = input.trim();
  for (let depth = 0; depth < 4; depth++) {
    if (!current.startsWith('{')) break;
    try {
      const parsed = JSON.parse(current) as {
        message?: unknown;
        error?: { message?: unknown } | unknown;
      };
      if (
        parsed?.error &&
        typeof parsed.error === 'object' &&
        'message' in parsed.error &&
        typeof (parsed.error as { message?: unknown }).message === 'string'
      ) {
        current = ((parsed.error as { message: string }).message).trim();
        continue;
      }
      if (typeof parsed?.message === 'string') {
        current = parsed.message.trim();
        continue;
      }
      break;
    } catch {
      break;
    }
  }
  return current;
}

function extractReadableError(err: unknown, modelLabel = MODEL_NAME): {
  status: number;
  message: string;
  retryable: boolean;
  isDailyQuota?: boolean;
  isModelNotFound?: boolean;
} {
  const errObj = err as { status?: number; code?: number; message?: string } | undefined;
  const raw = err instanceof Error ? err.message : String(err);
  const cleanMsg = unwrapNestedErrorMessage(raw);
  const lower = `${raw} ${cleanMsg}`.toLowerCase();
  const numericStatus =
    typeof errObj?.status === 'number'
      ? errObj.status
      : typeof errObj?.code === 'number'
      ? errObj.code
      : undefined;

  if (lower.includes('gemini_api_key is not configured')) {
    return {
      status: 500,
      message: 'Server GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.',
      retryable: false,
    };
  }
  if (
    numericStatus === 401 ||
    numericStatus === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('api key not valid') ||
    lower.includes('insufficient authentication scopes')
  ) {
    return {
      status: 403,
      message:
        'API key authentication failed. Please check or select a valid GEMINI_API_KEY in Settings > Secrets.',
      retryable: false,
    };
  }
  if (
    numericStatus === 404 ||
    lower.includes('not_found') ||
    lower.includes('is not found') ||
    lower.includes('no longer available') ||
    lower.includes('is not supported for generatecontent')
  ) {
    return {
      status: 404,
      message: `Gemini model "${modelLabel}" was not found or is unsupported: ${cleanMsg}`,
      retryable: true,
      isModelNotFound: true,
    };
  }
  if (
    numericStatus === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    const isDailyQuota =
      lower.includes('per day') ||
      lower.includes('free_tier_requests') ||
      /retry in \d+h/i.test(cleanMsg);
    return {
      status: 429,
      message: 'Free API limit reached for this minute. Please wait 30 seconds and tap Retry.',
      retryable: false,
      isDailyQuota,
    };
  }
  if (
    numericStatus === 503 ||
    numericStatus === 502 ||
    numericStatus === 500 ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('internal error')
  ) {
    return {
      status: 503,
      message: 'Free API limit reached for this minute. Please wait 30 seconds and tap Retry.',
      retryable: false,
    };
  }
  if (numericStatus === 400 || lower.includes('invalid_argument')) {
    return {
      status: 400,
      message: cleanMsg || 'Invalid request sent to the Gemini API.',
      retryable: false,
    };
  }
  if (lower.includes('timed out') || lower.includes('etimedout') || lower.includes('deadline')) {
    return {
      status: 504,
      message: 'GeriAi took too long to respond on this connection. Please try again.',
      retryable: true,
    };
  }

  const isNetworkRetryable =
    lower.includes('fetch failed') ||
    lower.includes('econnreset') ||
    lower.includes('socket hang up') ||
    lower.includes('empty response');

  return {
    status: numericStatus && numericStatus >= 400 && numericStatus < 600 ? numericStatus : 500,
    message: cleanMsg || 'An unexpected error occurred while generating the response.',
    retryable: isNetworkRetryable,
  };
}

function isModelAvailable(modelName: string): boolean {
  const until = unavailableModelUntil.get(modelName);
  if (!until) return true;
  if (Date.now() >= until) {
    unavailableModelUntil.delete(modelName);
    return true;
  }
  return false;
}

function markModelUnavailable(modelName: string): void {
  unavailableModelUntil.set(modelName, Date.now() + MODEL_UNAVAILABLE_COOLDOWN_MS);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function validateAttachment(
  raw: IncomingAttachment
): { ok: true; attachment: ValidatedAttachment } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Malformed attachment entry.' };
  }

  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 200) : 'attachment';
  const mimeType =
    typeof raw.mimeType === 'string' ? raw.mimeType.trim().toLowerCase().split(';')[0] : '';
  const kind = raw.kind;

  if (typeof raw.data !== 'string' || raw.data.length === 0) {
    return { ok: false, error: `Attachment "${name}" is empty or missing data.` };
  }

  if (kind === 'text') {
    if (raw.data.length > MAX_TEXT_ATTACHMENT_CHARS) {
      return { ok: false, error: `Text file "${name}" exceeds the 2 MB limit.` };
    }
    return {
      ok: true,
      attachment: {
        name,
        mimeType: mimeType || 'text/plain',
        kind: 'text',
        data: raw.data,
      },
    };
  }

  if (kind !== 'image' && kind !== 'pdf' && kind !== 'audio') {
    return { ok: false, error: `Unsupported attachment type for "${name}".` };
  }

  if (kind === 'image' && !ALLOWED_IMAGE_MIMES.has(mimeType)) {
    return {
      ok: false,
      error: `Unsupported image type "${mimeType || 'unknown'}" for "${name}". Use PNG, JPG, WEBP, or GIF.`,
    };
  }

  if (kind === 'pdf' && mimeType !== 'application/pdf') {
    return {
      ok: false,
      error: `Unsupported document type "${mimeType || 'unknown'}" for "${name}".`,
    };
  }

  if (kind === 'audio' && !mimeType.startsWith('audio/')) {
    return {
      ok: false,
      error: `Unsupported audio type "${mimeType || 'unknown'}" for "${name}".`,
    };
  }

  const base64Data = raw.data.replace(/^data:[^;]+;base64,/i, '').trim();
  if (!base64Data || !/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    return { ok: false, error: `Attachment "${name}" contains invalid base64 data.` };
  }

  if (base64Data.length > MAX_BINARY_BASE64_CHARS) {
    return { ok: false, error: `Attachment "${name}" exceeds the maximum allowed size.` };
  }

  return {
    ok: true,
    attachment: {
      name,
      mimeType,
      kind,
      data: base64Data,
    },
  };
}

function buildMessageParts(msg: ValidatedMessage, includeHeavyAttachments = true): Part[] {
  const parts: Part[] = [];

  for (const att of msg.attachments) {
    if (att.kind === 'text') {
      if (includeHeavyAttachments || att.data.length <= 8000) {
        parts.push({
          text: `[Attached file: ${att.name}]\n\`\`\`\n${att.data}\n\`\`\``,
        });
      } else {
        parts.push({ text: `[Previously attached text file: ${att.name}]` });
      }
    } else if (includeHeavyAttachments) {
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data,
        },
      });
    } else {
      parts.push({ text: `[Previously attached ${att.kind}: ${att.name}]` });
    }
  }

  const text = msg.content.trim();
  if (text) {
    parts.push({ text });
  } else if (parts.length > 0 && msg.role === 'user') {
    parts.push({ text: 'Please analyze and explain the attached file(s).' });
  }

  return parts;
}

function prepareConversationContents(
  messages: ValidatedMessage[],
  historyLimit = MAX_HISTORY_MESSAGES
): Content[] {
  const recentMessages =
    messages.length > historyLimit
      ? messages.slice(messages.length - historyLimit)
      : messages;

  // Keep full inline media only on the most recent user turns to minimize prefill latency
  let userTurnsSeen = 0;
  const keepAttachmentsMask = new Array<boolean>(recentMessages.length).fill(false);
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    if (recentMessages[i].role === 'user') {
      userTurnsSeen += 1;
      if (userTurnsSeen <= MAX_INLINE_HISTORY_USER_TURNS) {
        keepAttachmentsMask[i] = true;
      }
    }
  }

  // Merge consecutive messages from the same role so Gemini always receives valid alternating turns
  const merged: Array<{ role: 'user' | 'model'; parts: Part[] }> = [];

  for (let i = 0; i < recentMessages.length; i++) {
    const msg = recentMessages[i];
    const parts = buildMessageParts(msg, keepAttachmentsMask[i]);
    if (parts.length === 0) continue;

    const geminiRole: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';
    const prev = merged[merged.length - 1];
    if (prev && prev.role === geminiRole) {
      prev.parts.push(...parts);
    } else {
      merged.push({ role: geminiRole, parts });
    }
  }

  return merged;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'geriai',
      model: MODEL_NAME,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const body = req.body as ChatRequestBody | undefined;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const uiLanguage = body?.uiLanguage === 'am' ? 'am' : 'en';
    const responseLanguage =
      body?.responseLanguage === 'am' || body?.responseLanguage === 'en'
        ? body.responseLanguage
        : 'auto';

    if (messages.length === 0) {
      res.status(400).json({ error: 'At least one message is required.' });
      return;
    }

    const sanitized: ValidatedMessage[] = [];
    for (const m of messages) {
      if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
        continue;
      }

      const content = typeof m.content === 'string' ? m.content.trim() : '';
      const rawAttachments = Array.isArray(m.attachments) ? m.attachments : [];

      if (rawAttachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        res.status(400).json({
          error: `Too many attachments in one message (max ${MAX_ATTACHMENTS_PER_MESSAGE}).`,
        });
        return;
      }

      const validatedAttachments: ValidatedAttachment[] = [];
      for (const rawAtt of rawAttachments) {
        const result = validateAttachment(rawAtt);
        if (!result.ok) {
          res.status(400).json({ error: result.error });
          return;
        }
        validatedAttachments.push(result.attachment);
      }

      if (content.length === 0 && validatedAttachments.length === 0) {
        continue;
      }

      sanitized.push({
        role: m.role,
        content,
        attachments: validatedAttachments,
      });
    }

    if (sanitized.length === 0) {
      res.status(400).json({ error: 'Messages cannot be empty.' });
      return;
    }

    const latest = sanitized[sanitized.length - 1];
    if (latest.role !== 'user') {
      res.status(400).json({ error: 'The final message in the conversation must be from the user.' });
      return;
    }

    const { complexity, hasMultimodalOrLarge } = classifyPromptComplexity(sanitized);
    const historyLimit =
      complexity === 'simple' ? 4 : complexity === 'standard' ? 8 : 12;
    const contents = prepareConversationContents(sanitized, historyLimit);

    // IMPORTANT: Listen to `res` close (only treat as client abort if response hasn't ended)
    // `req.on('close')` fires immediately in Node 16+ once express.json() consumes the body.
    let clientDisconnected = false;
    const disconnectController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        disconnectController.abort();
      }
    });

    // Validate API key upfront before opening SSE stream
    let ai: GoogleGenAI;
    try {
      ai = getGenAIClient();
    } catch (err) {
      const { status, message } = extractReadableError(err);
      res.status(status).json({ error: message, retriesExhausted: true });
      return;
    }

    // Flush SSE headers immediately so proxies and browsers never stall waiting for first token
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.socket?.setNoDelay?.(true);
    res.flushHeaders?.();
    res.write(': stream-open\n\n');

    const keepaliveTimer = setInterval(() => {
      if (!clientDisconnected && !res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 3500);

    let lastAttemptedModel: string = MODEL_NAME;

    try {
      const reqStart = Date.now();
      const systemInstruction = buildSystemInstruction(uiLanguage, responseLanguage, complexity);

      interface ReadyStream {
        activeModel: string;
        iterator: AsyncIterator<GenerateContentResponse>;
        firstText: string;
        finishReason?: string;
        doneAfterFirst: boolean;
      }

      const attemptTimeoutMs = hasMultimodalOrLarge
        ? STREAM_MULTIMODAL_TIMEOUT_MS
        : STREAM_TIMEOUT_MS;

      const openAndPrimeStream = async (
        candidateModel: string,
        externalController: AbortController
      ): Promise<ReadyStream> => {
        const attemptController = externalController;
        const onDisconnect = () => attemptController.abort();
        disconnectController.signal.addEventListener('abort', onDisconnect, { once: true });

        let timedOut = false;
        const deadlineTimer = setTimeout(() => {
          timedOut = true;
          attemptController.abort();
        }, attemptTimeoutMs);

        const raceTimeout = <T,>(promise: Promise<T>): Promise<T> =>
          new Promise<T>((resolve, reject) => {
            if (attemptController.signal.aborted) {
              reject(
                timedOut
                  ? new Error(
                      `Gemini request (${candidateModel}) timed out after ${Math.round(attemptTimeoutMs / 1000)}s.`
                    )
                  : new Error('Request cancelled')
              );
              return;
            }
            const onAbort = () => {
              if (timedOut) {
                reject(
                  new Error(
                    `Gemini request (${candidateModel}) timed out after ${Math.round(attemptTimeoutMs / 1000)}s.`
                  )
                );
              } else {
                reject(new Error('Request cancelled'));
              }
            };
            attemptController.signal.addEventListener('abort', onAbort, { once: true });
            promise.then(
              (val) => {
                attemptController.signal.removeEventListener('abort', onAbort);
                resolve(val);
              },
              (err) => {
                attemptController.signal.removeEventListener('abort', onAbort);
                reject(
                  timedOut
                    ? new Error(
                        `Gemini request (${candidateModel}) timed out after ${Math.round(attemptTimeoutMs / 1000)}s.`
                      )
                    : err
                );
              }
            );
          });

        let iterator: AsyncIterator<GenerateContentResponse> | null = null;
        try {
          const rawStream = await raceTimeout(
            ai.models.generateContentStream({
              model: candidateModel,
              contents,
              config: {
                systemInstruction,
                abortSignal: attemptController.signal,
              },
            })
          );

          iterator = rawStream[Symbol.asyncIterator]();
          let finishReason: string | undefined;

          while (true) {
            if (clientDisconnected || attemptController.signal.aborted) {
              throw new Error('Request cancelled');
            }
            const step = await raceTimeout(iterator.next());
            if (step.done) {
              const reasonNote = finishReason ? ` (${finishReason})` : '';
              throw new Error(`Empty response from ${candidateModel}${reasonNote}`);
            }
            const chunk = step.value as GenerateContentResponse;
            const candidateReason = chunk.candidates?.[0]?.finishReason;
            if (candidateReason) {
              finishReason = String(candidateReason);
            }
            const text = chunk.text ?? '';
            if (text) {
              clearTimeout(deadlineTimer);
              return {
                activeModel: candidateModel,
                iterator,
                firstText: text,
                finishReason,
                doneAfterFirst: false,
              };
            }
          }
        } catch (err) {
          clearTimeout(deadlineTimer);
          attemptController.abort();
          iterator?.return?.().catch(() => {});
          throw err;
        } finally {
          clearTimeout(deadlineTimer);
          disconnectController.signal.removeEventListener('abort', onDisconnect);
        }
      };

      let readyStream: ReadyStream | null = null;
      let lastErr: unknown;
      let totalAttempts = 0;

      const activeCandidates = CHAT_MODEL_CHAIN.filter((m) => isModelAvailable(m));
      const candidateQueue: string[] = [
        ...(activeCandidates.length > 0 ? activeCandidates : CHAT_MODEL_CHAIN),
      ];

      // Single clean direct call; only fall back if the model itself returns 404/unsupported
      for (const candidateModel of candidateQueue) {
        if (clientDisconnected) break;
        totalAttempts += 1;
        lastAttemptedModel = candidateModel;
        const controller = new AbortController();
        const startedAt = Date.now();
        try {
          readyStream = await openAndPrimeStream(candidateModel, controller);
          console.log(
            `[/api/chat] First token (${candidateModel}) at ${Date.now() - reqStart}ms`
          );
          break;
        } catch (err) {
          if (clientDisconnected) return;
          lastErr = err;
          const info = extractReadableError(err, candidateModel);
          if (info.isModelNotFound) {
            console.log(
              `[/api/chat] ${candidateModel} unavailable (${info.status}) in ${Date.now() - startedAt}ms; switching directly.`
            );
            markModelUnavailable(candidateModel);
            continue;
          }
          throw err;
        }
      }

      if (!readyStream) {
        throw lastErr ?? new Error('Unable to reach any Gemini chat model.');
      }

      if (clientDisconnected) {
        return;
      }

      clearInterval(keepaliveTimer);

      let emittedText = false;
      let finishReason = readyStream.finishReason;
      const onStreamDisconnect = () => {
        readyStream?.iterator.return?.().catch(() => {});
      };
      disconnectController.signal.addEventListener('abort', onStreamDisconnect, { once: true });

      try {
        if (readyStream.firstText) {
          emittedText = true;
          res.write(`data: ${JSON.stringify({ text: readyStream.firstText })}\n\n`);
        }

        while (!readyStream.doneAfterFirst) {
          if (clientDisconnected) {
            break;
          }
          const nextStep = await withTimeout(
            readyStream.iterator.next(),
            STREAM_MID_CHUNK_TIMEOUT_MS,
            `Gemini stream (${readyStream.activeModel})`
          );
          if (nextStep.done) {
            break;
          }
          const c = nextStep.value as GenerateContentResponse;
          const candidateReason = c.candidates?.[0]?.finishReason;
          if (candidateReason) {
            finishReason = String(candidateReason);
          }
          const text = c.text ?? '';
          if (text) {
            emittedText = true;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      } finally {
        disconnectController.signal.removeEventListener('abort', onStreamDisconnect);
      }

      if (!clientDisconnected) {
        if (!emittedText) {
          const reasonSuffix = finishReason ? ` (finish reason: ${finishReason})` : '';
          res.write(
            `data: ${JSON.stringify({
              error: `The AI returned an empty response${reasonSuffix}. Please try rephrasing your prompt.`,
              retriesExhausted: true,
            })}\n\n`
          );
        } else {
          res.write(
            `data: ${JSON.stringify({
              done: true,
              model: readyStream.activeModel,
              attempts: totalAttempts,
            })}\n\n`
          );
        }
        res.end();
      }
    } catch (err) {
      if (clientDisconnected) return;
      const { status, message } = extractReadableError(err, lastAttemptedModel);
      const isTimeout = status === 504;
      const isQuotaOrBusy = status === 429 || status === 503;
      const payload = isTimeout
        ? { error: message, code: 'TIMEOUT', retriesExhausted: true }
        : isQuotaOrBusy
        ? { error: message, code: 'QUOTA_BUSY', retriesExhausted: true }
        : { error: message, retriesExhausted: true };
      if (isTimeout || isQuotaOrBusy) {
        console.log(`[/api/chat] Transient Gemini status (${status}, ${lastAttemptedModel}): ${message}`);
      } else {
        console.error('[/api/chat] Gemini API error:', err);
      }
      if (!res.headersSent) {
        res.status(status).json(payload);
      } else if (!clientDisconnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
        res.end();
      }
    } finally {
      clearInterval(keepaliveTimer);
    }
  });

  app.post('/api/transcribe', async (req: Request, res: Response) => {
    const body = req.body as
      | {
          audioBase64?: unknown;
          mimeType?: unknown;
          languageHint?: unknown;
        }
      | undefined;

    const rawAudio = typeof body?.audioBase64 === 'string' ? body.audioBase64 : '';
    const base64Data = rawAudio.replace(/^data:[^;]+;base64,/i, '').trim();
    const mimeType =
      typeof body?.mimeType === 'string' && body.mimeType.trim()
        ? body.mimeType.trim().toLowerCase().split(';')[0]
        : 'audio/webm';
    const languageHint =
      body?.languageHint === 'am' || body?.languageHint === 'en' ? body.languageHint : 'auto';

    if (!base64Data || !/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      res.status(400).json({ error: 'Valid base64 audio data is required for transcription.' });
      return;
    }

    if (!mimeType.startsWith('audio/')) {
      res.status(400).json({ error: `Unsupported audio format "${mimeType}".` });
      return;
    }

    if (base64Data.length > MAX_BINARY_BASE64_CHARS) {
      res.status(400).json({ error: 'Audio recording exceeds the maximum allowed size.' });
      return;
    }

    const promptInstruction =
      languageHint === 'am'
        ? 'Transcribe ONLY the clearly spoken words in this audio into natural Amharic (አማርኛ) using Ethiopic script (ፊደል), preserving any English technical words naturally. Output plain text only—no timestamps, no speaker labels, no explanations. If there is only silence, background noise, or no intelligible speech, output exactly: __SILENCE__'
        : languageHint === 'en'
        ? 'Transcribe ONLY the clearly spoken words in this audio into clear English with natural punctuation, handling accents accurately. Output plain text only—no timestamps, no speaker labels, no explanations. If there is only silence, background noise, or no intelligible speech, output exactly: __SILENCE__'
        : 'Transcribe ONLY the clearly spoken words in this audio in their spoken language (English, Amharic in Ethiopic script ፊደል, or bilingual English/Amharic) with natural punctuation. Output plain text only—no timestamps, no speaker labels, no explanations. If there is only silence, background noise, or no intelligible speech, output exactly: __SILENCE__';

    let clientDisconnected = false;
    const disconnectController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        disconnectController.abort();
      }
    });

    try {
      const ai = getGenAIClient();
      let transcriptText = '';
      let activeModel = TRANSCRIBE_MODEL_CHAIN[0] as string;
      let lastErr: unknown;
      let succeeded = false;

      const candidates = TRANSCRIBE_MODEL_CHAIN.filter((m) => isModelAvailable(m));
      const modelsToTry = candidates.length > 0 ? candidates : TRANSCRIBE_MODEL_CHAIN;

      for (const candidateModel of modelsToTry) {
        if (clientDisconnected) return;
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: candidateModel,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  { text: promptInstruction },
                ],
              },
              config: {
                abortSignal: disconnectController.signal,
              },
            }),
            TRANSCRIBE_TIMEOUT_MS,
            `Audio transcription (${candidateModel})`
          );
          const rawText = (response.text ?? '').trim();
          const cleanedText = rawText
            .replace(/^\s*(?:\[\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:-->|->|-)\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:\s*\])?\s*$/gm, '')
            .replace(/\n{2,}/g, ' ')
            .trim();
          transcriptText = /^__silence__$/i.test(cleanedText) ? '' : cleanedText;
          activeModel = candidateModel;
          succeeded = true;
          break;
        } catch (err) {
          if (clientDisconnected) return;
          lastErr = err;
          const info = extractReadableError(err, candidateModel);
          console.log(
            `[/api/transcribe] ${candidateModel} fallback (${info.status}): ${info.message}`
          );
          if (info.isModelNotFound) {
            markModelUnavailable(candidateModel);
            continue;
          }
          throw err;
        }
      }

      if (!succeeded) {
        throw lastErr ?? new Error('Unable to transcribe audio right now.');
      }

      res.json({
        text: transcriptText,
        empty: transcriptText.length === 0,
        model: activeModel,
      });
    } catch (err) {
      if (clientDisconnected) return;
      const { status, message } = extractReadableError(err);
      const isQuotaOrBusy = status === 429 || status === 503 || status === 504;
      if (isQuotaOrBusy) {
        console.log(`[/api/transcribe] Transient Gemini status (${status}): ${message}`);
      } else {
        console.error('[/api/transcribe] Gemini API error:', err);
      }
      res.status(status).json(
        isQuotaOrBusy
          ? { error: message, code: 'QUOTA_BUSY', retriesExhausted: true }
          : { error: message, retriesExhausted: true }
      );
    }
  });

  app.post('/api/generate-image', async (req: Request, res: Response) => {
    const body = req.body as
      | {
          prompt?: unknown;
          aspectRatio?: unknown;
          attachments?: IncomingAttachment[];
        }
      | undefined;

    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const aspectRatio =
      typeof body?.aspectRatio === 'string' && ALLOWED_ASPECT_RATIOS.has(body.aspectRatio)
        ? body.aspectRatio
        : '1:1';
    const rawAttachments = Array.isArray(body?.attachments) ? body.attachments : [];

    if (!prompt && rawAttachments.length === 0) {
      res.status(400).json({ error: 'Please describe the image you want to generate.' });
      return;
    }

    if (rawAttachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      res.status(400).json({
        error: `Too many reference attachments (max ${MAX_ATTACHMENTS_PER_MESSAGE}).`,
      });
      return;
    }

    const parts: Part[] = [];
    for (const rawAtt of rawAttachments) {
      const validated = validateAttachment(rawAtt);
      if (!validated.ok) {
        res.status(400).json({ error: validated.error });
        return;
      }
      if (validated.attachment.kind === 'image') {
        parts.push({
          inlineData: {
            mimeType: validated.attachment.mimeType,
            data: validated.attachment.data,
          },
        });
      }
    }

    parts.push({
      text: prompt || 'Enhance or creatively reimagine the attached image.',
    });

    try {
      const ai = getGenAIClient();
      const response = await withTimeout(
        ai.models.generateContent({
          model: IMAGE_MODEL_NAME,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio,
            },
          },
        }),
        IMAGE_GENERATION_TIMEOUT_MS,
        `Image generation (${IMAGE_MODEL_NAME})`
      );

      const generatedImages: Array<{ dataUrl: string; mimeType: string }> = [];
      const textParts: string[] = [];

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          generatedImages.push({
            mimeType: mime,
            dataUrl: `data:${mime};base64,${part.inlineData.data}`,
          });
        } else if (part.text) {
          textParts.push(part.text);
        }
      }

      if (generatedImages.length === 0) {
        const refusalText = textParts.join('\n').trim();
        res.status(422).json({
          error:
            refusalText ||
            'No image was returned for that prompt. Try describing the scene in more detail.',
        });
        return;
      }

      res.json({
        images: generatedImages,
        text: textParts.join('\n').trim(),
        model: IMAGE_MODEL_NAME,
      });
    } catch (err) {
      const { status, message } = extractReadableError(err);
      const isQuotaOrBusy = status === 429 || status === 503 || status === 504;
      if (isQuotaOrBusy) {
        console.log(`[/api/generate-image] Transient Gemini status (${status}): ${message}`);
      } else {
        console.error('[/api/generate-image] Gemini API error:', err);
      }
      res.status(status).json(
        isQuotaOrBusy
          ? { error: message, code: 'QUOTA_BUSY' }
          : { error: message }
      );
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  if (process.env.GEMINI_API_KEY) {
    getGenAIClient();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GeriAi server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start GeriAi server:', err);
  process.exit(1);
});
