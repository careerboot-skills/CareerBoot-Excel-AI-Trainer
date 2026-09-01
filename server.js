require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');

const app = express();

app.use(cors());
app.use(express.json());

// --- 1. MONGODB CONNECTION & SCHEMAS ---
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "T-FOR-TOPA/420";

const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, default: "User Key" },
  isActive: { type: Boolean, default: true },
  boundSessionId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});
const SecretKey = mongoose.model('SecretKey', keySchema);

const chatSchema = new mongoose.Schema({
  userKey: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});
const Chat = mongoose.model('Chat', chatSchema);

const sheetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: "General Practice" },
  fileName: { type: String, required: true },
  fileData: { type: String, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});
const PracticeSheet = mongoose.model('PracticeSheet', sheetSchema);

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log("MongoDB Atlas Connected Successfully");
      await SecretKey.updateOne(
        { key: ADMIN_PASSCODE.trim().toUpperCase() },
        { $setOnInsert: { key: ADMIN_PASSCODE.trim().toUpperCase(), label: "Master Admin Access", isActive: true } },
        { upsert: true }
      );
    })
    .catch(err => console.error("MongoDB Connection Error:", err));
}

// --- 2. CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });

function generateRandomKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'CB-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- 3. AUTHENTICATION ---
app.post('/api/auth/key-login', async (req, res) => {
  const { secretKey, sessionId } = req.body;
  if (!secretKey || !sessionId) {
    return res.status(400).json({ success: false, error: "Secret Key and Session ID are required." });
  }

  try {
    const formattedKey = secretKey.trim().toUpperCase();
    if (formattedKey === ADMIN_PASSCODE.trim().toUpperCase()) {
      return res.json({ success: true, userKey: formattedKey, label: "Master Admin Access", isAdmin: true });
    }

    const foundKey = await SecretKey.findOne({ key: formattedKey, isActive: true });
    if (!foundKey) {
      return res.status(401).json({ success: false, error: "Invalid or Deactivated Secret Key." });
    }

    if (foundKey.boundSessionId && foundKey.boundSessionId !== sessionId) {
      return res.status(403).json({ success: false, error: "Key already in use on another device/browser session." });
    }

    if (!foundKey.boundSessionId) {
      foundKey.boundSessionId = sessionId;
      await foundKey.save();
    }

    return res.json({ success: true, userKey: foundKey.key, label: foundKey.label });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Database error during authentication." });
  }
});

