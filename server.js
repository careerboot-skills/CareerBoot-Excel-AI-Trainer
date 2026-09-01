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
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// --- 1. MONGODB CONNECTION ---
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
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});
const Chat = mongoose.model('Chat', chatSchema);

// --- 2. AUTH & AI CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "720197932809-gg6bia1caq1pcqjsb2cil4vc6hm2r2aj.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });

// --- 3. API ENDPOINTS ---
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

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { userEmail, text } = req.body;
    if (!userEmail) return res.status(401).json({ success: false, error: "Unauthorized access" });

    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userEmail, message: text || '[File/Image Attached]', sender: 'user' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let promptContents = [
      "You are CareerBoot AI Excel Trainer. Provide exact MS Excel formulas, VBA macros, or step-by-step error solutions (#REF!, #N/A, VLOOKUP, XLOOKUP)."
    ];

    if (text) promptContents.pushIs feature-rich dashboard layout aur modules ko add karne ke liye aapko HTML/CSS aur JavaScript interface me updates karne honge. 

[Luckysheet](https://github.com/dream-num/Luckysheet) ya [FortuneSheet](https://github.com/dream-num/FortuneSheet) jaise browser-based web spreadsheet libraries ka use karke aap bilkul original MS Excel jaisa live spreadsheet platform build kar sakte hain.

Niche poori updated Node.js single-file code di gayi hai. Isme login ke baad Dashboard, Excel Shortcut Keys, All Formulas & Functions guide, Dashboard Making Tutorials, aur Live Interactive Excel Sandbox ka option add kar diya gaya hai.

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');

const app = express();

// --- CROSS-ORIGIN HEADERS FOR GOOGLE AUTH FIX ---
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

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
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});
const Chat = mongoose.model('Chat', chatSchema);

// --- 2. AUTH & AI CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "720197932809-gg6bia1caq1pcqjsb2cil4vc6hm2r2aj.apps.googleusercontent.com";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });

