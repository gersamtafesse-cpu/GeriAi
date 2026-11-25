import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  ArrowUp,
  AudioLines,
  CheckCircle2,
  FileAudio,
  FileCode2,
  FileText,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  ChatAttachment,
  ImageAspectRatio,
  Language,
  ResponseLanguage,
} from '../types/chat';
import type { Translations } from '../data/translations';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ACCEPTED_FILE_INPUT, formatFileSize } from '../utils/attachments';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  attachments: ChatAttachment[];
  onAddAttachments: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
  attachmentError: string | null;
  onClearAttachmentError: () => void;
  isImageMode: boolean;
  onToggleImageMode: () => void;
  imageAspectRatio: ImageAspectRatio;
  onChangeImageAspectRatio: (ratio: ImageAspectRatio) => void;
  isLiveMode: boolean;
  isLiveSpeaking: boolean;
  liveResumeNonce: number;
  onToggleLiveMode: () => void;
  onLiveAutoSend: (spokenText: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  uiLanguage: Language;
  responseLanguage: ResponseLanguage;
  onChangeResponseLanguage: (lang: ResponseLanguage) => void;
  soundEffectsEnabled: boolean;
  onToggleSoundEffects: () => void;
  t: Translations;
}

function getFileExtensionLabel(name: string, kind: ChatAttachment['kind']): string {
  const parts = name.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase().slice(0, 6);
  }
  return kind.toUpperCase();
}

function AttachmentIcon({ kind }: { kind: ChatAttachment['kind'] }) {
  switch (kind) {
    case 'audio':
      return <FileAudio className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />;
    case 'text':
      return <FileCode2 className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />;
    default:
      return <FileText className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />;
  }
}

