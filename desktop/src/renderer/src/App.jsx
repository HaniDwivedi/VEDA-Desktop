import React, { useState } from 'react';
import Home from './pages/home.jsx';
import Chat from './pages/chat.jsx';
import Settings from './pages/setting.jsx';
import Login from './pages/login.jsx';
import Stream from './pages/stream.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div className="w-screen h-screen bg-gray-950 text-white font-sans">
      {currentPage === 'home' && <Home onNavigate={setCurrentPage} />}
      {currentPage === 'login' && <Login onNavigate={setCurrentPage} />}
      {currentPage === 'settings' && <Settings onNavigate={setCurrentPage} />}
      {currentPage === 'chat' && <Chat onNavigate={setCurrentPage} />}
      {currentPage === 'stream' && <Stream onNavigate={setCurrentPage} />}
    </div>
  );
}

export default App;
