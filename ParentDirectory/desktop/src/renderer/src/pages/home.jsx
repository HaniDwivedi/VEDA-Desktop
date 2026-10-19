import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import PropTypes from 'prop-types';

export default function Home({ onNavigate }) {
  const [qrToken, setQrToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 1. Check Login Status on App Startup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loggedInStatus = await window.electron.ipcRenderer.invoke('check-login-status');
        setIsLoggedIn(loggedInStatus);
        if (loggedInStatus) {
          onNavigate('chat'); // Agar pehle se logged in hai toh seedha chat par bhejo
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, [onNavigate]);

  // 2. QR Code Generator & Refresh Logic
  useEffect(() => {
    if (isLoggedIn) return;

    const generateQrCode = async () => {
      try {
        const token = await window.electron.ipcRenderer.invoke('generate-qr-token');
        setQrToken(token || '');
        
      } catch (error) {
        console.error("Failed to fetch QR token", error);
      }
    };

    generateQrCode();

    const interval = setInterval(() => {
      generateQrCode();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // 3. NEW: QR Verification Listener (Polling ya IPC Event ke zariye)
  useEffect(() => {
    if (!qrToken || isLoggedIn) return;

    // Har 3-5 seconds mein check karo ki kya is qrToken ko mobile ne verify kar diya hai
    const verifyInterval = setInterval(async () => {
      try {
        // Main process ya backend se pucho ki kya yeh token verify ho gaya
        const isVerified = await window.electron.ipcRenderer.invoke('verify-qr-status', qrToken);
        
        if (isVerified) {
          setIsLoggedIn(true);
          clearInterval(verifyInterval);
          onNavigate('chat'); // Success hone par chat par redirect karein
        }
      } catch (error) {
        console.error("Error checking QR verification status:", error);
      }
    }, 3000); // Har 3 seconds mein check karega

    return () => clearInterval(verifyInterval);
  }, [qrToken, isLoggedIn, onNavigate]);

  // --- UI RENDERING ---
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-6">
        <h1 className="text-3xl font-bold tracking-wider text-indigo-400">V.E.D.A. Desktop</h1>
         
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
          <div className="mb-6">
            <p className="text-xs text-gray-400">Scan the QR code below using your mobile app or log in directly.</p>
          </div>

          {/* QR Code Box */}
          <div className="w-52 h-52 bg-white rounded-xl mx-auto mb-6 flex flex-col items-center justify-center p-4 shadow-inner">
            {qrToken ? (
              <QRCode 
                value={qrToken} 
                size={180} 
                bgColor="#ffffff"
                fgColor="#000000"
                level="H" 
              />
            ) : (
              <div className="text-gray-500 text-xs animate-pulse">Wait! Generating QR Code...</div>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => onNavigate('login')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition"
            >
              Login with Email / Phone
            </button>
            <button 
              onClick={() => onNavigate('login')}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl transition text-xs"
            >
              <span className="text-gray-300 hover:text-white">
                Create New Account
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

Home.propTypes = {
  onNavigate: PropTypes.func.isRequired
}