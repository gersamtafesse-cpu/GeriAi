import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VOICE_EFFECT_CONFIGS,
  VOICE_EFFECT_ORDER,
  containsEthiopic,
  isSpeechSynthesisSupported,
  playVoiceChime,
  splitTextIntoSpeechChunks,
  stripMarkdownForSpeech,
  type VoiceEffectPreset,
} from '../utils/voice';

const STORAGE_KEYS = {
  voiceEffect: 'geriai_voice_effect',
  soundEffects: 'geriai_sound_fx',
};

export interface SpeechSynthesisNotice {
  messageId: string;
  text: string;
  tone: 'info' | 'error';
}

export interface SpeechSynthesisMessages {
  unsupported: string;
  nothingToRead: string;
  amharicLimited: string;
  playbackFailed: string;
}

function getInitialVoiceEffect(): VoiceEffectPreset {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.voiceEffect);
    if (stored && VOICE_EFFECT_ORDER.includes(stored as VoiceEffectPreset)) {
      return stored as VoiceEffectPreset;
    }
  } catch {
    // Ignore storage errors
  }
  return 'natural';
}

function getInitialSoundEffects(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.soundEffects);
    if (stored === 'false') return false;
  } catch {
    // Ignore storage errors
  }
  return true;
}

export function useSpeechSynthesis(messages: SpeechSynthesisMessages) {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceEffect, setVoiceEffect] = useState<VoiceEffectPreset>(getInitialVoiceEffect);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState<boolean>(getInitialSoundEffects);
  const [notice, setNotice] = useState<SpeechSynthesisNotice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const sessionRef = useRef(0);
  const activeTextRef = useRef<{ messageId: string; rawText: string } | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const isSupported = isSpeechSynthesisSupported();

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.voiceEffect, voiceEffect);
    } catch {
      // Ignore storage errors
    }
  }, [voiceEffect]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.soundEffects, String(soundEffectsEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [soundEffectsEnabled]);

  // Load available browser voices (often populated asynchronously)
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        if (Array.isArray(list)) {
          setVoices(list);
        }
      } catch {
        // Ignore browser voice enumeration errors
      }
    };

    loadVoices();
    const synth = window.speechSynthesis;
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', loadVoices);
      return () => synth.removeEventListener('voiceschanged', loadVoices);
    }
    return undefined;
  }, [isSupported]);

  const stopSpeaking = useCallback(
    (playChime = false) => {
      sessionRef.current += 1;
      activeTextRef.current = null;
      onCompleteRef.current = null;
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cancel errors
        }
      }
      setSpeakingMessageId(null);
      if (playChime) {
        playVoiceChime('speakStop', soundEffectsEnabled);
      }
    },
    [isSupported, soundEffectsEnabled]
  );

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      if (isSpeechSynthesisSupported()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const startPlayback = useCallback(
    (
      messageId: string,
      rawText: string,
      preset: VoiceEffectPreset,
      playChime: boolean,
      onComplete?: () => void
    ) => {
      const msgs = messagesRef.current;

      if (!isSupported) {
        setNotice({ messageId, text: msgs.unsupported, tone: 'error' });
        setSpeakingMessageId(null);
        onComplete?.();
        return;
      }

      const speakableText = stripMarkdownForSpeech(rawText);
      if (!speakableText) {
        setNotice({ messageId, text: msgs.nothingToRead, tone: 'info' });
        setSpeakingMessageId(null);
        onComplete?.();
        return;
      }

      const chunks = splitTextIntoSpeechChunks(speakableText, 200);
      if (chunks.length === 0) {
        setNotice({ messageId, text: msgs.nothingToRead, tone: 'info' });
        setSpeakingMessageId(null);
        onComplete?.();
        return;
      }

      // Cancel any ongoing speech first
      sessionRef.current += 1;
      const currentSession = sessionRef.current;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }

      const isAmharic = containsEthiopic(speakableText);
      const availableVoices =
        voices.length > 0
          ? voices
          : (() => {
              try {
                return window.speechSynthesis.getVoices();
              } catch {
                return [];
              }
            })();

      const amharicVoice = availableVoices.find((v) =>
        v.lang.toLowerCase().startsWith('am')
      );
      const englishVoice =
        availableVoices.find((v) => v.lang.toLowerCase() === 'en-us' && v.localService) ??
        availableVoices.find((v) => v.lang.toLowerCase().startsWith('en'));

      // Check Amharic voice availability and warn gracefully without blocking playback attempt
      if (isAmharic && !amharicVoice) {
        setNotice({
          messageId,
          text: msgs.amharicLimited,
          tone: 'info',
        });
      } else {
        setNotice((prev) => (prev?.messageId === messageId ? null : prev));
      }

      const effectConfig = VOICE_EFFECT_CONFIGS[preset];
      activeTextRef.current = { messageId, rawText };
      onCompleteRef.current = onComplete ?? null;
      setSpeakingMessageId(messageId);
      if (playChime) {
        playVoiceChime('speakStart', soundEffectsEnabled);
      }

      let chunkIndex = 0;

      const speakNextChunk = () => {
        if (sessionRef.current !== currentSession) return;
        if (chunkIndex >= chunks.length) {
          const doneCb = onCompleteRef.current;
          activeTextRef.current = null;
          onCompleteRef.current = null;
          setSpeakingMessageId(null);
          doneCb?.();
          return;
        }

        try {
          const utterance = new window.SpeechSynthesisUtterance(chunks[chunkIndex]);
          utterance.lang = isAmharic ? amharicVoice?.lang || 'am-ET' : englishVoice?.lang || 'en-US';
          if (isAmharic && amharicVoice) {
            utterance.voice = amharicVoice;
          } else if (!isAmharic && englishVoice) {
            utterance.voice = englishVoice;
          }
          utterance.pitch = effectConfig.pitch;
          utterance.rate = effectConfig.rate;

          utterance.onend = () => {
            if (sessionRef.current !== currentSession) return;
            chunkIndex += 1;
            speakNextChunk();
          };

          utterance.onerror = (event) => {
            if (sessionRef.current !== currentSession) return;
            const errCode = (event as SpeechSynthesisErrorEvent).error;
            // Ignore intentional interruptions/cancels
            if (errCode === 'interrupted' || errCode === 'canceled') {
              return;
            }
            activeTextRef.current = null;
            onCompleteRef.current = null;
            setSpeakingMessageId(null);
            setNotice({
              messageId,
              text: isAmharic && !amharicVoice ? msgs.amharicLimited : msgs.playbackFailed,
              tone: isAmharic && !amharicVoice ? 'info' : 'error',
            });
          };

          window.speechSynthesis.speak(utterance);
        } catch {
          if (sessionRef.current !== currentSession) return;
          activeTextRef.current = null;
          onCompleteRef.current = null;
          setSpeakingMessageId(null);
          setNotice({
            messageId,
            text: msgs.playbackFailed,
            tone: 'error',
          });
        }
      };

      speakNextChunk();
    },
    [isSupported, soundEffectsEnabled, voices]
  );

  const speakMessage = useCallback(
    (messageId: string, rawText: string, onComplete?: () => void) => {
      startPlayback(messageId, rawText, voiceEffect, true, onComplete);
    },
    [startPlayback, voiceEffect]
  );

  const toggleSpeakMessage = useCallback(
    (messageId: string, rawText: string) => {
      if (speakingMessageId === messageId) {
        stopSpeaking(true);
        return;
      }
      startPlayback(messageId, rawText, voiceEffect, true);
    },
    [speakingMessageId, startPlayback, stopSpeaking, voiceEffect]
  );

  const cycleVoiceEffect = useCallback(() => {
    const idx = VOICE_EFFECT_ORDER.indexOf(voiceEffect);
    const nextPreset = VOICE_EFFECT_ORDER[(idx + 1) % VOICE_EFFECT_ORDER.length];
    setVoiceEffect(nextPreset);
    playVoiceChime('effect', soundEffectsEnabled);

    // If currently speaking a message, seamlessly restart it with the new voice effect
    const active = activeTextRef.current;
    if (speakingMessageId && active && active.messageId === speakingMessageId) {
      startPlayback(active.messageId, active.rawText, nextPreset, false);
    }
  }, [soundEffectsEnabled, speakingMessageId, startPlayback, voiceEffect]);

  const toggleSoundEffects = useCallback(() => {
    setSoundEffectsEnabled((prev) => {
      const next = !prev;
      if (next) {
        playVoiceChime('effect', true);
      }
      return next;
    });
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    isSupported,
    speakingMessageId,
    voiceEffect,
    soundEffectsEnabled,
    notice,
    speakMessage,
    toggleSpeakMessage,
    stopSpeaking,
    cycleVoiceEffect,
    toggleSoundEffects,
    dismissNotice,
  };
}
