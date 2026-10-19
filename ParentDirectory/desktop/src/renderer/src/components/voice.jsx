import React, { useState } from 'react';

export default function VoiceMessage({ onVoiceCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser/environment.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      if (onVoiceCommand) {
        onVoiceCommand(spokenText);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={startListening}
        className={`p-2.5 rounded-xl transition flex items-center gap-2 text-xs font-medium ${isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'}`}
      >
        <span>🎙️</span>
        <span>{isListening ? 'Listening...' : 'Voice Command'}</span>
      </button>
      {transcript && <span className="text-xs text-gray-400 italic truncate max-w-xs">"{transcript}"</span>}
    </div>
  );
}