// --- 4. ADMIN ENDPOINTS ---
app.post('/api/admin/keys', async (req, res) => {
  const { adminCode } = req.body;
  if (adminCode !== ADMIN_PASSCODE) return res.status(403).json({ success: false, error: "Unauthorized Admin Access." });
  try {
    const keys = await SecretKey.find().sort({ createdAt: -1 });
    return res.json({ success: true, keys });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/generate-key', async (req, res) => {
  const { adminCode, label } = req.body;
  if (adminCode !== ADMIN_PASSCODE) return res.status(403).json({ success: false, error: "Unauthorized Admin Access." });
  try {
    const newKeyStr = generateRandomKey();
    const newKey = await SecretKey.create({ key: newKeyStr, label: label || "Standard Candidate" });
    return res.json({ success: true, key: newKey });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/toggle-key', async (req, res) => {
  const { adminCode, keyId } = req.body;
  if (adminCode !== ADMIN_PASSCODE) return res.status(403).json({ success: false, error: "Unauthorized Admin Access." });
  try {
    const existingKey = await SecretKey.findById(keyId);
    if (!existingKey) return res.status(404).json({ success: false, error: "Key not found." });
    existingKey.isActive = !existingKey.isActive;
    await existingKey.save();
    return res.json({ success: true, isActive: existingKey.isActive });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/reset-session', async (req, res) => {
  const { adminCode, keyId } = req.body;
  if (adminCode !== ADMIN_PASSCODE) return res.status(403).json({ success: false, error: "Unauthorized Admin Access." });
  try {
    const existingKey = await SecretKey.findById(keyId);
    if (!existingKey) return res.status(404).json({ success: false, error: "Key not found." });
    existingKey.boundSessionId = null;
    await existingKey.save();
    return res.json({ success: true, message: "Session unbound successfully." });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/upload-sheet', upload.single('sheetFile'), async (req, res) => {
  const { adminCode, title, category } = req.body;
  if (adminCode !== ADMIN_PASSCODE) return res.status(403).json({ success: false, error: "Unauthorized Admin Access." });
  if (!req.file) return res.status(400).json({ success: false, error: "No sheet file uploaded." });

  try {
    const sheet = await PracticeSheet.create({
      title: title || req.file.originalname,
      category: category || "General Practice",
      fileName: req.file.originalname,
      fileData: req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype
    });
    return res.json({ success: true, sheet });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

// --- 5. PRACTICE SHEETS & AI CHAT API ---
app.get('/api/practice-sheets', async (req, res) => {
  try {
    const sheets = await PracticeSheet.find({}, { fileData: 0 }).sort({ uploadedAt: -1 });
    return res.json({ success: true, sheets });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/practice-sheets/download/:id', async (req, res) => {
  try {
    const sheet = await PracticeSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ success: false, error: "Sheet file not found." });

    const fileBuffer = Buffer.from(sheet.fileData, 'base64');
    res.setHeader('Content-Type', sheet.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.fileName}"`);
    return res.send(fileBuffer);
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { userKey, text } = req.body;
    if (!userKey) return res.status(401).json({ success: false, error: "Unauthorized Access" });

    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userKey, message: text || '[File Attached]', sender: 'user' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let systemInstruction = "You are CareerBoot AI Excel Trainer. Provide clear structured responses in code blocks where applicable.";

    let promptContents = [systemInstruction];
    if (text) promptContents.push(text);
    if (req.file) {
      promptContents.push({
        inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype }
      });
    }

    const aiResult = await model.generateContent(promptContents);
    const botAnswer = aiResult.response.text();

    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userKey, message: botAnswer, sender: 'bot' });
    }

    res.json({ success: true, answer: botAnswer });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ success: false, error: "AI Engine processing error." });
  }
});