export const ChatComposer = memo(function ChatComposer({
  value,
  onChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  attachmentError,
  onClearAttachmentError,
  isImageMode,
  onToggleImageMode,
  imageAspectRatio,
  onChangeImageAspectRatio,
  isLiveMode,
  isLiveSpeaking,
  liveResumeNonce,
  onToggleLiveMode,
  onLiveAutoSend,
  onSend,
  onStop,
  isStreaming,
  uiLanguage,
  responseLanguage,
  onChangeResponseLanguage,
  soundEffectsEnabled,
  onToggleSoundEffects,
  t,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preferHdVoice, setPreferHdVoice] = useState(false);

  const recognitionLang = useMemo(() => {
    if (responseLanguage === 'am') return 'am-ET';
    if (responseLanguage === 'en') return 'en-US';
    return uiLanguage === 'am' ? 'am-ET' : 'en-US';
  }, [responseLanguage, uiLanguage]);

  const languageHint = useMemo<'auto' | 'en' | 'am'>(() => {
    if (responseLanguage === 'am') return 'am';
    if (responseLanguage === 'en') return 'en';
    return uiLanguage === 'am' ? 'am' : 'auto';
  }, [responseLanguage, uiLanguage]);

  const recognitionMessages = useMemo(
    () => ({
      unsupported: t.micUnsupported,
      permissionDenied: t.micPermissionDenied,
      noSpeech: t.micNoSpeech,
      noMicrophone: t.micNoMicrophone,
      languageUnsupported: t.micLanguageUnsupported,
      networkError: t.micNetworkError,
      genericError: t.micGenericError,
      transcribeError: t.micTranscribeError,
    }),
    [
      t.micGenericError,
      t.micLanguageUnsupported,
      t.micNetworkError,
      t.micNoMicrophone,
      t.micNoSpeech,
      t.micPermissionDenied,
      t.micTranscribeError,
      t.micUnsupported,
    ]
  );

  const {
    isSupported: isMicSupported,
    browserSupported,
    hdSupported,
    activeEngine,
    isListening,
    isTranscribing,
    audioLevel,
    recordingSeconds,
    interimPreview,
    reviewReady,
    error: micError,
    clearError: clearMicError,
    clearReviewReady,
    startListening,
    toggleListening,
    stopListening,
  } = useSpeechRecognition({
    value,
    onChange,
    lang: recognitionLang,
    languageHint,
    soundEffectsEnabled,
    messages: recognitionMessages,
    autoSendOnPause: isLiveMode,
    onAutoSend: onLiveAutoSend,
    preferHdMode: preferHdVoice,
  });

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    if (reviewReady && !isListening && !isTranscribing) {
      textareaRef.current?.focus();
    }
  }, [isListening, isTranscribing, reviewReady]);

  // Coordinate hands-free Live Voice microphone lifecycle cleanly
  useEffect(() => {
    if (!isLiveMode) {
      return;
    }
    if (isStreaming || isLiveSpeaking) {
      if (isListening) {
        stopListening(false, true);
      }
      return;
    }
    if (isMicSupported && !isListening && !isTranscribing && !micError) {
      const timer = window.setTimeout(() => {
        startListening();
      }, 220);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [
    isListening,
    isLiveMode,
    isLiveSpeaking,
    isMicSupported,
    isStreaming,
    isTranscribing,
    liveResumeNonce,
    micError,
    startListening,
    stopListening,
  ]);

  const triggerSend = () => {
    if (isListening) {
      stopListening(false, activeEngine === 'hd');
    }
    clearMicError();
    clearReviewReady();
    onClearAttachmentError();
    onSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (value.trim().length > 0 || attachments.length > 0)) {
        triggerSend();
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = e.clipboardData?.files;
    if (pastedFiles && pastedFiles.length > 0) {
      e.preventDefault();
      onAddAttachments(pastedFiles);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isStreaming) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isStreaming) return;
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      onAddAttachments(droppedFiles);
    }
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isStreaming;

  const langOptions: Array<{ value: ResponseLanguage; label: string }> = [
    { value: 'auto', label: t.responseLangAuto },
    { value: 'am', label: t.responseLangAm },
    { value: 'en', label: t.responseLangEn },
  ];

  const activeError = attachmentError || micError;
  const showLiveNotice = isLiveMode && !isMicSupported && !activeError;
  const showReviewBanner = Boolean(
    reviewReady && !isListening && !isTranscribing && !isLiveMode && !activeError && value.trim().length > 0
  );
  const showStatusBanner = Boolean(
    isLiveMode || isListening || isTranscribing || showReviewBanner || activeError
  );

  const liveStatusText = isStreaming
    ? t.liveThinking
    : isTranscribing
    ? t.micTranscribing
    : isLiveSpeaking
    ? t.liveSpeaking
    : isMicSupported
    ? t.liveListening
    : t.liveMicUnavailableNotice;

  const formattedSeconds = `${Math.floor(recordingSeconds / 60)}:${String(
    recordingSeconds % 60
  ).padStart(2, '0')}`;

  const barMultipliers = [0.45, 0.78, 1.0, 0.72, 0.5];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-5">
      {showStatusBanner && (
        <div
          role={activeError ? 'alert' : 'status'}
          className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 py-2 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95"
        >
          {activeError ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{activeError}</span>
            </div>
          ) : isTranscribing ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 text-teal-800 dark:text-teal-300">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-teal-600 dark:text-teal-400" />
              <span className="font-medium">{t.micTranscribing}</span>
            </div>
          ) : showReviewBanner ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 text-teal-800 dark:text-teal-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
              <span className="font-medium">{t.micReadyToReview}</span>
            </div>
          ) : isLiveMode ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5 text-teal-800 dark:text-teal-300">
              {isListening ? (
                <div className="flex h-4 items-center gap-0.5" aria-hidden="true">
                  {barMultipliers.map((mult, idx) => (
                    <span
                      key={idx}
                      className="w-0.5 rounded-full bg-teal-600 transition-transform duration-75 dark:bg-teal-400"
                      style={{
                        height: '14px',
                        transform: `scaleY(${Math.max(0.22, Math.min(1, audioLevel * mult + 0.18))})`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <AudioLines
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isLiveSpeaking ? 'animate-pulse text-teal-600 dark:text-teal-400' : ''
                  }`}
                />
              )}
              <span className="truncate font-medium">
                {showLiveNotice ? t.liveMicUnavailableNotice : liveStatusText}
              </span>
              {isListening && activeEngine === 'hd' && (
                <span className="shrink-0 font-mono text-[11px] text-teal-700/80 tabular-nums dark:text-teal-300/80">
                  {formattedSeconds}
                </span>
              )}
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2.5 text-teal-800 dark:text-teal-300">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
              </span>
              <div className="flex h-4 items-center gap-0.5" aria-hidden="true">
                {barMultipliers.map((mult, idx) => (
                  <span
                    key={idx}
                    className="w-0.5 rounded-full bg-red-500 transition-transform duration-75 dark:bg-red-400"
                    style={{
                      height: '14px',
                      transform: `scaleY(${Math.max(0.22, Math.min(1, audioLevel * mult + 0.16))})`,
                    }}
                  />
                ))}
              </div>
              <span className="truncate font-medium">
                {interimPreview ? interimPreview : t.micListening}
              </span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                {activeEngine === 'hd' ? t.micHdModeLabel : t.micBrowserModeLabel}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums dark:text-zinc-400">
                {formattedSeconds}
              </span>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {(isLiveMode || showReviewBanner) && !isStreaming && !isTranscribing && value.trim().length > 0 && (
              <button
                type="button"
                onClick={triggerSend}
                className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                {t.liveSendNow}
              </button>
            )}

            {isLiveMode ? (
              <button
                type="button"
                onClick={() => {
                  stopListening(false, true);
                  clearMicError();
                  onToggleLiveMode();
                }}
                className="rounded-md px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t.liveModeStop}
              </button>
            ) : isListening ? (
              <button
                type="button"
                onClick={() => stopListening(true, false)}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {t.micStop}
              </button>
            ) : isTranscribing ? null : (
              <button
                type="button"
                onClick={() => {
                  clearMicError();
                  clearReviewReady();
                  onClearAttachmentError();
                }}
                aria-label={t.dismiss}
                className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-3xl border bg-white/95 shadow-lg shadow-slate-900/5 transition-colors duration-75 dark:bg-zinc-900/95 dark:shadow-black/30 ${
          isDragging
            ? 'border-teal-600 ring-2 ring-teal-600/20 dark:border-teal-400 dark:ring-teal-400/20'
            : isListening && !isLiveMode
            ? 'border-red-400 focus-within:border-red-500 dark:border-red-500/70'
            : isLiveMode
            ? 'border-teal-600/80 ring-2 ring-teal-600/15 dark:border-teal-500/80 dark:ring-teal-500/15'
            : 'border-slate-200/90 focus-within:border-teal-700 dark:border-zinc-800/90 dark:focus-within:border-teal-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_INPUT}
          aria-label={t.attachFile}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddAttachments(e.target.files);
            }
            e.target.value = '';
          }}
        />

        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-teal-50/95 text-xs font-semibold text-teal-800 dark:bg-teal-950/95 dark:text-teal-200">
            {t.dropFilesHere}
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3.5 pb-1">
            {attachments.map((att) =>
              att.kind === 'image' && att.previewUrl ? (
                <div
                  key={att.id}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    aria-label={`${t.removeAttachment}: ${att.name}`}
                    title={t.removeAttachment}
                    className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-white transition-colors hover:bg-slate-950 focus-visible:outline-2 focus-visible:outline-teal-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  key={att.id}
                  className="flex max-w-[220px] items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 py-1.5 pr-1.5 pl-2.5 dark:border-zinc-700/80 dark:bg-zinc-800/85"
                >
                  <AttachmentIcon kind={att.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800 dark:text-zinc-100">
                      {att.name}
                    </p>
                    <p className="text-[11px] text-slate-500 tabular-nums dark:text-zinc-400">
                      {getFileExtensionLabel(att.name, att.kind)} · {formatFileSize(att.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    aria-label={`${t.removeAttachment}: ${att.name}`}
                    title={t.removeAttachment}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Active Image Generation Mode Bar */}
        {isImageMode && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/75 px-4 py-2 dark:border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
              <ImagePlus className="h-3.5 w-3.5 shrink-0" />
              <span>{t.imageModeActive}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                {t.imageAspectRatioLabel}:
              </span>
              {(['1:1', '16:9', '9:16', '4:3', '3:4'] as ImageAspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onChangeImageAspectRatio(ratio)}
                  aria-pressed={imageAspectRatio === ratio}
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors ${
                    imageAspectRatio === ratio
                      ? 'bg-teal-700 text-white dark:bg-teal-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {ratio}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onToggleImageMode();
                  textareaRef.current?.focus();
                }}
                aria-label={t.exitImageMode}
                title={t.exitImageMode}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isImageMode
              ? t.imagePromptPlaceholder
              : isLiveMode
              ? t.livePromptPlaceholder
              : t.composerPlaceholder
          }
          aria-label={
            isImageMode
              ? t.imagePromptPlaceholder
              : isLiveMode
              ? t.livePromptPlaceholder
              : t.composerPlaceholder
          }
          className="geriai-scroll block max-h-[180px] min-h-[54px] w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Attach Photo / File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              aria-label={t.attachFile}
              title={t.attachFile}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors duration-75 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* AI Image Generation Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                onToggleImageMode();
                textareaRef.current?.focus();
              }}
              disabled={isStreaming}
              aria-pressed={isImageMode}
              aria-label={t.imageModeToggle}
              title={t.imageModeToggle}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                isImageMode
                  ? 'border-teal-600 bg-teal-700 text-white hover:bg-teal-800 dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              <ImagePlus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t.imageModeToggle}</span>
            </button>

            {/* Response Language Selector (Auto / አማርኛ / English) */}
            <div
              role="group"
              aria-label={t.responseLangLabel}
              className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800/80"
            >
              {langOptions.map((opt) => {
                const active = responseLanguage === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChangeResponseLanguage(opt.value)}
                    aria-pressed={active}
                    className={`whitespace-nowrap shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Subtle Voice Sound FX Toggle */}
            <button
              type="button"
              onClick={onToggleSoundEffects}
              aria-pressed={soundEffectsEnabled}
              aria-label={soundEffectsEnabled ? t.soundFxOn : t.soundFxOff}
              title={soundEffectsEnabled ? t.soundFxOn : t.soundFxOff}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                soundEffectsEnabled
                  ? 'border-teal-600/30 bg-teal-50 text-teal-800 hover:bg-teal-100/70 dark:border-teal-500/30 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-950/80'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {soundEffectsEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* HD Voice Precision Toggle (shown when browser STT & HD Audio are both available and not currently recording) */}
            {browserSupported && hdSupported && languageHint !== 'am' && !isListening && !isTranscribing && (
              <button
                type="button"
                onClick={() => setPreferHdVoice((prev) => !prev)}
                aria-pressed={preferHdVoice}
                aria-label={t.micHdModeTitle}
                title={t.micHdModeTitle}
                className={`hidden h-9 items-center gap-1 rounded-xl border px-2 text-[11px] font-medium transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:inline-flex ${
                  preferHdVoice
                    ? 'border-teal-600/40 bg-teal-50 text-teal-800 hover:bg-teal-100/70 dark:border-teal-500/40 dark:bg-teal-950/60 dark:text-teal-300'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t.micHdModeLabel}</span>
              </button>
            )}

            {/* Microphone Dictation Button */}
            <button
              type="button"
              onClick={() => {
                if (isLiveMode) {
                  onToggleLiveMode();
                }
                toggleListening();
              }}
              disabled={isStreaming || isTranscribing}
              aria-pressed={isListening && !isLiveMode}
              aria-disabled={!isMicSupported || isStreaming || isTranscribing}
              aria-label={isListening ? t.micStop : t.micStart}
              title={
                !isMicSupported
                  ? t.micUnsupported
                  : isListening
                  ? t.micStop
                  : t.micStart
              }
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                isListening && !isLiveMode
                  ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/60 dark:text-red-400 dark:hover:bg-red-900/60'
                  : isMicSupported
                  ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500'
              }`}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-600 dark:text-teal-400" />
              ) : isListening && !isLiveMode ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* Voice / Live Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (isLiveMode) {
                  stopListening(false, true);
                }
                clearMicError();
                clearReviewReady();
                onToggleLiveMode();
              }}
              aria-pressed={isLiveMode}
              aria-label={isLiveMode ? t.liveModeStop : t.liveModeStart}
              title={isLiveMode ? t.liveModeStop : t.liveModeStart}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                isLiveMode
                  ? 'border-teal-600 bg-teal-700 text-white hover:bg-teal-800 dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              <AudioLines className={`h-4 w-4 shrink-0 ${isLiveMode ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline whitespace-nowrap">{t.liveMode}</span>
            </button>

            {/* Send / Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label={t.stopGenerating}
                title={t.stopGenerating}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-medium text-white transition-colors duration-75 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span className="whitespace-nowrap">{t.stopGenerating}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={triggerSend}
                disabled={!canSend}
                aria-label={t.send}
                title={t.send}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white transition-colors duration-75 hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500 dark:text-zinc-400">
        {t.bottomDisclaimer}
      </p>
    </div>
  );
});

