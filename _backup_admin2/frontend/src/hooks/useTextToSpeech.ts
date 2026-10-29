'use client';

import { useState, useCallback, useRef } from 'react';

interface TextToSpeechResult {
  speak: (text: string, onComplete?: () => void) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useTextToSpeech(): TextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string, onComplete?: () => void) => {
      if (!isSupported) return;

      // Cancel anything currently speaking
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Voice settings — adjust these for different feel
      utterance.rate = 0.92;    // Slightly slower than normal for clarity
      utterance.pitch = 1.0;    // Natural pitch
      utterance.volume = 1.0;   // Full volume

      // Try to use a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.name.includes('Google UK English Female')) ||
        voices.find((v) => v.name.includes('Google US English')) ||
        voices.find((v) => v.lang === 'en-US' && v.localService === false) ||
        voices.find((v) => v.lang === 'en-US') ||
        voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onComplete) onComplete();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}