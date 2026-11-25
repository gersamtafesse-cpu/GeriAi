import type { AttachmentKind, ChatAttachment } from '../types/chat';

export const MAX_ATTACHMENTS_PER_MESSAGE = 6;
export const MAX_BINARY_FILE_BYTES = 18 * 1024 * 1024; // 18 MB
export const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_TOTAL_ATTACHMENT_BYTES = 32 * 1024 * 1024; // 32 MB

export const ACCEPTED_FILE_INPUT = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/webm',
  'audio/flac',
  '.txt',
  '.csv',
  '.md',
  '.json',
  '.xml',
  '.html',
  '.css',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.cs',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.sql',
  '.sh',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.log',
  '.svg',
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.aac',
  '.webm',
  '.flac',
].join(',');

const IMAGE_EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const AUDIO_EXT_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  webm: 'audio/webm',
  flac: 'audio/flac',
};

const TEXT_EXTENSIONS = new Set([
  'txt',
  'csv',
  'tsv',
  'md',
  'markdown',
  'json',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'py',
  'java',
  'c',
  'cpp',
  'cc',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'rb',
  'php',
  'sql',
  'sh',
  'bash',
  'zsh',
  'yaml',
  'yml',
  'toml',
  'ini',
  'conf',
  'env',
  'log',
  'svg',
  'tex',
]);

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function normalizeMimeType(rawMime: string, ext: string): string {
  const lower = rawMime.trim().toLowerCase().split(';')[0];
  if (lower === 'image/jpg') return 'image/jpeg';
  if (lower === 'audio/mp3') return 'audio/mpeg';
  if (lower === 'audio/x-wav' || lower === 'audio/wave') return 'audio/wav';
  if (lower === 'audio/x-m4a' || lower === 'audio/m4a') return 'audio/mp4';
  if (lower) return lower;
  if (IMAGE_EXT_MIME[ext]) return IMAGE_EXT_MIME[ext];
  if (ext === 'pdf') return 'application/pdf';
  if (AUDIO_EXT_MIME[ext]) return AUDIO_EXT_MIME[ext];
  if (ext === 'csv') return 'text/csv';
  if (ext === 'json') return 'application/json';
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  return 'text/plain';
}

export function classifyFile(file: File): { kind: AttachmentKind; mimeType: string } | null {
  const ext = getExtension(file.name);
  const mime = normalizeMimeType(file.type, ext);

  if (
    mime === 'image/png' ||
    mime === 'image/jpeg' ||
    mime === 'image/webp' ||
    mime === 'image/gif' ||
    Boolean(IMAGE_EXT_MIME[ext])
  ) {
    return {
      kind: 'image',
      mimeType: IMAGE_EXT_MIME[ext] || mime,
    };
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return {
      kind: 'pdf',
      mimeType: 'application/pdf',
    };
  }

  if (mime.startsWith('audio/') || Boolean(AUDIO_EXT_MIME[ext])) {
    return {
      kind: 'audio',
      mimeType: AUDIO_EXT_MIME[ext] || (mime.startsWith('audio/') ? mime : 'audio/mpeg'),
    };
  }

  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    mime === 'application/typescript' ||
    mime === 'image/svg+xml' ||
    TEXT_EXTENSIONS.has(ext)
  ) {
    return {
      kind: 'text',
      mimeType: mime || 'text/plain',
    };
  }

  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read error.'));
    reader.readAsDataURL(file);
  });
}

function createAttachmentId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function readFileAsAttachment(
  file: File
): Promise<
  | { ok: true; attachment: ChatAttachment }
  | { ok: false; reason: 'unsupported' | 'tooLarge' | 'readFailed' }
> {
  const classified = classifyFile(file);
  if (!classified) {
    return { ok: false, reason: 'unsupported' };
  }

  const maxBytes =
    classified.kind === 'text' ? MAX_TEXT_FILE_BYTES : MAX_BINARY_FILE_BYTES;
  if (file.size > maxBytes) {
    return { ok: false, reason: 'tooLarge' };
  }

  try {
    if (classified.kind === 'text') {
      const textContent = await file.text();
      // Reject binary files disguised with a text extension
      if (textContent.includes('\u0000')) {
        return { ok: false, reason: 'unsupported' };
      }
      return {
        ok: true,
        attachment: {
          id: createAttachmentId(),
          name: file.name,
          mimeType: classified.mimeType,
          size: file.size,
          kind: 'text',
          data: textContent,
        },
      };
    }

    const dataUrl = await readAsDataUrl(file);
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

    return {
      ok: true,
      attachment: {
        id: createAttachmentId(),
        name: file.name,
        mimeType: classified.mimeType,
        size: file.size,
        kind: classified.kind,
        data: base64,
        previewUrl: classified.kind === 'image' ? dataUrl : undefined,
      },
    };
  } catch {
    return { ok: false, reason: 'readFailed' };
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${Math.max(0, Math.round(bytes))} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
