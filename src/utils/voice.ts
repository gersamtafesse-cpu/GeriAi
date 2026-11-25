export type VoiceEffectPreset = 'natural' | 'warm' | 'bright' | 'slow';

export interface VoiceEffectConfig {
  id: VoiceEffectPreset;
  pitch: number;
  rate: number;
}

export const VOICE_EFFECT_ORDER: VoiceEffectPreset[] = ['natural', 'warm', 'bright', 'slow'];

export const VOICE_EFFECT_CONFIGS: Record<VoiceEffectPreset, VoiceEffectConfig> = {
  natural: { id: 'natural', pitch: 1.0, rate: 1.0 },
  warm: { id: 'warm', pitch: 0.84, rate: 0.94 },
  bright: { id: 'bright', pitch: 1.15, rate: 1.08 },
  slow: { id: 'slow', pitch: 1.0, rate: 0.82 },
};

export function containsEthiopic(text: string): boolean {
  return /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/.test(text);
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export interface BrowserSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionEvent) => void) | null;
  onspeechstart?: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
  onspeechend?: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
}

export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function isAudioRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function pickBestSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export function stripMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';

  let cleaned = markdown
    // Replace fenced code blocks with a brief pause
    .replace(/```[\s\S]*?```/g, ' ... ')
    // Replace inline code backticks while keeping the identifier
    .replace(/`([^`]+)`/g, '$1')
    // Replace markdown images ![alt](url) with alt text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Replace markdown links [label](url) with label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove heading markers
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    // Remove blockquote markers
    .replace(/^\s{0,3}>\s?/gm, '')
    // Remove list bullet markers
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove horizontal rules
    .replace(/^\s*([-*_]){3,}\s*$/gm, ' ')
    // Convert markdown table pipes to natural pauses
    .replace(/\|/g, ', ')
    // Remove bold / italic / strikethrough markers
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    // Collapse excess whitespace
    .replace(/\r?\n{2,}/g, '. ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Remove empty comma clusters left from markdown table separator rows
  cleaned = cleaned.replace(/,\s*[-:]+\s*(?=,|$)/g, '').replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

export function splitTextIntoSpeechChunks(text: string, maxLength = 200): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= maxLength) return [normalized];

  // Split on sentence boundaries (English + Ethiopic full stop ። and question/exclamation marks)
  const rawSentences = normalized
    .split(/(?<=[.!?።፧])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  const pushWordSplit = (longSegment: string) => {
    const words = longSegment.split(/\s+/);
    let piece = '';
    for (const word of words) {
      if (!piece) {
        piece = word;
      } else if (piece.length + 1 + word.length <= maxLength) {
        piece += ` ${word}`;
      } else {
        chunks.push(piece);
        piece = word;
      }
    }
    if (piece) {
      chunks.push(piece);
    }
  };

  for (const sentence of rawSentences) {
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      pushWordSplit(sentence);
      continue;
    }

    if (!current) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= maxLength) {
      current += ` ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

let sharedAudioCtx: AudioContext | null = null;

export function playVoiceChime(
  kind: 'micOn' | 'micOff' | 'speakStart' | 'speakStop' | 'effect',
  enabled: boolean
): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }

    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;

    const notes: Array<{ freq: number; delay: number; duration: number }> =
      kind === 'micOn'
        ? [
            { freq: 523.25, delay: 0, duration: 0.08 },
            { freq: 659.25, delay: 0.07, duration: 0.11 },
          ]
        : kind === 'micOff'
        ? [
            { freq: 587.33, delay: 0, duration: 0.07 },
            { freq: 440, delay: 0.06, duration: 0.1 },
          ]
        : kind === 'speakStart'
        ? [
            { freq: 440, delay: 0, duration: 0.07 },
            { freq: 554.37, delay: 0.06, duration: 0.1 },
          ]
        : kind === 'speakStop'
        ? [{ freq: 392, delay: 0, duration: 0.08 }]
        : [{ freq: 622.25, delay: 0, duration: 0.06 }];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.delay);

      gain.gain.setValueAtTime(0.0001, now + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.045, now + note.delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.delay);
      osc.stop(now + note.delay + note.duration + 0.01);
    }
  } catch {
    // Ignore audio context restrictions or unsupported environments
  }
}
