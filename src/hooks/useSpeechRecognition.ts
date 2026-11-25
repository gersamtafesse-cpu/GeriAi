import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionConstructor,
  isAudioRecordingSupported,
  pickBestSupportedAudioMimeType,
  playVoiceChime,
  type BrowserSpeechRecognition,
  type BrowserSpeechRecognitionErrorEvent,
  type BrowserSpeechRecognitionEvent,
} from '../utils/voice';

export interface SpeechRecognitionMessages {
  unsupported: string;
  permissionDenied: string;
  noSpeech: string;
  noMicrophone: string;
  languageUnsupported: string;
  networkError: string;
  genericError: string;
  transcribeError: string;
}

export type VoiceEngineMode = 'browser' | 'hd';

interface UseSpeechRecognitionOptions {
  value: string;
  onChange: (nextValue: string) => void;
  lang: string;
  languageHint: 'auto' | 'en' | 'am';
  soundEffectsEnabled: boolean;
  messages: SpeechRecognitionMessages;
  autoSendOnPause?: boolean;
  onAutoSend?: (spokenText: string) => void;
  preferHdMode?: boolean;
}

function joinTranscript(base: string, transcript: string): string {
  const trimmedBase = base.trimEnd();
  const trimmedTranscript = transcript.trim();
  if (!trimmedBase) return trimmedTranscript;
  if (!trimmedTranscript) return base;
  return `${trimmedBase} ${trimmedTranscript}`;
}

