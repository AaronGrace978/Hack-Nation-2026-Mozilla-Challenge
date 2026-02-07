import React, { useRef } from 'react';
import { useVoice } from '../hooks/useVoice';

interface VoiceInputProps {
  onResult: (text: string) => void;
}

export function VoiceInput({ onResult }: VoiceInputProps) {
  const { isListening, transcript, isSupported, startListening, stopListening } = useVoice();
  const lastSentRef = useRef<string>('');

  React.useEffect(() => {
    // Only fire once per unique final transcript, and only after listening stops.
    if (transcript && !isListening && transcript !== lastSentRef.current) {
      lastSentRef.current = transcript;
      onResult(transcript);
    }
    // Reset the guard when listening starts again
    if (isListening) {
      lastSentRef.current = '';
    }
  }, [transcript, isListening]); // intentionally omit onResult to prevent re-fire loop

  if (!isSupported) return null;

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-1.5 rounded-lg transition-all ${
        isListening
          ? 'bg-red-500/20 text-red-400 animate-pulse'
          : 'text-dark-4 hover:text-surface-0 hover:bg-dark-3'
      }`}
      title={isListening ? 'Stop listening' : 'Voice input'}
    >
      {isListening ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}
