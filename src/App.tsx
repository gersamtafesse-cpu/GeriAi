import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Moon, PanelLeftOpen, Plus, Sun, User } from 'lucide-react';
import type {
  ChatAttachment,
  ChatSession,
  GeneratedImage,
  GroundingSource,
  ImageAspectRatio,
  Language,
  Message,
  ResponseLanguage,
  Theme,
} from './types/chat';
import { TRANSLATIONS } from './data/translations';
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_TOTAL_ATTACHMENT_BYTES,
  readFileAsAttachment,
} from './utils/attachments';
import { BrandLogo } from './components/BrandLogo';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatMessage } from './components/ChatMessage';
import { ChatComposer } from './components/ChatComposer';
import { AboutCreatorModal } from './components/AboutCreatorModal';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import cuteDogBg from './assets/images/cute_dog_background_1795110222406.jpg';

const STORAGE_KEYS = {
  chats: 'geriai_chats_v1',
  theme: 'geriai_theme',
  uiLanguage: 'geriai_lang',
  responseLanguage: 'geriai_response_lang',
};

function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveChatTitle(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > 48 ? `${cleaned.slice(0, 48).trimEnd()}…` : cleaned;
}

function loadStoredChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.chats);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isLikelyImageGenerationRequest(
  prompt: string,
  attachments: ChatAttachment[]
): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  if (attachments.some((a) => a.kind !== 'image')) return false;

  const asksForCodeOrExplanation =
    /\b(code|python|javascript|typescript|html|css|svg|react|how to|explain|tutorial|algorithm|script|api|function|example|diagram|chart|graph|flowchart|markdown)\b/i.test(
      trimmed
    );
  if (asksForCodeOrExplanation) return false;

  return (
    /(?:^|\b)(generate|create|draw|paint|sketch|make|render|illustrate|design)\s+(?:me\s+)?(?:an?\s+)?(?:[\w-]+\s+){0,2}(?:image|picture|photo|illustration|artwork|drawing|painting|portrait|wallpaper|logo|poster|avatar|icon|scene|art)\b/i.test(
      trimmed
    ) || /(ምስል|ፎቶ|ስዕል)\s*(ፍጠር|ፍጠሪ|ሳል|ሳሊ|ስራ|ስሪ|አውጣ|አዘጋጅ)/.test(trimmed)
  );
}

function looksLikeQuotaOrBusy(status?: number, code?: string, msg = ''): boolean {
  if (status === 429 || status === 503 || code === 'QUOTA_BUSY') return true;
  return /quota|rate limit|free api limit|wait 30 seconds|high demand|temporarily busy|temporarily full|capacity|resource_exhausted/i.test(
    msg
  );
}

function looksLikeTimeout(status?: number, code?: string, msg = ''): boolean {
  if (status === 504 || code === 'TIMEOUT') return true;
  return /timed out|took too long|deadline/i.test(msg);
}

function sanitizeChatsForStorage(
  chatsToSave: ChatSession[],
  stripGeneratedImages = false
): ChatSession[] {
  return chatsToSave.map((chat) => ({
    ...chat,
    messages: chat.messages.map((msg) => {
      const cleanedAttachments =
        msg.attachments && msg.attachments.length > 0
          ? msg.attachments.map(({ id, name, mimeType, size, kind, previewUrl }) => ({
              id,
              name,
              mimeType,
              size,
              kind,
              ...(previewUrl && previewUrl.length <= 40000 ? { previewUrl } : {}),
            }))
          : undefined;

      const cleanedGeneratedImages =
        stripGeneratedImages && msg.generatedImages ? undefined : msg.generatedImages;

      if (!cleanedAttachments && msg.generatedImages === cleanedGeneratedImages) {
        return msg;
      }

      return {
        ...msg,
        ...(cleanedAttachments ? { attachments: cleanedAttachments } : {}),
        ...(cleanedGeneratedImages ? { generatedImages: cleanedGeneratedImages } : { generatedImages: undefined }),
      };
    }),
  }));
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // Ignore storage errors
  }
  return 'light';
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.uiLanguage);
    if (stored === 'am' || stored === 'en') return stored;
  } catch {
    // Ignore storage errors
  }
  return 'en';
}

