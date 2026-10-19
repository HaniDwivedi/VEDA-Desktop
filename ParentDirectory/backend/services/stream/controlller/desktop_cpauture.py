// Preload or Renderer Process (Electron)
const { desktopCapturer } = require('electron');

async function startScreenStream() {
  // Fetch available screens (get the primary display)
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  const primaryScreen = sources[0]; 

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: primaryScreen.id,
          minFrameRate: 60,
          maxFrameRate: 60
        }
      }
    });
    
    // Pass this stream to your TCP/WebSocket sender
    handleStreamOutput(stream);
  } catch (e) {
    console.error('Permission denied or capture failed', e);
  }
}