// --- 3. API ENDPOINTS ---

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

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { userEmail, text } = req.body;
    if (!userEmail) return res.status(401).json({ success: false, error: "Unauthorized access" });

    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userEmail, message: text || '[File/Image Attached]', sender: 'user' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
  <title>CareerBoot AI - Excel Hub & Trainer</title>
  <script src="[https://accounts.google.com/gsi/client](https://accounts.google.com/gsi/client)" async defer></script>
  <link href="[https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap)" rel="stylesheet">
  <link rel="stylesheet" href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)">
  
  <!-- Luckysheet CDN (Live Excel Engine) -->
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/pluginsCss.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/pluginsCss.css)' />
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/plugins.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/plugins.css)' />
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css)' />
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/assets/iconfont/iconfont.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/assets/iconfont/iconfont.css)' />
  <script src="[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/plugin.js](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/plugin.js)"></script>
  <script src="[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js)"></script>

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
    
    #app-container { display: none; flex: 1; height: 100vh; flex-direction: row; }
    
    /* Sidebar Navigation */
    sidebar { width: 250px; background: #0f172a; border-right: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; }
    .sidebar-header { padding: 20px; font-weight: 800; color: #38bdf8; font-size: 18px; border-bottom: 1px solid rgba(56, 189, 248, 0.1); }
    .nav-links { list-style: none; padding: 15px 10px; display: flex; flex-direction: column; gap: 8px; }
    .nav-item { padding: 12px 16px; border-radius: 8px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 12px; font-size: 14px; transition: 0.2s; }
    .nav-item:hover, .nav-item.active { background: #0284c7; color: #fff; }

    /* Content Area */
    main { flex: 1; display: flex; flex-direction: column; background: #070d19; overflow-y: auto; }
    header { background: #0f172a; padding: 16px 24px; border-bottom: 1px solid rgba(56, 189, 248, 0.2); display: flex; justify-content: space-between; align-items: center; }

    .tab-content { display: none; padding: 24px; height: 100%; }
    .tab-content.active { display: flex; flex-direction: column; }

    /* Cards Grid */
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 15px; }
    .card { background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 20px; }
    .card h3 { color: #38bdf8; margin-bottom: 10px; font-size: 16px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #0f172a; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; }
    th { background: #1e293b; color: #38bdf8; }

    /* Live AI Chat Interface */
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

  <!-- LOGIN OVERLAY -->
  <div id="login-overlay">
    <div class="login-card">
      <h2 style="margin-bottom: 15px; color: #38bdf8;">CAREERBOOT EXCEL HUB</h2>
      <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">Verification required to access Live Excel Platform.</p>
      
      <div id="g_id_onload"
           data-client_id="${GOOGLE_CLIENT_ID}"
           data-callback="handleCredentialResponse"
           data-auto_select="false"
           data-itp_support="true">
      </div>
      <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="filled_blue" data-size="large"></div>
    </div>
  </div>

  <!-- MAIN APP CONTAINER -->
  <div id="app-container">
    <sidebar>
      <div class="sidebar-header"><i class="fa-solid fa-file-excel"></i> CareerBoot Hub</div>
      <ul class="nav-links">
        <li class="nav-item active" onclick="switchTab('ai-trainer')"><i class="fa-solid fa-robot"></i> AI Excel Trainer</li>
        <li class="nav-item" onclick="switchTab('shortcuts')"><i class="fa-solid fa-keyboard"></i> Shortcut Keys</li>
        <li class="nav-item" onclick="switchTab('formulas')"><i class="fa-solid fa-calculator"></i> All Formulas & Functions</li>
        <li class="nav-item" onclick="switchTab('dashboard-tutorials')"><i class="fa-solid fa-chart-pie"></i> Dashboard Tutorials</li>
        <li class="nav-item" onclick="switchTab('live-excel')"><i class="fa-solid fa-table"></i> Live Practice Screen</li>
      </ul>
    </sidebar>

    <main>
      <header>
        <strong id="active-tab-title" style="color: #38bdf8;">AI Excel Trainer</strong>
        <span style="font-size: 11px; color: #10b981;"><i class="fa-solid fa-database"></i> 24h Auto-Purge Session</span>
      </header>

      <!-- TAB 1: AI TRAINER CHAT -->
      <div id="ai-trainer" class="tab-content active">
        <div class="chat-area" id="chat">
          <div class="msg bot">Welcome! Ask any formula, VBA macro, or error query. You can also upload files.</div>
        </div>
        <div class="controls">
          <div class="row">
            <label class="file-btn">
              <i class="fa-solid fa-paperclip"></i> Upload File / Image
              <input type="file" id="fileInput" accept="image/*,.xlsx,.csv" hidden onchange="showFileName(this)">
            </label>
            <button class="file-btn" onclick="toggleVoice()"><i class="fa-solid fa-microphone"></i> Voice Input</button>
            <span id="fileNameDisplay" style="font-size: 12px; color: #38bdf8; align-self: center;"></span>
          </div>
          <div class="row">
            <input type="text" id="userInput" placeholder="Ask Excel formula or query..." onkeypress="handleKeyPress(event)">
            <button onclick="sendQuery()">Send</button>
          </div>
        </div>
      </div>

      <!-- TAB 2: SHORTCUT KEYS -->
      <div id="shortcuts" class="tab-content">
        <h2 style="color: #38bdf8;">Essential Excel Shortcut Keys</h2>
        <table>
          <thead>
            <tr><th>Shortcut Key</th><th>Function / Action</th></tr>
          </thead>
          <tbody>
            <tr><td><b>Ctrl + C / Ctrl + V</b></td><td>Copy / Paste Data</td></tr>
            <tr><td><b>Ctrl + Alt + V</b></td><td>Open Paste Special Dialog</td></tr>
            <tr><td><b>Alt + =</b></td><td>AutoSUM selected cells</td></tr>
            <tr><td><b>F4</b></td><td>Lock Cell References (Absolute/Relative Toggle: $A$1)</td></tr>
            <tr><td><b>Ctrl + Shift + L</b></td><td>Apply or Remove Filters</td></tr>
            <tr><td><b>Ctrl + T</b></td><td>Convert selected data into formatted Excel Table</td></tr>
            <tr><td><b>F12</b></td><td>Save As option directly</td></tr>
          </tbody>
        </table>
      </div>

      <!-- TAB 3: ALL FORMULAS & FUNCTIONS -->
      <div id="formulas" class="tab-content">
        <h2 style="color: #38bdf8;">Complete Formula & Function Reference</h2>
        <div class="grid">
          <div class="card">
            <h3>Lookup & Reference</h3>
            <p><b>XLOOKUP:</b> =XLOOKUP(lookup_val, lookup_array, return_array)</p>
            <p style="margin-top: 5px; color: #94a3b8;">Modern replacement for VLOOKUP & INDEX/MATCH.</p>
          </div>
          <div class="card">
            <h3>Logical Functions</h3>
            <p><b>IFS:</b> =IFS(condition1, val1, condition2, val2)</p>
            <p style="margin-top: 5px; color: #94a3b8;">Evaluates multiple logical conditions easily.</p>
          </div>
          <div class="card">
            <h3>Aggregation</h3>
            <p><b>SUMIFS:</b> =SUMIFS(sum_range, criteria_range1, criteria1)</p>
            <p style="margin-top: 5px; color: #94a3b8;">Sums cells based on multiple custom criteria.</p>
          </div>
        </div>
      </div>

      <!-- TAB 4: DASHBOARD TUTORIALS -->
      <div id="dashboard-tutorials" class="tab-content">
        <h2 style="color: #38bdf8;">Dashboard Making Guide</h2>
        <div class="grid">
          <div class="card">
            <h3>1. Data Preparation</h3>
            <p>Clean your raw data using Power Query or Excel Tables (Ctrl + T) to ensure scalable dynamic ranges.</p>
          </div>
          <div class="card">
            <h3>2. Pivot Tables & Slicers</h3>
            <p>Create Pivot tables to aggregate summary metrics, then insert Slicers to create dynamic visual filters.</p>
          </div>
          <div class="card">
            <h3>3. Interactive Visuals</h3>
            <p>Link Pivot Charts with Slicers. Add KPI Cards using formulas for dynamic updates.</p>
          </div>
        </div>
      </div>

      <!-- TAB 5: LIVE EXCEL PRACTICE SCREEN -->
      <div id="live-excel" class="tab-content" style="padding: 0; position: relative;">
        <div id="luckysheet" style="margin:0px;padding:0px;position:absolute;width:100%;height:100%;left:0px;top:0px;"></div>
      </div>

    </main>
  </div>

  <script>
    let authenticatedUser = null;
    let luckysheetInitialized = false;

    function handleCredentialResponse(response) {
      if(!response || !response.credential) {
        alert("Google Verification Failed.");
        return;
      }
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
          alert("Authentication Error: " + (data.error || "Verification failed"));
        }
      })
      .catch(err => alert("Network Connection Error"));
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      
      document.getElementById(tabId).classList.add('active');
      event.currentTarget.classList.add('active');

      const titles = {
        'ai-trainer': 'AI Excel Trainer',
        'shortcuts': 'Excel Shortcut Keys & Guide',
        'formulas': 'Excel Formulas & Functions',
        'dashboard-tutorials': 'Dashboard Making Tutorials',
        'live-excel': 'Live Excel Practice Screen (All Formulas Supported)'
      };
      document.getElementById('active-tab-title').innerText = titles[tabId];

      if (tabId === 'live-excel' && !luckysheetInitialized) {
        setTimeout(() => {
          luckysheet.create({
            container: 'luckysheet',
            title: 'Live Practice Workbook',
            lang: 'en'
          });
          luckysheetInitialized = true;
        }, 100);
      }
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
      if (e.key === 'Enter') sendQuery();
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
