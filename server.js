require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MONGODB CONNECTION WITH 24-HOUR TTL AUTO-PURGE ---
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Atlas Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Error:", err));
} else {
  console.warn("WARNING: MONGO_URI environment variable missing.");
}

const chatSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // 86400s = 24 Hours Auto Delete
});
const Chat = mongoose.model('Chat', chatSchema);

// --- 2. AUTH & AI CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });

// --- 3. API ENDPOINTS ---

// Google Token Verification
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    res.json({ 
      success: true, 
      user: { name: payload.name, email: payload.email, picture: payload.picture } 
    });
  } catch (error) {
    res.status(401).json({ success: false, error: "Google verification failed." });
  }
});

// Gemini Vision AI & File Solver
app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { userEmail, text } = req.body;
    if (!userEmail) return res.status(401).json({ success: false, error: "Unauthorized access" });

    // Store User Query
    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userEmail, message: text || '[File/Image Attached]', sender: 'user' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let promptContents = [
      "You are CareerBoot AI Excel Trainer. Provide exact MS Excel formulas, VBA macros, or step-by-step error solutions (#REF!, #N/A, VLOOKUP, XLOOKUP)."
    ];

    if (text) promptContents.push(text);

    if (req.file) {
      promptContents.push({
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      });
    }

    const aiResult = await model.generateContent(promptContents);
    const botAnswer = aiResult.response.text();

    // Store Bot Response
    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userEmail, message: botAnswer, sender: 'bot' });
    }

    res.json({ success: true, answer: botAnswer });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ success: false, error: "AI Engine processing error." });
  }
});

// --- 4. FRONTEND UI EMBEDDED ---
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareerBoot AI - Excel Trainer</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #070d19; color: #fff; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

    #login-overlay {
      position: fixed; inset: 0; background: #070d19; z-index: 99999;
      display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px;
    }
    .login-card {
      background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.8);
    }
    
    #app-container { display: none; flex-direction: column; height: 100vh; }
    header { background: #0f172a; padding: 16px 24px; border-bottom: 1px solid rgba(56, 189, 248, 0.2); display: flex; justify-content: space-between; align-items: center; }
    
    .chat-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .msg { max-width: 80%; padding: 14px 18px; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    .msg.bot { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.2); align-self: flex-start; }
    .msg.user { background: #0284c7; align-self: flex-end; }
    
    .controls { padding: 16px; background: #0f172a; border-top: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; gap: 10px; }
    input[type="text"] { flex: 1; background: #070d19; border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 12px; border-radius: 8px; outline: none; }
    button { background: #0284c7; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .file-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #fff; }
  </style>
</head>
<body>

  <!-- MANDATORY LOGIN OVERLAY -->
  <div id="login-overlay">
    <div class="login-card">
      <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 15px;">
        <rect width="200" height="200" fill="#0A192F" rx="20"/>
        <g transform="translate(100,85)">
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(0)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(22.5)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(45)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(67.5)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(90)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(112.5)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(135)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(157.5)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(180)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(202.5)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(225)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(247.5)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(270)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(292.5)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(315)"/>
          <path d="M 0 -35 C 5 -35, 10 -30, 10 -25 C 10 -20, 5 -15, 0 -15 C -15 -15, -25 -25, -25 -35 C -25 -40, -15 -40, 0 -35 Z" fill="#FFFFFF" transform="rotate(337.5)"/>
        </g>
        <text x="100" y="145" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="20" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">CAREER BOOT</text>
        <path d="M 25 155 L 175 155" stroke="#FFFFFF" stroke-width="2"/>
        <text x="100" y="172" font-family="'Plus Jakarta Sans', sans-serif" font-weight="500" font-size="10" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">& Skills Development</text>
      </svg>

      <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">Verification required. History auto-deleted in 24h from MongoDB.</p>
      
      <div id="g_id_onload"
           data-client_id="${GOOGLE_CLIENT_ID}"
           data-callback="handleCredentialResponse">
      </div>
      <div class="g_id_signin" data-type="standard" data-theme="filled_blue" data-size="large"></div>
    </div>
  </div>

  <!-- APPLICATION INTERFACE -->
  <div id="app-container">
    <header>
      <strong style="color: #38bdf8;">CareerBoot AI Excel Trainer</strong>
      <span style="font-size: 11px; color: #10b981;"><i class="fa-solid fa-database"></i> 24h Auto-Purge</span>
    </header>

    <div class="chat-area" id="chat">
      <div class="msg bot">Welcome! Type queries, upload Excel/image files, or use voice input.</div>
    </div>

    <div class="controls">
      <div class="row">
        <label class="file-btn">
          <i class="fa-solid fa-paperclip"></i> File / Image
          <input type="file" id="fileInput" accept="image/*,.xlsx,.csv" hidden onchange="showFileName(this)">
        </label>
        <button class="file-btn" onclick="toggleVoice()"><i class="fa-solid fa-microphone"></i> Voice Input</button>
        <span id="fileNameDisplay" style="font-size: 12px; color: #38bdf8; align-self: center;"></span>
      </div>
      <div class="row">
        <input type="text" id="userInput" placeholder="Ask Excel formula or error query..." onkeypress="handleKeyPress(event)">
        <button onclick="sendQuery()">Send</button>
      </div>
    </div>
  </div>

  <script>
    let authenticatedUser = null;

    function handleCredentialResponse(response) {
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          authenticatedUser = data.user;
          document.getElementById('login-overlay').style.display = 'none';
          document.getElementById('app-container').style.display = 'flex';
        } else {
          alert("Authentication Failed.");
        }
      });
    }

    function showFileName(input) {
      if (input.files[0]) {
        document.getElementById('fileNameDisplay').innerText = input.files[0].name;
      }
    }

    function toggleVoice() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice recognition not supported in browser.");
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.start();
      recognition.onresult = function(event) {
        document.getElementById('userInput').value = event.results[0][0].transcript;
      };
    }

    function handleKeyPress(e) {
      if (e.key === 'Enter') {
        sendQuery();
      }
    }

    async function sendQuery() {
      const input = document.getElementById('userInput');
      const fileInput = document.getElementById('fileInput');
      const text = input.value.trim();

      if (!text && !fileInput.files[0]) return;

      appendMsg(text + (fileInput.files[0] ? \` [File: \${fileInput.files[0].name}]\` : ''), 'user');

      const formData = new FormData();
      formData.append('userEmail', authenticatedUser.email);
      formData.append('text', text);
      if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

      input.value = '';
      document.getElementById('fileNameDisplay').innerText = '';

      appendMsg("Analyzing query...", 'bot');

      try {
        const res = await fetch('/api/chat', { method: 'POST', body: formData });
        const data = await res.json();
        
        const chat = document.getElementById('chat');
        chat.removeChild(chat.lastChild);

        if (data.success) {
          appendMsg(data.answer, 'bot');
        } else {
          appendMsg("Error: " + data.error, 'bot');
        }
      } catch (err) {
        appendMsg("Connection error to server.", 'bot');
      }

      fileInput.value = '';
    }

    function appendMsg(msg, sender) {
      const chat = document.getElementById('chat');
      const div = document.createElement('div');
      div.className = \`msg \${sender}\`;
      div.innerText = msg;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }
  </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`CareerBoot Server running on port ${PORT}`));
