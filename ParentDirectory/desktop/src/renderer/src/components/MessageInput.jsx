import PropTypes from 'prop-types';
import { useState } from 'react';
export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Handle Text Submission
  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim() === '') return;
    
    onSendMessage(message);
    setMessage(''); // Message bhejne ke baad input clear karna
  };

  // Handle Voice Command Submission
  const startVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // English/Hinglish support
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript.toLowerCase();
      let finalCommand = spokenText;
      
      // Auto-prefix Logic: Agar user ne manually @ nahi bola, toh system khud laga dega
      if (spokenText.includes("stream") || spokenText.includes("screen dikhao")) {
        finalCommand = '@stream';
      } else if (!spokenText.startsWith("@")) {
         finalCommand = `@agent ${spokenText}`;
      }
      
      onSendMessage(finalCommand);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <form 
      onSubmit={handleSend} 
      className="flex items-center gap-3 p-4 bg-gray-950 border-t border-gray-800 w-full"
    >
      {/* Voice Mic Button */}
      <button
        type="button"
        onClick={startVoiceCommand}
        className={`p-3 rounded-full transition-all duration-300 shadow-md ${
          isListening 
            ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50' 
            : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-transparent'
        }`}
        title={isListening ? "Listening..." : "Use Voice Command"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      
      {/* Text Input Field */}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isListening ? "Listening to your command..." : "Type a command (e.g., @agent open resume)..."}
        disabled={isListening}
        className="flex-1 bg-gray-900 text-white placeholder-gray-500 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm shadow-inner disabled:opacity-50"
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={!message.trim() || isListening}
        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-600/20"
      >
        <svg className="w-5 h-5 translate-x-px -translate-y-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  );
}

MessageInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired
};