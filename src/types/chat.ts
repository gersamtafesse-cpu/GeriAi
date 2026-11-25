export type Language = 'en' | 'am';
export type ResponseLanguage = 'auto' | 'en' | 'am';
export type Theme = 'light' | 'dark';
export type PromptCategory = 'all' | 'study' | 'writing' | 'translation' | 'coding';

export type AttachmentKind = 'image' | 'pdf' | 'audio' | 'text';
export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
  data?: string;
  previewUrl?: string;
}

export interface GeneratedImage {
  id: string;
  dataUrl: string;
  mimeType: string;
}

export interface GroundingSource {
  title: string;
  url: string;
  domain?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  generatedImages?: GeneratedImage[];
  sources?: GroundingSource[];
  isImageGeneration?: boolean;
  createdAt: number;
  error?: boolean;
  errorKind?: 'quota' | 'timeout' | 'general';
  errorMessage?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface QuickPrompt {
  id: string;
  category: Exclude<PromptCategory, 'all'>;
  title: string;
  description: string;
  prompt: string;
}
