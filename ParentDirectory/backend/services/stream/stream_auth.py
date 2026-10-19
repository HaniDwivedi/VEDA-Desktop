// Node.js Backend (ws library example)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Registry to hold active connections: Map<UserId, { desktop: Socket, mobile: Socket }>
const activeSessions = new Map(); 

wss.on('connection', (ws, req) => {
  let userId = null;
  let deviceType = null;

  ws.on('message', (message) => {
    // 1. Handle Authentication (First message should be auth JSON)
    if (!userId) {
      const authData = JSON.parse(message);
      if (isValidToken(authData.token)) {
         userId = authData.userId;
         deviceType = authData.deviceType; // 'desktop' or 'mobile'
         
         if (!activeSessions.has(userId)) activeSessions.set(userId, {});
         activeSessions.get(userId)[deviceType] = ws;
      } else {
         ws.close(); // Reject unauthorized
      }
      return;
    }

    // 2. Route the binary video stream securely
    if (Buffer.isBuffer(message) && deviceType === 'desktop') {
      const session = activeSessions.get(userId);
      const targetMobileSocket = session['mobile'];
      
      // ONLY send if the authorized mobile device is connected
      if (targetMobileSocket && targetMobileSocket.readyState === WebSocket.OPEN) {
        targetMobileSocket.send(message); 
      }
    }
  });

  ws.on('close', () => {
    if (userId && activeSessions.has(userId)) {
      delete activeSessions.get(userId)[deviceType];
    }
  });
});