function pickBestAlternative(result: SpeechRecognitionResult): string {
  if (!result || result.length === 0) return '';
  let bestText = result[0]?.transcript ?? '';
  let bestConfidence = typeof result[0]?.confidence === 'number' ? result[0].confidence : 0;

  for (let i = 1; i < result.length; i++) {
    const alt = result[i];
    if (!alt?.transcript) continue;
    const conf = typeof alt.confidence === 'number' ? alt.confidence : 0;
    if (conf > bestConfidence) {
      bestConfidence = conf;
      bestText = alt.transcript;
    }
  }
  return bestText;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export function useSpeechRecognition({
  value,
  onChange,
  lang,
  languageHint,
  soundEffectsEnabled,
  messages,
  autoSendOnPause = false,
  onAutoSend,
  preferHdMode = false,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeEngine, setActiveEngine] = useState<VoiceEngineMode>('browser');
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [interimPreview, setInterimPreview] = useState('');
  const [reviewReady, setReviewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browserSupported = getSpeechRecognitionConstructor() !== null;
  const hdSupported = isAudioRecordingSupported();
  const isSupported = browserSupported || hdSupported;

  // Refs for stable callbacks across restarts & async teardown
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const wantsListeningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const speechDecayTimerRef = useRef<number | null>(null);
  const noSpeechRestartCountRef = useRef(0);

  const baseValueRef = useRef('');
  const finalTranscriptRef = useRef('');
  const combinedTranscriptRef = useRef('');

  // HD MediaRecorder + AnalyserNode refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const transcribeAbortRef = useRef<AbortController | null>(null);
  const discardOnStopRef = useRef(false);
  const hdSpeechHeardRef = useRef(false);
  const hdLastLoudAtRef = useRef(0);
  const hdStartAtRef = useRef(0);

  const latestValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const messagesRef = useRef(messages);
  const soundEnabledRef = useRef(soundEffectsEnabled);
  const autoSendRef = useRef(autoSendOnPause);
  const onAutoSendRef = useRef(onAutoSend);
  const langRef = useRef(lang);
  const languageHintRef = useRef(languageHint);
  const preferHdRef = useRef(preferHdMode);

  latestValueRef.current = value;
  onChangeRef.current = onChange;
  messagesRef.current = messages;
  soundEnabledRef.current = soundEffectsEnabled;
  autoSendRef.current = autoSendOnPause;
  onAutoSendRef.current = onAutoSend;
  langRef.current = lang;
  languageHintRef.current = languageHint;
  preferHdRef.current = preferHdMode;

  const clearTimers = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (speechDecayTimerRef.current !== null) {
      window.clearTimeout(speechDecayTimerRef.current);
      speechDecayTimerRef.current = null;
    }
    if (durationIntervalRef.current !== null) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (levelRafRef.current !== null) {
      window.cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
  }, []);

  const releaseMediaHardware = useCallback(() => {
    if (levelRafRef.current !== null) {
      window.cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    if (durationIntervalRef.current !== null) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      }
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopListening = useCallback(
    (playChime = true, discardHdAudio = false) => {
      wantsListeningRef.current = false;
      discardOnStopRef.current = discardHdAudio;
      clearTimers();

      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (rec) {
        try {
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
          rec.onspeechstart = null;
          rec.onspeechend = null;
          rec.stop();
        } catch {
          // Ignore stop errors if already stopped
        }
        if (playChime) {
          playVoiceChime('micOff', soundEnabledRef.current);
        }
        setIsListening(false);
        setInterimPreview('');
        setAudioLevel(0);
        if (!discardHdAudio && combinedTranscriptRef.current.trim()) {
          setReviewReady(true);
        }
      }

      const recorder = mediaRecorderRef.current;
      if (recorder) {
        mediaRecorderRef.current = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            releaseMediaHardware();
            setIsListening(false);
          }
        } else {
          releaseMediaHardware();
          setIsListening(false);
        }
        if (playChime) {
          playVoiceChime('micOff', soundEnabledRef.current);
        }
      } else {
        releaseMediaHardware();
        setIsListening(false);
        setInterimPreview('');
      }
    },
    [clearTimers, releaseMediaHardware]
  );

  useEffect(() => {
    return () => {
      wantsListeningRef.current = false;
      discardOnStopRef.current = true;
      clearTimers();
      transcribeAbortRef.current?.abort();
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (rec) {
        try {
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
          rec.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
      releaseMediaHardware();
    };
  }, [clearTimers, releaseMediaHardware]);

  const clearError = useCallback(() => setError(null), []);
  const clearReviewReady = useCallback(() => setReviewReady(false), []);

  const commitAutoSendFromBrowser = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    const spoken = combinedTranscriptRef.current.trim();
    if (!spoken) return;
    const base = baseValueRef.current;
    const fullText = joinTranscript(base, spoken).trim();
    combinedTranscriptRef.current = '';
    finalTranscriptRef.current = '';
    baseValueRef.current = '';
    setInterimPreview('');
    stopListening(false, true);
    onChangeRef.current('');
    if (fullText) {
      onAutoSendRef.current?.(fullText);
    }
  }, [stopListening]);

  const transcribeRecordedBlob = useCallback(async (blob: Blob, baseBeforeRecording: string) => {
    if (blob.size < 400) {
      setError(messagesRef.current.noSpeech);
      return;
    }

    transcribeAbortRef.current?.abort();
    const controller = new AbortController();
    transcribeAbortRef.current = controller;
    setIsTranscribing(true);
    setError(null);

    try {
      const audioBase64 = await blobToBase64(blob);
      if (controller.signal.aborted) return;

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || 'audio/webm',
          languageHint: languageHintRef.current,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        text?: string;
        empty?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || messagesRef.current.transcribeError);
      }

      const transcript = (payload.text ?? '').trim();
      if (!transcript || payload.empty) {
        setError(messagesRef.current.noSpeech);
        return;
      }

      if (autoSendRef.current && onAutoSendRef.current) {
        const fullText = joinTranscript(baseBeforeRecording, transcript).trim();
        onChangeRef.current('');
        if (fullText) {
          onAutoSendRef.current(fullText);
        }
      } else {
        const joined = joinTranscript(baseBeforeRecording, transcript);
        onChangeRef.current(joined);
        setReviewReady(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const msg = err instanceof Error && err.message ? err.message : messagesRef.current.transcribeError;
      setError(msg);
    } finally {
      if (transcribeAbortRef.current === controller) {
        transcribeAbortRef.current = null;
      }
      setIsTranscribing(false);
    }
  }, []);

  const startHdRecording = useCallback(async () => {
    if (!hdSupported) {
      setError(messagesRef.current.unsupported);
      return;
    }
    if (mediaRecorderRef.current || recognitionRef.current) return;

    clearTimers();
    setError(null);
    setReviewReady(false);
    setInterimPreview('');
    setRecordingSeconds(0);
    discardOnStopRef.current = false;
    wantsListeningRef.current = true;
    setActiveEngine('hd');

    const baseBeforeRecording = latestValueRef.current;
    baseValueRef.current = baseBeforeRecording;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!wantsListeningRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      hdSpeechHeardRef.current = false;
      hdStartAtRef.current = Date.now();
      hdLastLoudAtRef.current = Date.now();

      const preferredMime = pickBestSupportedAudioMimeType();
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        const mime = recorder.mimeType || preferredMime || 'audio/webm';
        audioChunksRef.current = [];
        releaseMediaHardware();
        setIsListening(false);

        if (discardOnStopRef.current) {
          discardOnStopRef.current = false;
          return;
        }
        const blob = new Blob(chunks, { type: mime });
        void transcribeRecordedBlob(blob, baseBeforeRecording);
      };

      // Live audio level meter + silence VAD for Live Mode
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.72;
          source.connect(analyser);

          const data = new Uint8Array(analyser.fftSize);
          let lastStateSync = 0;

          const sampleLoop = () => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
              return;
            }
            analyser.getByteTimeDomainData(data);
            let sumSq = 0;
            for (let i = 0; i < data.length; i++) {
              const norm = (data[i] - 128) / 128;
              sumSq += norm * norm;
            }
            const rms = Math.sqrt(sumSq / data.length);
            const scaledLevel = Math.min(1, rms * 4.2);

            const now = Date.now();
            if (scaledLevel > 0.14) {
              hdSpeechHeardRef.current = true;
              hdLastLoudAtRef.current = now;
            }

            // Live Mode VAD: wait cleanly for 2.1s pause after real speech before auto-transcribing
            if (
              autoSendRef.current &&
              hdSpeechHeardRef.current &&
              now - hdStartAtRef.current > 1400 &&
              now - hdLastLoudAtRef.current > 2100
            ) {
              wantsListeningRef.current = false;
              const activeRec = mediaRecorderRef.current;
              mediaRecorderRef.current = null;
              if (activeRec && activeRec.state === 'recording') {
                activeRec.stop();
              }
              return;
            }

            if (now - lastStateSync >= 55) {
              lastStateSync = now;
              setAudioLevel(scaledLevel);
            }

            levelRafRef.current = window.requestAnimationFrame(sampleLoop);
          };

          levelRafRef.current = window.requestAnimationFrame(sampleLoop);
        } catch {
          // Continue recording even if AudioContext meter is blocked
        }
      }

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsListening(true);
      playVoiceChime('micOn', soundEnabledRef.current);

      const startedAt = Date.now();
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 500);
    } catch (err) {
      releaseMediaHardware();
      wantsListeningRef.current = false;
      setIsListening(false);
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError(messagesRef.current.permissionDenied);
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError(messagesRef.current.noMicrophone);
      } else {
        setError(messagesRef.current.genericError);
      }
    }
  }, [clearTimers, hdSupported, releaseMediaHardware, transcribeRecordedBlob]);

  const spawnBrowserRecognition = useCallback(
    (isRestart: boolean) => {
      const RecognitionCtor = getSpeechRecognitionConstructor();
      if (!RecognitionCtor) {
        if (hdSupported) {
          void startHdRecording();
        } else {
          setError(messagesRef.current.unsupported);
        }
        return;
      }

      try {
        const recognition = new RecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = langRef.current;

        recognition.onstart = () => {
          setIsListening(true);
          if (!isRestart) {
            playVoiceChime('micOn', soundEnabledRef.current);
          }
        };

        recognition.onspeechstart = () => {
          setAudioLevel(0.65);
        };

        recognition.onspeechend = () => {
          setAudioLevel(0.12);
        };

        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          noSpeechRestartCountRef.current = 0;
          let interim = '';
          let finalized = finalTranscriptRef.current;
          let sawFinal = false;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = pickBestAlternative(result);
            if (result.isFinal) {
              sawFinal = true;
              finalized = finalized ? `${finalized.trimEnd()} ${text.trim()}` : text.trim();
            } else {
              interim += text;
            }
          }

          finalTranscriptRef.current = finalized;
          const cleanInterim = interim.trim();
          setInterimPreview(cleanInterim);
          const combined = [finalized, cleanInterim].filter(Boolean).join(' ').trim();
          combinedTranscriptRef.current = combined;
          onChangeRef.current(joinTranscript(baseValueRef.current, combined));

          // Real-time activity pulse from live results
          setAudioLevel(cleanInterim ? 0.72 : 0.45);
          if (speechDecayTimerRef.current !== null) {
            window.clearTimeout(speechDecayTimerRef.current);
          }
          speechDecayTimerRef.current = window.setTimeout(() => {
            setAudioLevel(0.15);
          }, 550);

          if (autoSendRef.current && combined) {
            if (pauseTimerRef.current !== null) {
              window.clearTimeout(pauseTimerRef.current);
            }
            // Generous pause window (2.2s after final phrase, 2.8s while interim) so pauses/accents don't cut off early
            const delayMs = sawFinal && !cleanInterim ? 2200 : 2800;
            pauseTimerRef.current = window.setTimeout(() => {
              if (autoSendRef.current && combinedTranscriptRef.current.trim()) {
                commitAutoSendFromBrowser();
              }
            }, delayMs);
          }
        };

        recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
          const msgs = messagesRef.current;
          const code = event.error;

          if (code === 'aborted') {
            return;
          }

          // Ignore transient silence errors while the user is pausing between phrases
          if (code === 'no-speech' && wantsListeningRef.current) {
            noSpeechRestartCountRef.current += 1;
            if (noSpeechRestartCountRef.current <= 6) {
              return;
            }
            wantsListeningRef.current = false;
            setError(msgs.noSpeech);
            return;
          }

          // Upgrade seamlessly to Gemini HD audio capture if browser lacks language or speech service fails
          if (
            (code === 'language-not-supported' || code === 'network' || code === 'service-not-allowed') &&
            hdSupported
          ) {
            wantsListeningRef.current = false;
            if (recognitionRef.current === recognition) {
              recognitionRef.current = null;
            }
            try {
              recognition.onresult = null;
              recognition.onerror = null;
              recognition.onend = null;
              recognition.abort();
            } catch {
              // Ignore
            }
            setIsListening(false);
            void startHdRecording();
            return;
          }

          wantsListeningRef.current = false;
          if (pauseTimerRef.current !== null) {
            window.clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
          }

          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setError(msgs.permissionDenied);
          } else if (code === 'no-speech') {
            setError(msgs.noSpeech);
          } else if (code === 'audio-capture') {
            setError(msgs.noMicrophone);
          } else if (code === 'language-not-supported') {
            setError(msgs.languageUnsupported);
          } else if (code === 'network') {
            setError(msgs.networkError);
          } else {
            setError(msgs.genericError);
          }

          setIsListening(false);
          setInterimPreview('');
          setAudioLevel(0);
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null;
          }
        };

        recognition.onend = () => {
          if (recognitionRef.current !== recognition) {
            return;
          }
          recognitionRef.current = null;

          // Keep listening seamlessly across Chrome/Android short-pause timeouts!
          if (wantsListeningRef.current) {
            if (autoSendRef.current && combinedTranscriptRef.current.trim()) {
              commitAutoSendFromBrowser();
              return;
            }
            restartTimerRef.current = window.setTimeout(() => {
              if (wantsListeningRef.current && !recognitionRef.current) {
                spawnBrowserRecognition(true);
              }
            }, 120);
            return;
          }

          clearTimers();
          setIsListening(false);
          setInterimPreview('');
          setAudioLevel(0);
          if (autoSendRef.current && combinedTranscriptRef.current.trim()) {
            commitAutoSendFromBrowser();
          } else if (combinedTranscriptRef.current.trim()) {
            setReviewReady(true);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch {
        recognitionRef.current = null;
        wantsListeningRef.current = false;
        setIsListening(false);
        setError(messagesRef.current.genericError);
      }
    },
    [clearTimers, commitAutoSendFromBrowser, hdSupported, startHdRecording]
  );

  const startListening = useCallback(() => {
    if (recognitionRef.current || mediaRecorderRef.current || isTranscribing) return;

    // Prefer Gemini HD audio transcription for Amharic (browser SpeechRecognition lacks reliable am-ET),
    // when browser SpeechRecognition is unavailable, or when user explicitly selects HD Voice.
    const shouldUseHd =
      hdSupported &&
      (preferHdRef.current || languageHintRef.current === 'am' || !browserSupported);

    if (shouldUseHd) {
      void startHdRecording();
      return;
    }

    if (!browserSupported) {
      setError(messagesRef.current.unsupported);
      return;
    }

    clearTimers();
    setError(null);
    setReviewReady(false);
    setInterimPreview('');
    setRecordingSeconds(0);
    noSpeechRestartCountRef.current = 0;
    baseValueRef.current = latestValueRef.current;
    finalTranscriptRef.current = '';
    combinedTranscriptRef.current = '';
    wantsListeningRef.current = true;
    setActiveEngine('browser');

    const startedAt = Date.now();
    durationIntervalRef.current = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    spawnBrowserRecognition(false);
  }, [browserSupported, clearTimers, hdSupported, isTranscribing, spawnBrowserRecognition, startHdRecording]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening(true, false);
      return;
    }
    startListening();
  }, [isListening, startListening, stopListening]);

  return {
    isSupported,
    browserSupported,
    hdSupported,
    activeEngine,
    isListening,
    isTranscribing,
    audioLevel,
    recordingSeconds,
    interimPreview,
    reviewReady,
    error,
    clearError,
    clearReviewReady,
    startListening,
    toggleListening,
    stopListening,
  };
}
