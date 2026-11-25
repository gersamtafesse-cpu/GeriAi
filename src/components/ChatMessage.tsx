import { memo, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AudioLines,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  FileCode2,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  Loader2,
  RotateCcw,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import type { ChatAttachment, Message } from '../types/chat';
import type { Translations } from '../data/translations';
import type { VoiceEffectPreset } from '../utils/voice';
import type { SpeechSynthesisNotice } from '../hooks/useSpeechSynthesis';
import { formatFileSize } from '../utils/attachments';
import { copyToClipboard } from '../utils/clipboard';
import { BrandLogo } from './BrandLogo';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
  isStreaming: boolean;
  isLastAssistant: boolean;
  isSpeaking: boolean;
  isSpeechSupported: boolean;
  voiceEffect: VoiceEffectPreset;
  speechNotice: SpeechSynthesisNotice | null;
  t: Translations;
  onRegenerate?: () => void;
  onRetry?: () => void;
  onToggleSpeak?: (messageId: string, content: string) => void;
  onCycleVoiceEffect?: () => void;
  onDismissSpeechNotice?: () => void;
}

function formatMessageTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

function UserAttachmentIcon({ kind }: { kind: ChatAttachment['kind'] }) {
  switch (kind) {
    case 'image':
      return <ImageIcon className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />;
    case 'audio':
      return <FileAudio className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />;
    case 'text':
      return <FileCode2 className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />;
    default:
      return <FileText className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />;
  }
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming,
  isLastAssistant,
  isSpeaking,
  isSpeechSupported,
  voiceEffect,
  speechNotice,
  t,
  onRegenerate,
  onRetry,
  onToggleSpeak,
  onCycleVoiceEffect,
  onDismissSpeechNotice,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    if (!message.content) return;
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
    void copyToClipboard(message.content).then((ok) => {
      if (!ok) setCopied(false);
    });
  };

  if (message.role === 'user') {
    const attachments = message.attachments ?? [];
    const imageAttachments = attachments.filter((a) => a.kind === 'image' && a.previewUrl);
    const fileAttachments = attachments.filter((a) => !(a.kind === 'image' && a.previewUrl));

    return (
      <div className="flex justify-end py-2">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="rounded-2xl border border-slate-300/60 bg-slate-200/95 px-4 py-3 text-[15px] leading-[1.65] text-slate-900 shadow-xs dark:border-zinc-700/70 dark:bg-zinc-800/95 dark:text-zinc-100">
            {imageAttachments.length > 0 && (
              <div
                className={`mb-2.5 grid gap-2 ${
                  imageAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {imageAttachments.map((att) => (
                  <img
                    key={att.id}
                    src={att.previewUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="max-h-60 w-full rounded-xl border border-slate-300/70 bg-white/60 object-contain dark:border-zinc-700/70 dark:bg-zinc-900/60"
                  />
                ))}
              </div>
            )}

            {fileAttachments.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {fileAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex max-w-full items-center gap-2 rounded-xl border border-slate-300/70 bg-white/80 px-2.5 py-1.5 text-xs dark:border-zinc-700/70 dark:bg-zinc-900/80"
                  >
                    <UserAttachmentIcon kind={att.kind} />
                    <span className="max-w-[180px] truncate font-medium text-slate-800 dark:text-zinc-100">
                      {att.name}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums dark:text-zinc-400">
                      {formatFileSize(att.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {message.content && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>
          <div className="mt-1 flex justify-end px-1 text-xs font-medium text-slate-500 tabular-nums dark:text-zinc-400">
            <span>{formatMessageTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  const showNoticeForMessage = speechNotice && speechNotice.messageId === message.id;

  return (
    <div className="group py-3">
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 shrink-0">
          <BrandLogo className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <span className="font-semibold text-slate-900 dark:text-zinc-100">
              {t.assistantName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatMessageTime(message.createdAt)}</span>
          </div>

          {message.error ? (
            <div className="space-y-3">
              {message.errorMessage &&
                message.content &&
                message.content !== message.errorMessage && (
                  <MarkdownRenderer
                    content={message.content}
                    copyCodeLabel={t.copyCode}
                    copiedLabel={t.copied}
                  />
                )}
              <div
                role="alert"
                className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                  <div className="flex-1 space-y-2">
                    <p className="leading-relaxed break-words">
                      {message.errorKind === 'timeout'
                        ? t.chatTimeoutFriendly
                        : message.errorKind === 'quota'
                        ? message.isImageGeneration
                          ? t.imageQuotaFriendly
                          : t.chatQuotaFriendly
                        : message.errorMessage || message.content || t.errorFallback}
                    </p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900/60"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{t.retry}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : !message.content &&
            (!message.generatedImages || message.generatedImages.length === 0) &&
            isStreaming ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2 text-sm text-slate-600 shadow-xs dark:border-zinc-800/85 dark:bg-zinc-900/95 dark:text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700 dark:text-teal-400" />
              <span>{message.isImageGeneration ? t.generatingImage : t.thinking}</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-xs dark:border-zinc-800/85 dark:bg-zinc-900/95">
              {message.generatedImages && message.generatedImages.length > 0 && (
                <div
                  className={`${message.content ? 'mb-3 ' : ''}grid gap-3 ${
                    message.generatedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                  }`}
                >
                  {message.generatedImages.map((img, idx) => {
                    const ext = img.mimeType.split('/')[1]?.split(';')[0] || 'png';
                    const filename = `geriai-image-${idx + 1}.${ext === 'jpeg' ? 'jpg' : ext}`;
                    return (
                      <div
                        key={img.id}
                        className="group/img relative overflow-hidden rounded-xl border border-slate-200/85 bg-slate-100/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                      >
                        <img
                          src={img.dataUrl}
                          alt={`Generated by GeriAi (${idx + 1})`}
                          referrerPolicy="no-referrer"
                          className="max-h-[480px] w-full object-contain"
                        />
                        <div className="flex items-center justify-end border-t border-slate-200/75 bg-white/85 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-900/85">
                          <a
                            href={img.dataUrl}
                            download={filename}
                            aria-label={`${t.downloadImage} ${filename}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-600/40 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-teal-500/40 dark:hover:bg-teal-950/60 dark:hover:text-teal-300"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{t.downloadImage}</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {message.content && (
                <MarkdownRenderer
                  content={message.content}
                  copyCodeLabel={t.copyCode}
                  copiedLabel={t.copied}
                />
              )}

              {!isStreaming && message.sources && message.sources.length > 0 && (
                <div className="mt-3.5 border-t border-slate-200/75 pt-3 dark:border-zinc-800/80">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300">
                    <Globe className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                    <span>{t.sourcesLabel}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {message.sources.map((src, idx) => (
                      <a
                        key={src.url}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/src flex items-center justify-between gap-2 rounded-lg border border-slate-200/85 bg-slate-50/75 px-2.5 py-2 text-xs transition-colors duration-75 hover:border-teal-600/40 hover:bg-teal-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-teal-500/40 dark:hover:bg-teal-950/40"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-200/80 text-[10px] font-semibold text-slate-700 tabular-nums dark:bg-zinc-800 dark:text-zinc-300">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-800 group-hover/src:text-teal-800 dark:text-zinc-100 dark:group-hover/src:text-teal-300">
                              {src.title}
                            </div>
                            {src.domain && (
                              <div className="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                                {src.domain}
                              </div>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 transition-colors group-hover/src:text-teal-700 dark:text-zinc-500 dark:group-hover/src:text-teal-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!message.error &&
            (message.content || (message.generatedImages && message.generatedImages.length > 0)) &&
            !isStreaming && (
            <div className="mt-2.5 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {Boolean(message.content.trim()) && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label={copied ? t.copied : t.copyResponse}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors duration-75 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                          <span className="text-teal-700 dark:text-teal-400">{t.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{t.copyResponse}</span>
                        </>
                      )}
                    </button>

                    {onToggleSpeak && (
                      <button
                        type="button"
                        onClick={() => onToggleSpeak(message.id, message.content)}
                        aria-pressed={isSpeaking}
                        aria-disabled={!isSpeechSupported}
                        aria-label={isSpeaking ? t.stopReading : t.listen}
                        title={!isSpeechSupported ? t.speechUnsupported : isSpeaking ? t.stopReading : t.listen}
                        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                          isSpeaking
                            ? 'border-teal-600/40 bg-teal-50 text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-950'
                            : isSpeechSupported
                            ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                            : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500'
                        }`}
                      >
                        {isSpeaking ? (
                          <>
                            <Square className="h-3 w-3 fill-current" />
                            <span>{t.stopReading}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>{t.listen}</span>
                          </>
                        )}
                      </button>
                    )}

                    {onCycleVoiceEffect && (
                      <button
                        type="button"
                        onClick={onCycleVoiceEffect}
                        aria-label={`${t.voiceEffectLabel}: ${t.voiceEffects[voiceEffect]}`}
                        title={`${t.voiceEffectLabel}: ${t.voiceEffects[voiceEffect]}`}
                        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                          voiceEffect !== 'natural'
                            ? 'border-teal-600/30 bg-teal-50/70 text-teal-800 hover:bg-teal-100/70 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/70'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                        }`}
                      >
                        <AudioLines className="h-3.5 w-3.5" />
                        <span>{t.voiceEffects[voiceEffect]}</span>
                      </button>
                    )}
                  </>
                )}

                {isLastAssistant && onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors duration-75 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t.regenerate}</span>
                  </button>
                )}
              </div>

              {showNoticeForMessage && (
                <div
                  role="status"
                  className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                    speechNotice.tone === 'error'
                      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                      : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="leading-relaxed">{speechNotice.text}</span>
                  </div>
                  {onDismissSpeechNotice && (
                    <button
                      type="button"
                      onClick={onDismissSpeechNotice}
                      aria-label={t.dismiss}
                      className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
