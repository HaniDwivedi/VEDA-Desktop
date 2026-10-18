import React, { useEffect, useRef, useState } from 'react'
import onsendmessage from './MessageInput'
export default function ScreenStream({ wsUrl }) {
  const [frameSrc, setFrameSrc] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const imgRef = useRef(null)
  const wsRef = useRef(null)
  const[message, setMessage] = useState('')



  // Renderer Process
function handleStreamOutput(stream) {
  const socket = new WebSocket('ws://your-server.com/stream');
  
  const mediaRecorder = new MediaRecorder(stream, { 
    mimeType: 'video/webm; codecs=vp8',
    videoBitsPerSecond: 5000000 // 5 Mbps for high quality
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
      // Send binary chunk directly
      socket.send(event.data); 
    }
  };

  // Capture chunks every 16ms (roughly 60fps) to keep latency low
  mediaRecorder.start(16); 
}

  useEffect(() => {
    if (!wsUrl) {
      setIsConnected(false)
      return undefined
    }
    const url = new URL(wsUrl)
    if (!['ws:', 'wss:'].includes(url.protocol) || !url.searchParams.has('ticket')) {
      setIsConnected(false)
      return undefined
    }
    wsRef.current = new WebSocket(url)

    wsRef.current.onopen = () => setIsConnected(true)
    wsRef.current.onclose = () => setIsConnected(false)

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'screen_frame') {
          // Set Base64 JPEG frame source
          setFrameSrc(`data:image/jpeg;base64,${message.data}`)
        }
      } catch (err) {
        console.error('Frame parsing error:', err)
      }
    }

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [wsUrl])

  // Handle touch/click on screen stream to send percentage coordinates
  const handleScreenClick = (e) => {
    if (!imgRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const rect = imgRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const x_pct = clickX / rect.width
    const y_pct = clickY / rect.height

    // Send touch event data to desktop backend
    wsRef.current.send(
      JSON.stringify({
        type: 'tap',
        x_pct: parseFloat(x_pct.toFixed(4)),
        y_pct: parseFloat(y_pct.toFixed(4))
      })
    )
  }

  return (
    <div className="flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden border border-gray-800 p-2 relative w-full h-full">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/70 px-3 py-1 rounded-full backdrop-blur border border-gray-800">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
        ></span>
        <span className="text-[10px] font-mono tracking-wider">
          {isConnected ? 'SECURE STREAM LIVE' : 'CONNECTING...'}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center w-full h-full overflow-hidden">
        {frameSrc ? (
          <img
            ref={imgRef}
            src={frameSrc}
            alt="Desktop Live Stream"
            onClick={handleScreenClick}
            className="max-h-full max-w-full object-contain cursor-crosshair rounded shadow-2xl"
          />
        ) : (
          <div className="text-gray-500 text-xs font-mono animate-pulse">
            Waiting for an authenticated desktop stream...
          </div>
          
        )}
      </div>
    </div>
  )
}