function getInitialResponseLanguage(): ResponseLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.responseLanguage);
    if (stored === 'auto' || stored === 'am' || stored === 'en') return stored;
  } catch {
    // Ignore storage errors
  }
  return 'auto';
}

export default function App() {
  const initialChatsRef = useRef<ChatSession[] | null>(null);
  if (initialChatsRef.current === null) {
    initialChatsRef.current = loadStoredChats();
  }

  const [chats, setChats] = useState<ChatSession[]>(() => initialChatsRef.current ?? []);
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const initial = initialChatsRef.current ?? [];
    return initial.length > 0 ? initial[0].id : null;
  });
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [uiLanguage, setUiLanguage] = useState<Language>(getInitialLanguage);
  const [responseLanguage, setResponseLanguage] = useState<ResponseLanguage>(
    getInitialResponseLanguage
  );

  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAboutCreatorOpen, setIsAboutCreatorOpen] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveResumeNonce, setLiveResumeNonce] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isLiveModeRef = useRef(false);
  const lastSpokenAssistantIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  isLiveModeRef.current = isLiveMode;

  const t = TRANSLATIONS[uiLanguage];

  const speechMessages = useMemo(
    () => ({
      unsupported: t.speechUnsupported,
      nothingToRead: t.speechNothingToRead,
      amharicLimited: t.speechAmharicLimited,
      playbackFailed: t.speechPlaybackFailed,
    }),
    [t.speechAmharicLimited, t.speechNothingToRead, t.speechPlaybackFailed, t.speechUnsupported]
  );

  const {
    isSupported: isSpeechSupported,
    speakingMessageId,
    voiceEffect,
    soundEffectsEnabled,
    notice: speechNotice,
    speakMessage,
    toggleSpeakMessage,
    stopSpeaking,
    cycleVoiceEffect,
    toggleSoundEffects,
    dismissNotice: dismissSpeechNotice,
  } = useSpeechSynthesis(speechMessages);

  // Sync theme to document root & localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // Sync UI language to <html lang> & localStorage
  useEffect(() => {
    document.documentElement.lang = uiLanguage;
    try {
      localStorage.setItem(STORAGE_KEYS.uiLanguage, uiLanguage);
    } catch {
      // Ignore storage errors
    }
  }, [uiLanguage]);

  // Sync response language preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.responseLanguage, responseLanguage);
    } catch {
      // Ignore storage errors
    }
  }, [responseLanguage]);

  // Persist chats safely without blocking interactive UI paints
  useEffect(() => {
    if (isStreaming) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(sanitizeChatsForStorage(chats, false)));
      } catch {
        try {
          localStorage.setItem(
            STORAGE_KEYS.chats,
            JSON.stringify(sanitizeChatsForStorage(chats, true))
          );
        } catch {
          // Ignore storage errors
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chats, isStreaming]);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  // Pin scroll smoothly on bottom without layout-thrashing smooth scroll during fast token streaming
  useEffect(() => {
    if (userScrolledUpRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeChat?.messages, isStreaming]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 120;
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingChatId(null);
  }, []);

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      stopGeneration();
    }
    setIsLiveMode(false);
    stopSpeaking(false);
    setActiveChatId(null);
    setInputValue('');
    setAttachments([]);
    setAttachmentError(null);
    userScrolledUpRef.current = false;
  }, [isStreaming, stopGeneration, stopSpeaking]);

  const handleSelectChat = useCallback(
    (id: string) => {
      if (isStreaming && streamingChatId !== id) {
        stopGeneration();
      }
      if (activeChatId !== id) {
        setIsLiveMode(false);
        stopSpeaking(false);
      }
      setActiveChatId(id);
      setAttachmentError(null);
      userScrolledUpRef.current = false;
    },
    [activeChatId, isStreaming, streamingChatId, stopGeneration, stopSpeaking]
  );

  const handleDeleteChat = useCallback(
    (id: string) => {
      if (streamingChatId === id) {
        stopGeneration();
      }
      if (activeChatId === id) {
        setIsLiveMode(false);
        stopSpeaking(false);
      }
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeChatId === id) {
          setActiveChatId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeChatId, streamingChatId, stopGeneration, stopSpeaking]
  );

  const handleClearAll = useCallback(() => {
    if (isStreaming) {
      stopGeneration();
    }
    setIsLiveMode(false);
    stopSpeaking(false);
    setChats([]);
    setActiveChatId(null);
    setAttachments([]);
    setAttachmentError(null);
  }, [isStreaming, stopGeneration, stopSpeaking]);

  const handleAddAttachments = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      setAttachmentError(null);

      const remainingSlots = MAX_ATTACHMENTS_PER_MESSAGE - attachments.length;
      if (remainingSlots <= 0) {
        setAttachmentError(t.attachmentCountLimit);
        return;
      }

      let errorToReport: string | null = null;
      const filesToRead = incoming.slice(0, remainingSlots);
      if (incoming.length > remainingSlots) {
        errorToReport = t.attachmentCountLimit;
      }

      const results = await Promise.all(filesToRead.map((file) => readFileAsAttachment(file)));
      const accepted: ChatAttachment[] = [];
      let runningBytes = attachments.reduce((sum, item) => sum + item.size, 0);

      for (const res of results) {
        if (!res.ok) {
          if (!errorToReport) {
            if (res.reason === 'unsupported') errorToReport = t.attachmentUnsupported;
            else if (res.reason === 'tooLarge') errorToReport = t.attachmentTooLarge;
            else errorToReport = t.attachmentReadFailed;
          }
          continue;
        }
        if (runningBytes + res.attachment.size > MAX_TOTAL_ATTACHMENT_BYTES) {
          if (!errorToReport) {
            errorToReport = t.attachmentTotalTooLarge;
          }
          continue;
        }
        runningBytes += res.attachment.size;
        accepted.push(res.attachment);
      }

      if (accepted.length > 0) {
        setAttachments((prev) => {
          const available = MAX_ATTACHMENTS_PER_MESSAGE - prev.length;
          return available > 0 ? [...prev, ...accepted.slice(0, available)] : prev;
        });
      }

      if (errorToReport) {
        setAttachmentError(errorToReport);
      }
    },
    [
      attachments,
      t.attachmentCountLimit,
      t.attachmentReadFailed,
      t.attachmentTooLarge,
      t.attachmentTotalTooLarge,
      t.attachmentUnsupported,
    ]
  );

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
    setAttachmentError(null);
  }, []);

  const streamAssistantReply = useCallback(
    async (
      targetChatId: string,
      conversationMessages: Message[],
      assistantMessageId: string
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);
      setStreamingChatId(targetChatId);
      userScrolledUpRef.current = false;

      const payloadMessages = conversationMessages
        .filter(
          (m) =>
            !m.error &&
            (m.content.trim().length > 0 || (m.attachments && m.attachments.length > 0))
        )
        .map((m) => {
          const serializedAttachments = (m.attachments ?? [])
            .filter((a) => typeof a.data === 'string' && a.data.length > 0)
            .map((a) => ({
              name: a.name,
              mimeType: a.mimeType,
              kind: a.kind,
              data: a.data!,
            }));

          const fallbackNote =
            !m.content.trim() &&
            serializedAttachments.length === 0 &&
            m.attachments &&
            m.attachments.length > 0
              ? `[Attached file(s): ${m.attachments.map((a) => a.name).join(', ')}]`
              : m.content;

          return {
            role: m.role,
            content: fallbackNote,
            ...(serializedAttachments.length > 0
              ? { attachments: serializedAttachments }
              : {}),
          };
        });

      let accumulated = '';
      let accumulatedSources: GroundingSource[] = [];
      let quotaHit = false;
      let timeoutHit = false;
      const clientTimeoutMs = 95000;
      const requestTimeoutId = window.setTimeout(() => {
        controller.abort(new DOMException('Request timed out', 'TimeoutError'));
      }, clientTimeoutMs);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: payloadMessages,
            uiLanguage,
            responseLanguage,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errMsg = t.errorFallback;
          let errCode: string | undefined;
          const rawBody = await response.text().catch(() => '');
          if (rawBody) {
            try {
              const errJson = JSON.parse(rawBody) as {
                error?: string;
                message?: string;
                code?: string;
              };
              if (errJson?.code) errCode = errJson.code;
              if (errJson?.error) errMsg = errJson.error;
              else if (errJson?.message) errMsg = errJson.message;
            } catch {
              const trimmed = rawBody.trim();
              if (trimmed && !trimmed.startsWith('<')) {
                errMsg = trimmed;
              }
            }
          }
          if (looksLikeTimeout(response.status, errCode, errMsg)) {
            timeoutHit = true;
          } else if (looksLikeQuotaOrBusy(response.status, errCode, errMsg)) {
            quotaHit = true;
          }
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error(t.errorFallback);
        }

        const decoder = new TextDecoder();
        let buffer = '';

        const commitAccumulated = (markUpdated = false) => {
          const latestText = accumulated;
          const latestSources = accumulatedSources;
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== targetChatId) return chat;
              const msgs = chat.messages;
              const lastIdx = msgs.length - 1;
              if (lastIdx >= 0 && msgs[lastIdx].id === assistantMessageId) {
                const nextMsgs = msgs.slice();
                nextMsgs[lastIdx] = {
                  ...msgs[lastIdx],
                  content: latestText,
                  ...(latestSources.length > 0 ? { sources: latestSources } : {}),
                };
                return markUpdated
                  ? { ...chat, updatedAt: Date.now(), messages: nextMsgs }
                  : { ...chat, messages: nextMsgs };
              }
              return {
                ...chat,
                ...(markUpdated ? { updatedAt: Date.now() } : {}),
                messages: msgs.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: latestText,
                        ...(latestSources.length > 0 ? { sources: latestSources } : {}),
                      }
                    : m
                ),
              };
            })
          );
        };

        const processEvents = (chunks: string[]) => {
          let updated = false;
          for (const eventChunk of chunks) {
            const lines = eventChunk.split(/\r?\n/);
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;

              let parsed: {
                text?: string;
                sources?: GroundingSource[];
                error?: string;
                code?: string;
                done?: boolean;
              };
              try {
                parsed = JSON.parse(jsonStr);
              } catch {
                continue;
              }

              if (parsed.error) {
                if (looksLikeTimeout(undefined, parsed.code, parsed.error)) {
                  timeoutHit = true;
                } else if (looksLikeQuotaOrBusy(undefined, parsed.code, parsed.error)) {
                  quotaHit = true;
                }
                throw new Error(parsed.error);
              }

              if (parsed.text) {
                accumulated += parsed.text;
                updated = true;
              }

              if (Array.isArray(parsed.sources) && parsed.sources.length > 0) {
                accumulatedSources = parsed.sources;
                updated = true;
              }
            }
          }
          if (updated) {
            commitAccumulated(false);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            if (buffer.trim()) {
              processEvents(buffer.split(/\r?\n\r?\n/));
            }
            if (accumulated || accumulatedSources.length > 0) {
              commitAccumulated(true);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? '';
          processEvents(events);
        }

        if (!accumulated.trim()) {
          throw new Error(t.errorFallback);
        }

        if (isLiveModeRef.current && lastSpokenAssistantIdRef.current !== assistantMessageId) {
          lastSpokenAssistantIdRef.current = assistantMessageId;
          speakMessage(assistantMessageId, accumulated, () => {
            if (isLiveModeRef.current) {
              setLiveResumeNonce((n) => n + 1);
            }
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const isClientTimeout = err instanceof DOMException && err.name === 'TimeoutError';
        const rawMessage = isClientTimeout
          ? t.chatTimeoutFriendly
          : err instanceof Error && err.message
          ? err.message
          : t.errorFallback;
        const isTimeout = isClientTimeout || timeoutHit || looksLikeTimeout(undefined, undefined, rawMessage);
        const isQuota = !isTimeout && (quotaHit || looksLikeQuotaOrBusy(undefined, undefined, rawMessage));
        const displayMessage = isTimeout
          ? t.chatTimeoutFriendly
          : isQuota
          ? t.chatQuotaFriendly
          : rawMessage;
        setChats((prev) =>
          prev.map((chat) =>
            chat.id !== targetChatId
              ? chat
              : {
                  ...chat,
                  updatedAt: Date.now(),
                  messages: chat.messages.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: accumulated.trim() ? accumulated : displayMessage,
                          error: true,
                          errorKind: isTimeout ? 'timeout' : isQuota ? 'quota' : 'general',
                          errorMessage: displayMessage,
                        }
                      : m
                  ),
                }
          )
        );
      } finally {
        window.clearTimeout(requestTimeoutId);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setStreamingChatId(null);
      }
    },
    [responseLanguage, speakMessage, t.chatQuotaFriendly, t.chatTimeoutFriendly, t.errorFallback, uiLanguage]
  );

  const generateAssistantImage = useCallback(
    async (
      targetChatId: string,
      userMessage: Message,
      assistantMessageId: string,
      aspectRatio: ImageAspectRatio
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);
      setStreamingChatId(targetChatId);
      userScrolledUpRef.current = false;

      const serializedAttachments = (userMessage.attachments ?? [])
        .filter((a) => a.kind === 'image' && typeof a.data === 'string' && a.data.length > 0)
        .map((a) => ({
          name: a.name,
          mimeType: a.mimeType,
          kind: a.kind,
          data: a.data!,
        }));

      let quotaHit = false;

      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userMessage.content,
            aspectRatio,
            attachments: serializedAttachments,
          }),
          signal: controller.signal,
        });

        const rawBody = await response.text();
        let parsed: {
          images?: Array<{ dataUrl?: string; mimeType?: string }>;
          text?: string;
          error?: string;
          code?: string;
        } = {};
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          // Leave parsed empty if non-JSON
        }

        if (!response.ok) {
          if (looksLikeQuotaOrBusy(response.status, parsed.code, parsed.error || '')) {
            quotaHit = true;
          }
          throw new Error(parsed.error || `${t.errorFallback} (HTTP ${response.status})`);
        }

        const images: GeneratedImage[] = (parsed.images ?? [])
          .filter((img): img is { dataUrl: string; mimeType?: string } => Boolean(img?.dataUrl))
          .map((img) => ({
            id: createId(),
            dataUrl: img.dataUrl,
            mimeType: img.mimeType || 'image/png',
          }));

        if (images.length === 0) {
          throw new Error(parsed.error || t.imageEmptyError);
        }

        setChats((prev) =>
          prev.map((chat) =>
            chat.id !== targetChatId
              ? chat
              : {
                  ...chat,
                  updatedAt: Date.now(),
                  messages: chat.messages.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: parsed.text?.trim() || '',
                          generatedImages: images,
                          isImageGeneration: true,
                        }
                      : m
                  ),
                }
          )
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const rawMessage = err instanceof Error && err.message ? err.message : t.errorFallback;
        const isQuota = quotaHit || looksLikeQuotaOrBusy(undefined, undefined, rawMessage);
        const displayMessage = isQuota ? t.imageQuotaFriendly : rawMessage;

        if (isQuota) {
          setIsImageMode(false);
        }

        setChats((prev) =>
          prev.map((chat) =>
            chat.id !== targetChatId
              ? chat
              : {
                  ...chat,
                  updatedAt: Date.now(),
                  messages: chat.messages.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: displayMessage,
                          error: true,
                          errorKind: isQuota ? 'quota' : 'general',
                          errorMessage: displayMessage,
                          isImageGeneration: true,
                        }
                      : m
                  ),
                }
          )
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setStreamingChatId(null);
      }
    },
    [t.errorFallback, t.imageEmptyError, t.imageQuotaFriendly]
  );

  const sendMessage = useCallback(
    async (rawPrompt?: string, forceImage?: boolean) => {
      const promptText = (rawPrompt ?? inputValue).trim();
      const pendingAttachments = typeof forceImage === 'boolean' ? [] : attachments;
      const shouldGenerateImage =
        typeof forceImage === 'boolean'
          ? forceImage
          : isImageMode || isLikelyImageGenerationRequest(promptText, pendingAttachments);
      if ((!promptText && pendingAttachments.length === 0) || isStreaming) return;

      if (speakingMessageId) {
        stopSpeaking(false);
      }

      setInputValue('');
      setAttachments([]);
      setAttachmentError(null);

      const titleSource =
        promptText || pendingAttachments[0]?.name || t.attachmentFallbackLabel;

      const now = Date.now();
      const userMessage: Message = {
        id: createId(),
        role: 'user',
        content: promptText,
        ...(pendingAttachments.length > 0 ? { attachments: pendingAttachments } : {}),
        ...(shouldGenerateImage ? { isImageGeneration: true } : {}),
        createdAt: now,
      };
      const assistantMessage: Message = {
        id: createId(),
        role: 'assistant',
        content: '',
        ...(shouldGenerateImage ? { isImageGeneration: true } : {}),
        createdAt: now,
      };

      let targetChatId = activeChatId;
      let conversationForApi: Message[] = [];

      if (!targetChatId || !chats.some((c) => c.id === targetChatId)) {
        targetChatId = createId();
        const newChat: ChatSession = {
          id: targetChatId,
          title: deriveChatTitle(titleSource),
          messages: [userMessage, assistantMessage],
          createdAt: now,
          updatedAt: now,
        };
        conversationForApi = [userMessage];
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(targetChatId);
      } else {
        const existing = chats.find((c) => c.id === targetChatId)!;
        const cleanExisting = existing.messages.filter((m) => !m.error);
        conversationForApi = [...cleanExisting, userMessage];

        setChats((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetChatId) return c;
            const shouldSetTitle = c.messages.length === 0 || c.title === t.untitledChat;
            return {
              ...c,
              title: shouldSetTitle ? deriveChatTitle(titleSource) : c.title,
              updatedAt: now,
              messages: [...cleanExisting, userMessage, assistantMessage],
            };
          });
          // Move updated chat to top of history
          const current = updated.find((c) => c.id === targetChatId)!;
          return [current, ...updated.filter((c) => c.id !== targetChatId)];
        });
      }

      if (shouldGenerateImage) {
        await generateAssistantImage(
          targetChatId,
          userMessage,
          assistantMessage.id,
          imageAspectRatio
        );
      } else {
        await streamAssistantReply(targetChatId, conversationForApi, assistantMessage.id);
      }
    },
    [
      activeChatId,
      attachments,
      chats,
      generateAssistantImage,
      imageAspectRatio,
      inputValue,
      isImageMode,
      isStreaming,
      speakingMessageId,
      stopSpeaking,
      streamAssistantReply,
      t.attachmentFallbackLabel,
      t.untitledChat,
    ]
  );

  const handleRegenerateOrRetry = useCallback(async () => {
    if (!activeChat || isStreaming) return;

    const messages = activeChat.messages;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;

    const actualUserIdx = messages.length - 1 - lastUserIndex;
    const targetUserMessage = messages[actualUserIdx];
    const priorAssistant = messages.slice(actualUserIdx + 1).find((m) => m.role === 'assistant');
    const retryAsImage = Boolean(
      targetUserMessage.isImageGeneration || priorAssistant?.isImageGeneration
    );

    const keptMessages = messages.slice(0, actualUserIdx + 1).filter((m) => !m.error);
    const newAssistantMessage: Message = {
      id: createId(),
      role: 'assistant',
      content: '',
      ...(retryAsImage ? { isImageGeneration: true } : {}),
      createdAt: Date.now(),
    };

    setChats((prev) =>
      prev.map((c) =>
        c.id !== activeChat.id
          ? c
          : {
              ...c,
              updatedAt: Date.now(),
              messages: [...keptMessages, newAssistantMessage],
            }
      )
    );

    if (retryAsImage) {
      await generateAssistantImage(
        activeChat.id,
        targetUserMessage,
        newAssistantMessage.id,
        imageAspectRatio
      );
    } else {
      await streamAssistantReply(activeChat.id, keptMessages, newAssistantMessage.id);
    }
  }, [activeChat, generateAssistantImage, imageAspectRatio, isStreaming, streamAssistantReply]);

  const lastAssistantId = useMemo(() => {
    if (!activeChat) return null;
    for (let i = activeChat.messages.length - 1; i >= 0; i--) {
      if (activeChat.messages[i].role === 'assistant') {
        return activeChat.messages[i].id;
      }
    }
    return null;
  }, [activeChat]);

  const handleCloseDesktopSidebar = useCallback(() => setIsDesktopSidebarOpen(false), []);
  const handleCloseMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const handleOpenAboutCreator = useCallback(() => setIsAboutCreatorOpen(true), []);
  const handleCloseAboutCreator = useCallback(() => setIsAboutCreatorOpen(false), []);
  const handleClearAttachmentError = useCallback(() => setAttachmentError(null), []);
  const handleToggleImageMode = useCallback(() => setIsImageMode((prev) => !prev), []);
  const handleAddFiles = useCallback(
    (files: FileList | File[]) => {
      void handleAddAttachments(files);
    },
    [handleAddAttachments]
  );
  const handleSelectStarter = useCallback(
    (prompt: string, isImage?: boolean) => {
      void sendMessage(prompt, isImage);
    },
    [sendMessage]
  );
  const handleLiveAutoSend = useCallback(
    (spokenText: string) => {
      void sendMessage(spokenText);
    },
    [sendMessage]
  );
  const handleSend = useCallback(() => {
    void sendMessage();
  }, [sendMessage]);
  const handleRetryOrRegenerate = useCallback(() => {
    void handleRegenerateOrRetry();
  }, [handleRegenerateOrRetry]);
  const handleToggleLiveMode = useCallback(() => {
    setIsLiveMode((prev) => {
      const next = !prev;
      stopSpeaking(false);
      if (next) {
        setLiveResumeNonce((n) => n + 1);
      }
      return next;
    });
  }, [stopSpeaking]);

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Full-Screen Dog Background with Soft Adaptive Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <img
          src={cuteDogBg}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-slate-50/82 dark:bg-zinc-950/84" />
      </div>

      <div className="relative z-10 flex h-full w-full min-w-0">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          isDesktopOpen={isDesktopSidebarOpen}
          isMobileOpen={isMobileSidebarOpen}
          t={t}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onClearAll={handleClearAll}
          onCloseDesktop={handleCloseDesktopSidebar}
          onCloseMobile={handleCloseMobileSidebar}
          onOpenAboutCreator={handleOpenAboutCreator}
        />

        {/* Main Workspace */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Workspace Toolbar */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200/85 bg-white/92 px-3.5 sm:px-5 dark:border-zinc-800/85 dark:bg-zinc-950/92">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label={t.openSidebar}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors duration-75 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Open Sidebar Button (only shown when collapsed) */}
            {!isDesktopSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsDesktopSidebarOpen(true)}
                aria-label={t.openSidebar}
                title={t.openSidebar}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors duration-75 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 md:inline-flex dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}

            {/* Quick Brand / Active Chat Context */}
            <div className="flex min-w-0 items-center gap-2">
              {(!isDesktopSidebarOpen || !activeChat) && (
                <div className="flex items-center gap-2 md:hidden">
                  <BrandLogo className="h-6 w-6 shrink-0" />
                </div>
              )}
              {!isDesktopSidebarOpen && (
                <div className="hidden items-center gap-2 md:flex">
                  <BrandLogo className="h-6 w-6 shrink-0" />
                  <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-zinc-100">
                    {t.brandName}
                  </span>
                </div>
              )}
              {activeChat && (
                <>
                  {!isDesktopSidebarOpen && (
                    <span
                      aria-hidden="true"
                      className="hidden text-slate-300 md:inline dark:text-zinc-700"
                    >
                      /
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-zinc-300">
                    {activeChat.title || t.untitledChat}
                  </span>
                </>
              )}
              {!activeChat && isDesktopSidebarOpen && (
                <span className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  {t.brandName}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Quick New Chat Button (visible on mobile or when desktop sidebar is collapsed) */}
            <button
              type="button"
              onClick={handleNewChat}
              aria-label={t.newChat}
              title={t.newChat}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors duration-75 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${
                isDesktopSidebarOpen ? 'md:hidden' : ''
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline whitespace-nowrap">{t.newChat}</span>
            </button>

            {/* About Creator Button */}
            <button
              type="button"
              onClick={handleOpenAboutCreator}
              aria-label={t.aboutCreator}
              title={t.aboutCreator}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors duration-75 hover:bg-slate-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-teal-300"
            >
              <User className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t.aboutCreator}</span>
            </button>

            {/* Bilingual Language Segmented Toggle (EN | አማ) */}
            <div
              role="group"
              aria-label={t.languageLabel}
              className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => {
                  setUiLanguage('en');
                  setResponseLanguage('auto');
                }}
                aria-pressed={uiLanguage === 'en'}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                  uiLanguage === 'en'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  setUiLanguage('am');
                  setResponseLanguage('am');
                }}
                aria-pressed={uiLanguage === 'am'}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                  uiLanguage === 'am'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                አማ
              </button>
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? t.toggleThemeLight : t.toggleThemeDark}
              title={theme === 'dark' ? t.toggleThemeLight : t.toggleThemeDark}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors duration-75 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Chat Viewport */}
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="geriai-scroll flex-1 overflow-y-auto"
        >
          {!activeChat || activeChat.messages.length === 0 ? (
            <WelcomeScreen
              t={t}
              onSelectStarter={handleSelectStarter}
            />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-2 px-4 py-6">
              {activeChat.messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.id === lastAssistantId}
                  isLastAssistant={msg.id === lastAssistantId}
                  isSpeaking={speakingMessageId === msg.id}
                  isSpeechSupported={isSpeechSupported}
                  voiceEffect={voiceEffect}
                  speechNotice={speechNotice?.messageId === msg.id ? speechNotice : null}
                  t={t}
                  onRegenerate={handleRetryOrRegenerate}
                  onRetry={handleRetryOrRegenerate}
                  onToggleSpeak={toggleSpeakMessage}
                  onCycleVoiceEffect={cycleVoiceEffect}
                  onDismissSpeechNotice={dismissSpeechNotice}
                />
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </main>

        {/* Floating Composer */}
        <footer className="shrink-0 bg-transparent pt-1">
          <ChatComposer
            value={inputValue}
            onChange={setInputValue}
            attachments={attachments}
            onAddAttachments={handleAddFiles}
            onRemoveAttachment={handleRemoveAttachment}
            attachmentError={attachmentError}
            onClearAttachmentError={handleClearAttachmentError}
            isImageMode={isImageMode}
            onToggleImageMode={handleToggleImageMode}
            imageAspectRatio={imageAspectRatio}
            onChangeImageAspectRatio={setImageAspectRatio}
            isLiveMode={isLiveMode}
            isLiveSpeaking={Boolean(speakingMessageId)}
            liveResumeNonce={liveResumeNonce}
            onToggleLiveMode={handleToggleLiveMode}
            onLiveAutoSend={handleLiveAutoSend}
            onSend={handleSend}
            onStop={stopGeneration}
            isStreaming={isStreaming}
            uiLanguage={uiLanguage}
            responseLanguage={responseLanguage}
            onChangeResponseLanguage={setResponseLanguage}
            soundEffectsEnabled={soundEffectsEnabled}
            onToggleSoundEffects={toggleSoundEffects}
            t={t}
          />
        </footer>
        </div>
      </div>

      <AboutCreatorModal
        isOpen={isAboutCreatorOpen}
        uiLanguage={uiLanguage}
        t={t}
        onClose={handleCloseAboutCreator}
      />
    </div>
  );
}
