require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ==========================================
// 1. MONGODB SCHEMAS
// ==========================================
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "T-FOR-TOPA/420";

const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, default: "User Key" },
  isActive: { type: Boolean, default: true },
  isMultiDevice: { type: Boolean, default: false },
  boundSessionId: { type: String, default: null },
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
const SecretKey = mongoose.model('SecretKey', keySchema);

const chatSchema = new mongoose.Schema({
  userKey: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  attachmentMeta: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now, expires: 86400 * 30 }
});
const Chat = mongoose.model('Chat', chatSchema);

const sheetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: "General Practice" },
  description: { type: String, default: "" },
  fileName: { type: String, required: true },
  fileData: { type: String, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});
const PracticeSheet = mongoose.model('PracticeSheet', sheetSchema);

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log("[DATABASE] MongoDB Engine Connected.");
      await SecretKey.updateOne(
        { key: ADMIN_PASSCODE.trim().toUpperCase() },
        { 
          $setOnInsert: { 
            key: ADMIN_PASSCODE.trim().toUpperCase(), 
            label: "Master Admin Root Access", 
            isActive: true, 
            isMultiDevice: true, 
            maxUses: 999999 
          } 
        },
        { upsert: true }
      );
    })
    .catch(err => console.error("[DATABASE ERROR]", err));
}