// --- 6. USER UI FRONTEND ---
app.get('/', (req, res) => {
  const userHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>CareerBoot AI - Excel Hub</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/css/pluginsCss.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/plugins.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/css/luckysheet.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/assets/iconfont/iconfont.css" />
  <script src="https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/js/plugin.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/luckysheet/dist/luckysheet.umd.js"></script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body, html { height: 100%; width: 100vw; background: #070d19; color: #fff; overflow: hidden; }

    #toast-notification {
      position: fixed; top: 15px; right: 15px; z-index: 9999;
      background: rgba(15, 23, 42, 0.95); border: 1px solid #ef4444; color: #fff;
      padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25); display: none; align-items: center; gap: 10px;
      backdrop-filter: blur(10px);
    }
    #toast-notification.success { border-color: #10b981; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.25); }

    #entry-screen {
      min-height: 100vh; width: 100vw; display: flex; flex-direction: column;
      background: linear-gradient(135deg, #070d19 0%, #0f172a 100%);
    }

    .entry-top {
      padding: 30px 20px 15px 20px; display: flex; flex-direction: column; align-items: center;
      text-align: center; border-bottom: 1px solid rgba(56, 189, 248, 0.15); width: 100%;
    }
    .branding-box { display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 500px; width: 100%; }
    .brand-svg { width: 220px; height: auto; }
    .welcome-note { color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center; margin-bottom: 15px; }

    .walk-animation-container {
      width: 100%; max-width: 360px; display: flex; align-items: center; justify-content: space-between;
      position: relative; margin-top: 5px; padding: 0 10px;
    }
    .stage-node { text-align: center; font-size: 10px; font-weight: 800; color: #38bdf8; letter-spacing: 1px; }
    .path-line { flex: 1; height: 3px; background: linear-gradient(90deg, #38bdf8, #10b981); margin: 0 12px; position: relative; border-radius: 2px; }

    .walker-icon {
      position: absolute; top: -16px; left: 0%; transform: translateX(-50%);
      font-size: 18px; color: #38bdf8; animation: walkAlong 6s infinite ease-in-out;
    }
    @keyframes walkAlong {
      0% { left: 0%; color: #38bdf8; }
      50% { left: 50%; color: #f59e0b; }
      100% { left: 100%; color: #10b981; }
    }

    .entry-middle {
      padding: 25px 15px; display: flex; justify-content: center; align-items: center;
      background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(56, 189, 248, 0.15);
    }
    .key-portal-form { display: flex; gap: 10px; width: 100%; max-width: 450px; }
    .key-portal-input {
      flex: 1; background: #070d19; border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8; font-size: 13px; font-weight: 700; padding: 12px 14px; border-radius: 8px;
      outline: none; text-transform: uppercase; letter-spacing: 1.5px; text-align: center;
    }
    .key-portal-btn {
      background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none;
      padding: 12px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; white-space: nowrap; font-size: 13px;
    }

    .entry-bottom { padding: 25px 15px; display: flex; flex-direction: column; align-items: center; }
    .bottom-title { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; font-weight: 700; }
    
    .ecosystem-grid { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 450px; }
    .eco-card {
      background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px;
    }
    .eco-icon { width: 28px; height: 28px; fill: #38bdf8; flex-shrink: 0; }
    .eco-text h4 { font-size: 13px; color: #fff; margin-bottom: 2px; font-weight: 700; }
    .eco-text p { font-size: 11px; color: #64748b; }

    #app-container { display: none; height: 100vh; width: 100vw; overflow: hidden; }

    sidebar {
      width: 250px; min-width: 250px; background: #0f172a; border-right: 1px solid rgba(56, 189, 248, 0.2);
      display: flex; flex-direction: column; transition: transform 0.3s ease; z-index: 100;
    }
    .sidebar-header { padding: 16px 20px; font-weight: 800; color: #38bdf8; font-size: 15px; border-bottom: 1px solid rgba(56, 189, 248, 0.1); }
    .nav-links { list-style: none; padding: 12px 10px; display: flex; flex-direction: column; gap: 6px; }
    .nav-item { padding: 10px 14px; border-radius: 8px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .nav-item:hover, .nav-item.active { background: #0284c7; color: #fff; }

    main { flex: 1; display: flex; flex-direction: column; background: #070d19; height: 100vh; overflow: hidden; min-width: 0; }
    header { background: #0f172a; padding: 12px 16px; border-bottom: 1px solid rgba(56, 189, 248, 0.2); display: flex; justify-content: space-between; align-items: center; height: 50px; }

    .menu-toggle { display: none; background: transparent; border: none; color: #38bdf8; font-size: 18px; cursor: pointer; }

    .tab-content { display: none; padding: 0; height: calc(100vh - 50px); flex-direction: column; width: 100%; min-width: 0; }
    .tab-content.active { display: flex; }

    .chat-area { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; width: 100%; }
    .msg { max-width: 90%; padding: 12px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5; word-break: break-word; }
    .msg.bot { background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.2); align-self: flex-start; }
    .msg.user { background: #0284c7; align-self: flex-end; }
    .msg pre { background: #030712; border: 1px solid #38bdf8; border-radius: 8px; padding: 10px; margin-top: 8px; font-family: monospace; font-size: 12px; color: #38bdf8; overflow-x: auto; white-space: pre-wrap; }

    .quick-actions { display: flex; gap: 6px; overflow-x: auto; padding: 10px 15px; background: #0f172a; border-bottom: 1px solid rgba(56, 189, 248, 0.15); }
    .action-btn { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; padding: 6px 10px; border-radius: 16px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; }

    .controls { padding: 12px 15px; background: #0f172a; border-top: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; gap: 8px; width: 100%; }
    input[type="text"] { flex: 1; background: #070d19; border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 10px 12px; border-radius: 8px; outline: none; font-size: 13px; min-width: 0; }
    button { background: #0284c7; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; white-space: nowrap; }

    table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #0f172a; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; }
    th { background: #1e293b; color: #38bdf8; }

    /* --- RESPONSIVE OPTIMIZED EXCEL SHEET ENGINE --- */
    #luckysheet { width: 100% !important; height: 100% !important; position: absolute !important; left:0; top:0; }
    .luckysheet-toolbar { overflow-x: auto !important; background: #0f172a !important; padding: 4px !important; }
    .luckysheet-toolbar-button { background: transparent !important; color: #fff !important; margin: 0 1px !important; }
    .luckysheet-cols-menu { background: #0f172a !important; color: #fff !important; }

    @media (max-width: 768px) {
      #app-container { flex-direction: column; }
      sidebar { position: fixed; top: 0; left: -260px; height: 100vh; box-shadow: 10px 0 30px rgba(0,0,0,0.8); }
      sidebar.open { transform: translateX(260px); }
      .menu-toggle { display: block; }
      .luckysheet-toolbar { height: auto !important; flex-wrap: wrap; }
    }
  </style>
</head>
<body>

  <div id="toast-notification">
    <i id="toast-icon" class="fa-solid fa-circle-exclamation"></i>
    <span id="toast-msg">Error</span>
  </div>

  <div id="entry-screen">
    <div class="entry-top">
      <div class="branding-box">
        <svg class="brand-svg" viewBox="0 0 300 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="42" fill="#38bdf8" font-size="30" font-weight="800">CAREERBOOT</text>
          <text x="215" y="42" fill="#10b981" font-size="30" font-weight="800">AI</text>
        </svg>
        <p class="welcome-note">Empowering your career growth with real-time AI Excel intelligence, VBA automation, and practice environments.</p>
      </div>

      <div class="walk-animation-container">
        <div class="stage-node"><i class="fa-solid fa-lightbulb"></i><br>INTEREST</div>
        <div class="path-line"><i class="fa-solid fa-person-walking walker-icon"></i></div>
        <div class="stage-node" style="color:#10b981;"><i class="fa-solid fa-trophy"></i><br>SUCCESS</div>
      </div>
    </div>

    <div class="entry-middle">
      <div class="key-portal-form">
        <input type="text" id="secretKeyInput" class="key-portal-input" placeholder="ENTER SECRET KEY">
        <button class="key-portal-btn" onclick="loginWithKey()">UNLOCK HUB</button>
      </div>
    </div>

    <div class="entry-bottom">
      <div class="bottom-title">YOU ARE JUST A STEP AWAY TO DIVE INTO</div>
      <div class="ecosystem-grid">
        <div class="eco-card">
          <svg class="eco-icon" viewBox="0 0 24 24"><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M7,7h4v4H7V7z M13,7h4v4h-4V7z"/></svg>
          <div class="eco-text"><h4>Live Excel Practice</h4><p>Authentic MS Excel Canvas</p></div>
        </div>
        <div class="eco-card">
          <svg class="eco-icon" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,4M11,17H13V15H11V17M11,13H13V7H11V13Z"/></svg>
          <div class="eco-text"><h4>AI Excel Trainer</h4><p>Formulas, VBA & Shortcuts on Click</p></div>
        </div>
      </div>
    </div>
  </div>

  <div id="app-container">
    <sidebar id="mobileSidebar">
      <div class="sidebar-header"><i class="fa-solid fa-file-excel"></i> Excel Mastery Hub</div>
      <ul class="nav-links">
        <li class="nav-item active" id="nav-ai-trainer" onclick="switchTab('ai-trainer')"><i class="fa-solid fa-robot"></i> AI Excel Trainer</li>
        <li class="nav-item" id="nav-live-excel" onclick="switchTab('live-excel')"><i class="fa-solid fa-table"></i> Live Practice Screen</li>
        <li class="nav-item" id="nav-practice-sheets" onclick="switchTab('practice-sheets')"><i class="fa-solid fa-download"></i> Practice Sheets</li>
      </ul>
    </sidebar>

    <main>
      <header>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button class="menu-toggle" onclick="toggleSidebar()"><i class="fa-solid fa-bars"></i></button>
          <strong id="active-tab-title" style="color: #38bdf8; font-size: 14px;">AI Excel Trainer Workspace</strong>
        </div>
        <span style="font-size: 11px; color: #10b981;"><i class="fa-solid fa-shield-halved"></i> Active</span>
      </header>

      <div id="ai-trainer" class="tab-content active">
        <div class="quick-actions">
          <button class="action-btn" onclick="triggerQuickAction('List ALL Excel Shortcut Keys from A-Z inside Code Box.')">A-Z Shortcuts</button>
          <button class="action-btn" onclick="triggerQuickAction('List ALL Excel Formulas & Functions with syntax.')">A-Z Formulas</button>
          <button class="action-btn" onclick="triggerQuickAction('Provide top 5 Essential VBA Macro Codes.')">Essential VBA</button>
        </div>

        <div class="chat-area" id="chat">
          <div class="msg bot">Welcome to CareerBoot AI! Ask any Excel query or click options above.</div>
        </div>

        <div class="controls">
          <div class="row">
            <input type="text" id="userInput" placeholder="Ask Excel formula, VBA macro..." onkeypress="handleKeyPress(event)">
            <button onclick="sendQuery()">Send</button>
          </div>
        </div>
      </div>

      <div id="live-excel" class="tab-content" style="position: relative; width: 100%; height: calc(100vh - 50px); overflow: hidden;">
        <div id="luckysheet"></div>
      </div>

      <div id="practice-sheets" class="tab-content" style="padding: 15px; overflow-y: auto;">
        <h3 style="color: #38bdf8;">Download Practice Templates</h3>
        <table>
          <thead>
            <tr><th>Template Title</th><th>Category</th><th>Format</th><th>Action</th></tr>
          </thead>
          <tbody id="sheets-table-body">
            <tr><td colspan="4" style="text-align:center; color:#64748b;">Loading practice sheets...</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>

  <script>
    var currentActiveKey = null;
    var luckysheetInitialized = false;

    // --- PREVENT MOBILE BACK BUTTON APP EXIT/ERROR ---
    window.addEventListener('popstate', function(event) {
      if (document.getElementById('app-container').style.display === 'flex') {
        history.pushState(null, null, window.location.pathname);
        switchTab('ai-trainer');
      }
    });

    function toggleSidebar() {
      document.getElementById('mobileSidebar').classList.toggle('open');
    }

    function showToast(message, isSuccess = false) {
      var toast = document.getElementById('toast-notification');
      var toastMsg = document.getElementById('toast-msg');
      var toastIcon = document.getElementById('toast-icon');

      toastMsg.innerText = message;
      toast.className = isSuccess ? 'success' : '';
      toastIcon.className = isSuccess ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation";
      toast.style.display = 'flex';
      setTimeout(function() { toast.style.display = 'none'; }, 3500);
    }

    function getSessionId() {
      var sid = localStorage.getItem('cb_session_id');
      if (!sid) {
        sid = 'SESS-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        localStorage.setItem('cb_session_id', sid);
      }
      return sid;
    }

    function loginWithKey() {
      var keyInput = document.getElementById('secretKeyInput').value.trim();
      if(!keyInput) return showToast("Please enter Secret Key.");

      fetch('/api/auth/key-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: keyInput, sessionId: getSessionId() })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if(data.success) {
          currentActiveKey = data.userKey;
          showToast("Unlocked Successfully!", true);
          setTimeout(function() {
            document.getElementById('entry-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            history.pushState({ page: 'app' }, null, window.location.pathname);
            loadPracticeSheets();
          }, 600);
        } else { 
          showToast(data.error || "Login Failed"); 
        }
      });
    }

    function initLuckysheetEngine() {
      document.getElementById('luckysheet').innerHTML = '';
      luckysheet.create({
        container: 'luckysheet',
        title: 'CareerBoot Practice Sheet',
        lang: 'en',
        showtoolbar: true,
        showinfobar: false,
        showsheetbar: true,
        allowEdit: true,
        enableAddRow: true,
        row: 25,
        column: 12,
        gridKey: 'practice_sheet_canvas',
        data: [{
          "name": "Sheet1",
          "color": "",
          "status": "1",
          "order": "0",
          "data": [
            [{"v":"Sales Data"},{"v":"Category"},{"v":"Amount (INR)"}],
            [{"v":"Q1 Revenue"},{"v":"Financial"},{"v":"150000"}],
            [{"v":"Marketing Cost"},{"v":"Expense"},{"v":"35000"}]
          ],
          "config": {
            "rowlen": {"0": 34, "1": 32, "2": 32},
            "columnlen": {"0": 140, "1": 120, "2": 130}
          },
          "index": 0
        }]
      });
      luckysheetInitialized = true;
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
      
      document.getElementById(tabId).classList.add('active');
      var activeNav = document.getElementById('nav-' + tabId);
      if(activeNav) activeNav.classList.add('active');

      document.getElementById('mobileSidebar').classList.remove('open');

      if (tabId === 'live-excel') {
        setTimeout(function() {
          if (!luckysheetInitialized) {
            initLuckysheetEngine();
          } else if(window.luckysheet) {
            luckysheet.resize();
          }
        }, 150);
      }
    }

    function loadPracticeSheets() {
      fetch('/api/practice-sheets')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success) {
            var tbody = document.getElementById('sheets-table-body');
            tbody.innerHTML = '';
            if (data.sheets.length === 0) {
              tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b;">No practice sheets available.</td></tr>';
              return;
            }
            data.sheets.forEach(function(s) {
              var tr = document.createElement('tr');
              tr.innerHTML = '<td><b>' + s.title + '</b></td>' +
                '<td><span style="color:#38bdf8">' + s.category + '</span></td>' +
                '<td>' + s.fileName.split('.').pop().toUpperCase() + '</td>' +
                '<td><a href="/api/practice-sheets/download/' + s._id + '" style="color:#10b981; font-weight:bold; text-decoration:none;"><i class="fa-solid fa-download"></i> Download</a></td>';
              tbody.appendChild(tr);
            });
          }
        });
    }

    function triggerQuickAction(promptText) {
      document.getElementById('userInput').value = promptText;
      sendQuery();
    }

    function handleKeyPress(e) { if (e.key === 'Enter') sendQuery(); }

    async function sendQuery() {
      var input = document.getElementById('userInput');
      var text = input.value.trim();
      if (!text) return;

      appendMsg(text, 'user');
      input.value = '';
      appendMsg("Thinking...", 'bot');

      try {
        var res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userKey: currentActiveKey, text: text })
        });
        var data = await res.json();
        
        var chat = document.getElementById('chat');
        chat.removeChild(chat.lastChild);

        if (data.success) appendMsg(data.answer, 'bot');
        else appendMsg("Error: " + data.error, 'bot');
      } catch (err) {
        appendMsg("Connection error to server.", 'bot');
      }
    }

    function appendMsg(msg, sender) {
      var chat = document.getElementById('chat');
      var div = document.createElement('div');
      div.className = 'msg ' + sender;
      
      var formattedMsg = msg.replace(/\\\`\\\`\\\`([\\s\\S]*?)\\\`\\\`\\\`/g, function(match, code) {
        return '<pre><code>' + code.trim() + '</code></pre>';
      });

      div.innerHTML = formattedMsg;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }
  </script>
</body>
</html>`;
  res.send(userHtml);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`CareerBoot Server running on port ${PORT}`));