// ==========================================
// 2. GEMINI AI & UPLOAD CONFIG
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ==========================================
// 3. API ENDPOINTS
// ==========================================
app.post('/api/auth/key-login', async (req, res) => {
  const { secretKey, sessionId } = req.body;
  if (!secretKey || !sessionId) {
    return res.status(400).json({ success: false, error: "Secret Key & Device Session ID required." });
  }

  try {
    const formattedKey = secretKey.trim().toUpperCase();
    if (formattedKey === ADMIN_PASSCODE.trim().toUpperCase()) {
      return res.json({ success: true, userKey: formattedKey, label: "Master Admin Root Access", isAdmin: true });
    }

    const foundKey = await SecretKey.findOne({ key: formattedKey, isActive: true });
    if (!foundKey) {
      return res.status(401).json({ success: false, error: "Invalid, expired, or deactivated key." });
    }

    if (foundKey.expiresAt && new Date() > new Date(foundKey.expiresAt)) {
      foundKey.isActive = false;
      await foundKey.save();
      return res.status(401).json({ success: false, error: "This Secret Key has expired." });
    }

    if (!foundKey.isMultiDevice && foundKey.boundSessionId && foundKey.boundSessionId !== sessionId) {
      return res.status(403).json({ success: false, error: "Security Lock: Key bound to another active device." });
    }

    if (!foundKey.boundSessionId) {
      foundKey.boundSessionId = sessionId;
      foundKey.usedCount += 1;
      await foundKey.save();
    }

    return res.json({ 
      success: true, 
      userKey: foundKey.key, 
      label: foundKey.label, 
      isAdmin: false,
      isMultiDevice: foundKey.isMultiDevice 
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Authentication system error: " + err.message });
  }
});

app.post('/api/admin/create-key', async (req, res) => {
  const { adminKey, key, label, isMultiDevice, expiresAt } = req.body;
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized access." });

  try {
    const newKey = await SecretKey.create({ 
      key: key.toUpperCase(), 
      label: label || "Enterprise Key",
      isMultiDevice: !!isMultiDevice,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });
    res.json({ success: true, key: newKey });
  } catch (err) {
    res.status(400).json({ success: false, error: "Failed to generate key. Key already exists." });
  }
});

app.get('/api/admin/keys', async (req, res) => {
  const adminKey = req.headers['authorization'];
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized access." });

  const keys = await SecretKey.find().sort({ createdAt: -1 });
  res.json({ success: true, keys });
});

app.post('/api/admin/reset-key', async (req, res) => {
  const { adminKey, keyId } = req.body;
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized access." });

  await SecretKey.findByIdAndUpdate(keyId, { boundSessionId: null });
  res.json({ success: true, message: "Device lock released successfully." });
});

app.post('/api/admin/upload-sheet', upload.single('sheet'), async (req, res) => {
  const { adminKey, title, category, description } = req.body;
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized access." });
  if (!req.file) return res.status(400).json({ error: "No practice file provided." });

  const fileData = req.file.buffer.toString('base64');
  const sheet = await PracticeSheet.create({
    title,
    category: category || "General Practice",
    description: description || "",
    fileName: req.file.originalname,
    fileData,
    mimeType: req.file.mimetype
  });

  res.json({ success: true, sheet });
});

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { userKey, text } = req.body;
    if (!userKey) return res.status(401).json({ success: false, error: "Unauthorized session." });

    let chatHistory = [];
    if (mongoose.connection.readyState === 1) {
      chatHistory = await Chat.find({ userKey }).sort({ createdAt: -1 }).limit(10);
      await Chat.create({ 
        userKey, 
        message: text || '[Screenshot/Excel Attachment Provided]', 
        sender: 'user',
        attachmentMeta: req.file ? { fileName: req.file.originalname, mimeType: req.file.mimetype } : null
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const systemInstruction = `You are CareerBoot AI, an expert Microsoft Excel tutor. Provide accurate formulas, VBA macros, and troubleshooting guidance. Keep responses concise and clear.`;

    let promptContents = [systemInstruction];

    chatHistory.reverse().forEach(c => {
      promptContents.push(`${c.sender.toUpperCase()}: ${c.message}`);
    });

    if (text) promptContents.push(`USER: ${text}`);
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
    console.error("[AI ERROR]", err);
    res.status(500).json({ success: false, error: "AI Engine error: " + err.message });
  }
});

app.get('/api/practice-sheets', async (req, res) => {
  try {
    const sheets = await PracticeSheet.find({}, { fileData: 0 }).sort({ uploadedAt: -1 });
    return res.json({ success: true, sheets });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/practice-sheets/download/:id', async (req, res) => {
  try {
    const sheet = await PracticeSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ success: false, error: "Practice sheet not found." });

    const fileBuffer = Buffer.from(sheet.fileData, 'base64');
    res.setHeader('Content-Type', sheet.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.fileName}"`);
    return res.send(fileBuffer);
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

// ==========================================
// 4. FRONTEND APPLICATION
// ==========================================
app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>CareerBoot AI - Enterprise Workspace</title>
  
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/css/pluginsCss.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/plugins.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/css/luckysheet.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet/dist/assets/iconfont/iconfont.css" />
  <script src="https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/js/plugin.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/luckysheet/dist/luckysheet.umd.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

  <style>
    :root {
      --bg-dark: #070d19;
      --bg-card: #0f172a;
      --green-excel: #107c41;
      --accent-blue: #38bdf8;
      --text-muted: #94a3b8;
      --border-color: rgba(56, 189, 248, 0.2);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body, html { height: 100%; width: 100vw; background: var(--bg-dark); color: #fff; overflow: hidden; }

    #toast-notification {
      position: fixed; top: 15px; right: 15px; z-index: 9999;
      background: rgba(15, 23, 42, 0.95); border: 1px solid #ef4444; color: #fff;
      padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25); display: none; align-items: center; gap: 10px;
    }
    #toast-notification.success { border-color: #10b981; }

    #entry-screen {
      min-height: 100vh; width: 100vw; display: flex; flex-direction: column;
      justify-content: center; align-items: center; background: linear-gradient(135deg, #070d19 0%, #0f172a 100%);
      padding: 20px;
    }

    .brand-title { color: var(--green-excel); font-size: 38px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-title span { color: var(--accent-blue); }
    .portal-box { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 32px; width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .key-input { background: var(--bg-dark); border: 1px solid rgba(56, 189, 248, 0.4); color: var(--accent-blue); font-size: 15px; font-weight: 700; padding: 14px; border-radius: 8px; outline: none; text-transform: uppercase; text-align: center; width: 100%; }
    .key-btn { background: var(--green-excel); color: #fff; border: none; padding: 14px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 14px; }
    .key-btn:hover { background: #0d6736; transform: translateY(-1px); }

    #app-container { display: none; height: 100vh; width: 100vw; overflow: hidden; }
    sidebar { width: 260px; background: var(--bg-card); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; z-index: 10; }
    .sidebar-header { padding: 20px; font-weight: 800; color: var(--green-excel); font-size: 17px; border-bottom: 1px solid rgba(56, 189, 248, 0.1); display: flex; align-items: center; gap: 10px; }
    .nav-links { list-style: none; padding: 14px 10px; display: flex; flex-direction: column; gap: 8px; }
    .nav-item { padding: 12px 16px; border-radius: 8px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; transition: all 0.2s; }
    .nav-item:hover, .nav-item.active { background: var(--green-excel); color: #fff; }

    main { flex: 1; display: flex; flex-direction: column; background: var(--bg-dark); height: 100vh; overflow: hidden; position: relative; }
    header { background: var(--bg-card); padding: 0 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; height: 54px; }

    .tab-content { display: none; height: calc(100vh - 54px); width: 100%; flex-direction: column; position: relative; }
    .tab-content.active { display: flex; }

    #luckysheet { width: 100% !important; height: 100% !important; position: absolute !important; left:0; top:0; }

    .chat-area { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .msg { max-width: 82%; padding: 14px 18px; border-radius: 12px; font-size: 13px; line-height: 1.6; }
    .msg.bot { background: rgba(15, 23, 42, 0.9); border: 1px solid var(--border-color); align-self: flex-start; }
    .msg.user { background: var(--green-excel); align-self: flex-end; }
    .msg pre { background: #030712; border: 1px solid var(--green-excel); border-radius: 8px; padding: 12px; margin-top: 10px; font-family: monospace; color: var(--accent-blue); overflow-x: auto; white-space: pre-wrap; }

    .controls { padding: 16px 20px; background: var(--bg-card); border-top: 1px solid var(--border-color); display: flex; gap: 12px; align-items: center; }
    .controls input[type="text"] { flex: 1; background: var(--bg-dark); border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 12px 16px; border-radius: 8px; outline: none; }
    .action-btn { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: var(--accent-blue); padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; }
    .action-btn:hover { background: rgba(56, 189, 248, 0.2); }

    .sheet-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 24px; overflow-y: auto; }
    .sheet-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .sheet-card h4 { color: #fff; font-size: 16px; font-weight: 700; }
    .sheet-card p { color: var(--text-muted); font-size: 13px; line-height: 1.4; }
    .download-btn { background: var(--green-excel); color: #fff; border: none; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; text-align: center; margin-top: 8px; }
    
    .admin-panel { padding: 24px; overflow-y: auto; }
    .admin-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .admin-card h4 { color: var(--accent-blue); margin-bottom: 14px; font-size: 15px; }
    .form-group { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .form-group input, .form-group select { flex: 1; min-width: 200px; background: var(--bg-dark); border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 10px 14px; border-radius: 8px; outline: none; font-size: 13px; }

    /* MOBILE RESPONSIVE FIXES */
    @media (max-width: 768px) {
      sidebar { width: 60px !important; }
      .sidebar-header, .nav-item span { display: none !important; }
      .nav-item { justify-content: center; padding: 12px 0; }
      header { padding: 0 10px; height: 48px; }
      header span { font-size: 11px !important; }
      .action-btn { padding: 6px 10px; font-size: 11px; }
      #live-excel { width: calc(100vw - 60px) !important; overflow: hidden; }
      .luckysheet-share-logo { display: none !important; }
    }
  </style>
</head>
<body>

  <div id="toast-notification">
    <i id="toast-icon" class="fa-solid fa-circle-exclamation"></i>
    <span id="toast-msg">System Notification</span>
  </div>

  <div id="entry-screen">
    <h1 class="brand-title">CAREERBOOT <span>AI</span></h1>
    <p style="color: var(--text-muted); margin-top: 6px; margin-bottom: 24px; font-size: 14px;">Enterprise Excel Engine & AI Training Environment</p>
    <div class="portal-box">
      <input type="text" id="secretKeyInput" class="key-input" placeholder="ENTER SECRET KEY">
      <button class="key-btn" onclick="loginWithKey()">UNLOCK WORKSPACE</button>
    </div>
  </div>

  <div id="app-container">
    <sidebar>
      <div class="sidebar-header"><i class="fa-solid fa-file-excel"></i> CareerBoot Hub</div>
      <ul class="nav-links">
        <li class="nav-item active" id="nav-live-excel" onclick="switchTab('live-excel')"><i class="fa-solid fa-table"></i> <span>Practice Canvas</span></li>
        <li class="nav-item" id="nav-ai-trainer" onclick="switchTab('ai-trainer')"><i class="fa-solid fa-robot"></i> <span>AI Trainer</span></li>
        <li class="nav-item" id="nav-sheets" onclick="switchTab('sheets')"><i class="fa-solid fa-folder-open"></i> <span>Practice Sheets</span></li>
        <li class="nav-item" id="nav-admin" style="display:none;" onclick="switchTab('admin')"><i class="fa-solid fa-user-shield"></i> <span>Admin Panel</span></li>
      </ul>
    </sidebar>

    <main>
      <header>
        <span id="active-tab-title" style="color: var(--accent-blue); font-weight: 700; font-size: 14px;">Practice Sheet Workspace</span>
        <div style="display: flex; gap: 10px;">
          <input type="file" id="importExcelInput" style="display:none;" accept=".xlsx, .xls, .csv" onchange="importLocalExcel(this)">
          <button class="action-btn" onclick="document.getElementById('importExcelInput').click()"><i class="fa-solid fa-file-import"></i> Import .XLSX</button>
          <button class="action-btn" style="background: var(--green-excel); color: #fff; border: none;" onclick="exportToExcel()"><i class="fa-solid fa-file-export"></i> Export .XLSX</button>
        </div>
      </header>

      <div id="live-excel" class="tab-content active">
        <div id="luckysheet"></div>
      </div>

      <div id="ai-trainer" class="tab-content">
        <div class="chat-area" id="chat">
          <div class="msg bot">Welcome to CareerBoot AI! Ask any Excel query, formula syntax, VBA requirement, or upload a screenshot to troubleshoot errors.</div>
        </div>
        <div class="controls">
          <input type="file" id="chatFileInput" style="display:none;" onchange="handleFileSelect(this)">
          <button class="action-btn" onclick="document.getElementById('chatFileInput').click()"><i class="fa-solid fa-paperclip"></i></button>
          <input type="text" id="userInput" placeholder="Ask formula query, VLOOKUP, XLOOKUP, VBA code..." onkeypress="if(event.key==='Enter') sendQuery()">
          <button class="action-btn" style="background:var(--green-excel); color:#fff; border:none;" onclick="sendQuery()"><i class="fa-solid fa-paper-plane"></i> Send</button>
        </div>
        <span id="selectedFileName" style="font-size: 11px; color: var(--accent-blue); padding: 0 20px 8px 20px; display: none;"></span>
      </div>

      <div id="sheets" class="tab-content">
        <div class="sheet-card-grid" id="sheetsContainer"></div>
      </div>

      <div id="admin" class="tab-content admin-panel">
        <h3 style="color: #fff; margin-bottom: 20px; font-weight: 800;">Enterprise Admin Panel</h3>
        
        <div class="admin-card">
          <h4><i class="fa-solid fa-key"></i> Generate Secret Access Key</h4>
          <div class="form-group">
            <input type="text" id="newKeyVal" placeholder="NEW KEY (e.g. USER-9921)">
            <input type="text" id="newKeyLabel" placeholder="STUDENT NAME / LABEL">
            <select id="newKeyMulti">
              <option value="false">Single Device Locked</option>
              <option value="true">Multi-Device Allowed</option>
            </select>
            <button class="action-btn" style="background:var(--green-excel); color:#fff; border:none;" onclick="generateKey()">Create Key</button>
          </div>
        </div>

        <div class="admin-card">
          <h4><i class="fa-solid fa-cloud-arrow-up"></i> Upload Practice Template Sheet</h4>
          <div class="form-group">
            <input type="text" id="sheetTitle" placeholder="Sheet Title (e.g. VLOOKUP Practice Sheet)">
            <input type="text" id="sheetCategory" placeholder="Category (e.g. Advanced Formulas)">
            <input type="file" id="adminSheetFile" accept=".xlsx, .xls">
            <button class="action-btn" style="background:var(--green-excel); color:#fff; border:none;" onclick="uploadAdminSheet()">Upload Sheet</button>
          </div>
        </div>

        <div class="admin-card">
          <h4><i class="fa-solid fa-list-check"></i> Active Key Records</h4>
          <div id="keysList"></div>
        </div>
      </div>
    </main>
  </div>

  <script>
    var currentActiveKey = null;
    var isAdminUser = false;
    var luckysheetInitialized = false;

    function showToast(message, isSuccess) {
      var toast = document.getElementById('toast-notification');
      document.getElementById('toast-msg').innerText = message;
      toast.className = isSuccess ? 'success' : '';
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
      if(!keyInput) return showToast("Please enter your assigned Secret Key.", false);

      fetch('/api/auth/key-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: keyInput, sessionId: getSessionId() })
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          currentActiveKey = data.userKey;
          isAdminUser = data.isAdmin || false;
          showToast("Workspace Unlocked Successfully!", true);
          document.getElementById('entry-screen').style.display = 'none';
          document.getElementById('app-container').style.display = 'flex';
          
          if(isAdminUser) {
            document.getElementById('nav-admin').style.display = 'flex';
            loadAdminKeys();
          }

          initLuckysheetEngine();
          loadPracticeSheets();
        } else {
          showToast(data.error || "Authentication Failed", false);
        }
      });
    }

    function initLuckysheetEngine() {
      if (luckysheetInitialized) return;
      
      var isMobile = window.innerWidth <= 768;

      luckysheet.create({
        container: 'luckysheet',
        title: 'CareerBoot Practice Canvas',
        lang: 'en',
        showtoolbar: !isMobile,
        showinfobar: false,
        showsheetbar: true,
        allowEdit: true,
        data: [{ 
          "name": "Practice Sheet 1", 
          "status": "1", 
          "data": [[{"v":"Item"},{"v":"Category"},{"v":"Sales INR"}],[{"v":"Laptop"},{"v":"Hardware"},{"v":45000}]] 
        }]
      });

      luckysheetInitialized = true;
      
      window.addEventListener('resize', function() {
        if (window.luckysheet) luckysheet.resize();
      });
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      
      document.getElementById(tabId).classList.add('active');
      document.getElementById('nav-' + tabId).classList.add('active');

      if (tabId === 'live-excel' && window.luckysheet) {
        setTimeout(() => luckysheet.resize(), 100);
      }
    }

    function importLocalExcel(input) {
      var file = input.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function(e) {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        
        var sheetsData = [];
        workbook.SheetNames.forEach(function(name, index) {
          var worksheet = workbook.Sheets[name];
          var jsonArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          var celldata = [];
          for (var r = 0; r < jsonArr.length; r++) {
            for (var c = 0; c < jsonArr[r].length; c++) {
              if (jsonArr[r][c] !== undefined && jsonArr[r][c] !== null) {
                celldata.push({ r: r, c: c, v: { v: jsonArr[r][c], m: String(jsonArr[r][c]) } });
              }
            }
          }

          sheetsData.push({
            name: name,
            status: index === 0 ? "1" : "0",
            celldata: celldata
          });
        });

        luckysheet.destroy();
        luckysheet.create({
          container: 'luckysheet',
          title: file.name,
          data: sheetsData
        });
        showToast("Excel sheet imported to canvas!", true);
      };
      reader.readAsArrayBuffer(file);
    }

    function exportToExcel() {
      var sheetData = luckysheet.getluckysheetfile();
      var wb = XLSX.utils.book_new();
      sheetData.forEach(function(sheet) {
        var arr = luckysheet.gettransdata(sheet.data);
        var ws = XLSX.utils.aoa_to_sheet(arr);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      XLSX.writeFile(wb, "CareerBoot_Practice_Export.xlsx");
    }

    function handleFileSelect(input) {
      var fileNameSpan = document.getElementById('selectedFileName');
      if (input.files && input.files[0]) {
        fileNameSpan.innerText = "Attached: " + input.files[0].name;
        fileNameSpan.style.display = "block";
      } else {
        fileNameSpan.style.display = "none";
      }
    }

    async function sendQuery() {
      var input = document.getElementById('userInput');
      var fileInput = document.getElementById('chatFileInput');
      var text = input.value.trim();
      var file = fileInput.files[0];
      if (!text && !file) return;

      appendMsg(text || '[Attachment Provided]', 'user');
      input.value = '';
      fileInput.value = '';
      document.getElementById('selectedFileName').style.display = 'none';

      appendMsg("Thinking...", 'bot');

      var formData = new FormData();
      formData.append('userKey', currentActiveKey);
      if (text) formData.append('text', text);
      if (file) formData.append('file', file);

      try {
        var res = await fetch('/api/chat', { method: 'POST', body: formData });
        var data = await res.json();
        var chat = document.getElementById('chat');
        chat.removeChild(chat.lastChild);

        if (data.success) appendMsg(data.answer, 'bot');
        else appendMsg("Error: " + data.error, 'bot');
      } catch (err) {
        appendMsg("Connection error to backend server.", 'bot');
      }
    }

    function appendMsg(msg, sender) {
      var chat = document.getElementById('chat');
      var div = document.createElement('div');
      div.className = 'msg ' + sender;
      div.innerHTML = msg.replace(/\\\`\\\`\\\`([\\s\\S]*?)\\\`\\\`\\\`/g, '<pre><code>$1</code></pre>');
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function loadPracticeSheets() {
      fetch('/api/practice-sheets')
        .then(res => res.json())
        .then(data => {
          if(data.success) {
            var container = document.getElementById('sheetsContainer');
            container.innerHTML = '';
            data.sheets.forEach(s => {
              container.innerHTML += \`
                <div class="sheet-card">
                  <h4>\${s.title}</h4>
                  <p>Category: \${s.category}</p>
                  <p>\${s.description || 'Download practice template for hands-on learning.'}</p>
                  <a class="download-btn" href="/api/practice-sheets/download/\${s._id}"><i class="fa-solid fa-download"></i> Download Practice Template</a>
                </div>
              \`;
            });
          }
        });
    }

    function generateKey() {
      var key = document.getElementById('newKeyVal').value.trim();
      var label = document.getElementById('newKeyLabel').value.trim();
      var isMultiDevice = document.getElementById('newKeyMulti').value === "true";
      
      if(!key) return showToast("Provide a valid Secret Key string.", false);

      fetch('/api/admin/create-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: currentActiveKey, key, label, isMultiDevice })
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          showToast("New Key Created Successfully!", true);
          document.getElementById('newKeyVal').value = '';
          document.getElementById('newKeyLabel').value = '';
          loadAdminKeys();
        } else showToast(data.error, false);
      });
    }

    function uploadAdminSheet() {
      var title = document.getElementById('sheetTitle').value.trim();
      var category = document.getElementById('sheetCategory').value.trim();
      var fileInput = document.getElementById('adminSheetFile');
      var file = fileInput.files[0];

      if (!title || !file) return showToast("Title and Excel File required.", false);

      var formData = new FormData();
      formData.append('adminKey', currentActiveKey);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('sheet', file);

      fetch('/api/admin/upload-sheet', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
          if(data.success) {
            showToast("Practice Sheet Uploaded!", true);
            loadPracticeSheets();
          } else showToast(data.error, false);
        });
    }

    function loadAdminKeys() {
      fetch('/api/admin/keys', { headers: { 'Authorization': currentActiveKey } })
        .then(res => res.json())
        .then(data => {
          if(data.success) {
            var list = document.getElementById('keysList');
            list.innerHTML = '';
            data.keys.forEach(k => {
              list.innerHTML += \`
                <div style="background:var(--bg-dark); padding:10px 14px; margin-bottom:8px; border-radius:8px; font-size:12px; display:flex; justify-content:space-between; align-items:center; border: 1px solid var(--border-color);">
                  <div>
                    <span style="font-weight:700; color:var(--accent-blue);">\${k.key}</span> 
                    <span style="color:var(--text-muted);">(\${k.label})</span>
                  </div>
                  <div>
                    <span style="margin-right:10px; color:\${k.boundSessionId ? '#ef4444' : '#10b981'}; font-weight:700;">
                      \${k.boundSessionId ? 'LOCKED TO DEVICE' : 'UNLOCKED'}
                    </span>
                    \${k.boundSessionId ? \`<button class="action-btn" style="padding:4px 8px; font-size:11px;" onclick="resetKeyLock('\${k._id}')">Release Lock</button>\` : ''}
                  </div>
                </div>\`;
            });
          }
        });
    }

    function resetKeyLock(keyId) {
      fetch('/api/admin/reset-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: currentActiveKey, keyId })
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          showToast("Device Lock Released!", true);
          loadAdminKeys();
        }
      });
    }
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`[SERVER RUNNING] Active on port ${PORT}`));
