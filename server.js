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
// 1. DATABASE & SCHEMAS
// ==========================================
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "T-FOR-TOPA/420";

const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, uppercase: true, trim: true },
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
  createdAt: { type: Date, default: Date.now, expires: 2592000 }
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
      console.log("[DATABASE] Connected successfully.");
      await SecretKey.updateOne(
        { key: ADMIN_PASSCODE.trim().toUpperCase() },
        { 
          $setOnInsert: { 
            key: ADMIN_PASSCODE.trim().toUpperCase(), 
            label: "Master Root Admin Access", 
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
// 2. AI ENGINE & UPLOAD PIPELINE
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
    return res.status(400).json({ success: false, error: "Secret Key & Unique Hardware Session ID required." });
  }

  try {
    const formattedKey = secretKey.trim().toUpperCase();
    if (formattedKey === ADMIN_PASSCODE.trim().toUpperCase()) {
      return res.json({ success: true, userKey: formattedKey, label: "Master Admin Root Access", isAdmin: true });
    }

    const foundKey = await SecretKey.findOne({ key: formattedKey, isActive: true });
    if (!foundKey) {
      return res.status(401).json({ success: false, error: "Invalid or inactive key." });
    }

    if (foundKey.expiresAt && new Date() > new Date(foundKey.expiresAt)) {
      foundKey.isActive = false;
      await foundKey.save();
      return res.status(401).json({ success: false, error: "Access Key has expired." });
    }

    if (!foundKey.isMultiDevice && foundKey.boundSessionId && foundKey.boundSessionId !== sessionId) {
      return res.status(403).json({ success: false, error: "Key is bound to another active device." });
    }

    if (!foundKey.boundSessionId) {
      foundKey.boundSessionId = sessionId;
      foundKey.usedCount += 1;
      await foundKey.save();
    }

    return res.json({ success: true, userKey: foundKey.key, label: foundKey.label, isAdmin: false });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Auth System Error: " + err.message });
  }
});

app.post('/api/admin/create-key', async (req, res) => {
  const { adminKey, key, label, isMultiDevice, expiresAt } = req.body;
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized." });

  try {
    const newKey = await SecretKey.create({ 
      key: key.toUpperCase(), 
      label: label || "Enterprise Key",
      isMultiDevice: !!isMultiDevice,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });
    res.json({ success: true, key: newKey });
  } catch (err) {
    res.status(400).json({ success: false, error: "Key creation failed. Duplicate key name." });
  }
});

app.get('/api/admin/keys', async (req, res) => {
  const adminKey = req.headers['authorization'];
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized." });

  const keys = await SecretKey.find().sort({ createdAt: -1 });
  res.json({ success: true, keys });
});

app.post('/api/admin/reset-key', async (req, res) => {
  const { adminKey, keyId } = req.body;
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized." });

  await SecretKey.findByIdAndUpdate(keyId, { boundSessionId: null });
  res.json({ success: true, message: "Hardware session lock released." });
});

app.post('/api/admin/upload-sheet', upload.single('sheet'), async (req, res) => {
  const { adminKey, title, category, description } = req.body;
  if (adminKey !== ADMIN_PASSCODE.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized." });
  if (!req.file) return res.status(400).json({ error: "No file attached." });

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
    if (!userKey) return res.status(401).json({ success: false, error: "Unauthorized." });

    let chatHistory = [];
    if (mongoose.connection.readyState === 1) {
      chatHistory = await Chat.find({ userKey }).sort({ createdAt: -1 }).limit(6);
      await Chat.create({ 
        userKey, 
        message: text || '[Attachment Submitted]', 
        sender: 'user',
        attachmentMeta: req.file ? { fileName: req.file.originalname, mimeType: req.file.mimetype } : null
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const systemPrompt = `You are CareerBoot AI, an expert Excel Master and Data Analyst. Provide immediate, highly accurate answers to Excel queries, VLOOKUP, XLOOKUP, INDEX/MATCH, and VBA requests. Wrap code/formulas in Markdown blocks. Be concise and precise.`;

    let promptContents = [systemPrompt];
    chatHistory.reverse().forEach(c => promptContents.push(`${c.sender.toUpperCase()}: ${c.message}`));
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
    res.status(500).json({ success: false, error: "AI Engine processing failed: " + err.message });
  }
});

app.get('/api/practice-sheets', async (req, res) => {
  try {
    const sheets = await PracticeSheet.find({}, { fileData: 0 }).sort({ uploadedAt: -1 });
    return res.json({ success: true, sheets });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/practice-sheets/data/:id', async (req, res) => {
  try {
    const sheet = await PracticeSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ success: false, error: "Sheet not found." });
    return res.json({ success: true, fileData: sheet.fileData, fileName: sheet.fileName });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/practice-sheets/download/:id', async (req, res) => {
  try {
    const sheet = await PracticeSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ success: false, error: "Sheet not found." });

    const fileBuffer = Buffer.from(sheet.fileData, 'base64');
    res.setHeader('Content-Type', sheet.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.fileName}"`);
    return res.send(fileBuffer);
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

// ==========================================
// 4. FRONTEND APPLICATION (FULL FIXED UI/UX)
// ==========================================
app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>CareerBoot AI - Enterprise Excel Portal</title>
  
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
      --green-hover: #0d6736;
      --accent-blue: #38bdf8;
      --text-muted: #94a3b8;
      --border-color: rgba(56, 189, 248, 0.15);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    html, body { height: 100%; width: 100vw; background: var(--bg-dark); color: #fff; overflow: hidden; }

    #toast-notification {
      position: fixed; top: 16px; right: 16px; z-index: 99999;
      background: rgba(15, 23, 42, 0.95); border: 1px solid #ef4444; color: #fff;
      padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); display: none; align-items: center; gap: 10px;
      backdrop-filter: blur(8px);
    }
    #toast-notification.success { border-color: #10b981; }

    #entry-screen {
      height: 100vh; width: 100vw; display: flex; flex-direction: column;
      justify-content: center; align-items: center; background: radial-gradient(circle at center, #0f172a 0%, #070d19 100%);
      padding: 20px; position: fixed; top:0; left:0; z-index: 100;
    }

    .brand-title { color: var(--green-excel); font-size: 36px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-title span { color: var(--accent-blue); }
    .portal-box { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 36px; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 18px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
    .key-input { background: var(--bg-dark); border: 1px solid rgba(56, 189, 248, 0.3); color: var(--accent-blue); font-size: 15px; font-weight: 700; padding: 14px; border-radius: 10px; outline: none; text-transform: uppercase; text-align: center; width: 100%; transition: all 0.2s; }
    .key-input:focus { border-color: var(--accent-blue); box-shadow: 0 0 15px rgba(56, 189, 248, 0.2); }
    .key-btn { background: var(--green-excel); color: #fff; border: none; padding: 14px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 14px; }
    .key-btn:hover { background: var(--green-hover); }

    #app-container { display: none; height: 100vh; width: 100vw; overflow: hidden; flex-direction: row; }
    sidebar { width: 240px; background: var(--bg-card); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; z-index: 20; flex-shrink: 0; }
    .sidebar-header { padding: 18px 20px; font-weight: 800; color: var(--green-excel); font-size: 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 10px; }
    .nav-links { list-style: none; padding: 16px 10px; display: flex; flex-direction: column; gap: 8px; }
    .nav-item { padding: 12px 16px; border-radius: 10px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; transition: all 0.2s; }
    .nav-item:hover, .nav-item.active { background: var(--green-excel); color: #fff; }

    main { flex: 1; display: flex; flex-direction: column; background: var(--bg-dark); height: 100vh; width: calc(100vw - 240px); overflow: hidden; position: relative; }
    header { background: var(--bg-card); padding: 0 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; height: 50px; flex-shrink: 0; }

    .tab-content { display: none; height: calc(100vh - 50px); width: 100%; position: relative; overflow: hidden; }
    .tab-content.active { display: flex; }

    /* EXCEL CANVAS FIX */
    #live-excel { width: 100%; height: calc(100vh - 50px); position: relative; overflow: hidden; }
    #luckysheet { width: 100% !important; height: 100% !important; position: absolute !important; left:0; top:0; }

    /* AI TRAINER FIX (PERFECT SCROLLING & SIZING) */
    #ai-trainer { flex-direction: column; height: calc(100vh - 50px); width: 100%; overflow: hidden; position: relative; }
    .chat-container { flex: 1; overflow-y: auto !important; padding: 20px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; max-height: calc(100vh - 170px); }
    .chat-container::-webkit-scrollbar { width: 6px; }
    .chat-container::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 4px; }
    
    .prompt-suggestions { display: flex; gap: 10px; padding: 10px 20px; overflow-x: auto; background: rgba(15, 23, 42, 0.6); border-top: 1px solid var(--border-color); flex-shrink: 0; }
    .prompt-chip { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--accent-blue); padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
    .prompt-chip:hover { background: var(--green-excel); color: #fff; }

    .msg { max-width: 80%; padding: 14px 18px; border-radius: 12px; font-size: 13px; line-height: 1.6; word-wrap: break-word; }
    .msg.bot { background: var(--bg-card); border: 1px solid var(--border-color); align-self: flex-start; color: #e2e8f0; }
    .msg.user { background: var(--green-excel); align-self: flex-end; color: #fff; }
    .msg pre { background: #030712; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-top: 10px; font-family: monospace; color: var(--accent-blue); overflow-x: auto; white-space: pre-wrap; }

    .controls { padding: 14px 20px; background: var(--bg-card); border-top: 1px solid var(--border-color); display: flex; gap: 10px; align-items: center; flex-shrink: 0; }
    .controls input[type="text"] { flex: 1; background: var(--bg-dark); border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 12px 16px; border-radius: 8px; outline: none; font-size: 13px; }
    .controls input[type="text"]:focus { border-color: var(--accent-blue); }
    .action-btn { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: var(--accent-blue); padding: 10px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .action-btn:hover { background: rgba(56, 189, 248, 0.2); }

    .sheet-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 24px; width: 100%; height: 100%; overflow-y: auto; }
    .sheet-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; height: fit-content; }
    .sheet-card h4 { color: #fff; font-size: 15px; font-weight: 700; }
    .sheet-card p { color: var(--text-muted); font-size: 12px; line-height: 1.5; }
    .download-btn { background: var(--green-excel); color: #fff; border: none; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; text-align: center; margin-top: auto; }
    .load-canvas-btn { background: rgba(56, 189, 248, 0.1); color: var(--accent-blue); border: 1px solid rgba(56, 189, 248, 0.3); padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; }

    .admin-panel { padding: 24px; overflow-y: auto; width: 100%; height: 100%; }
    .admin-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .admin-card h4 { color: var(--accent-blue); margin-bottom: 14px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .form-group { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .form-group input, .form-group select { flex: 1; min-width: 180px; background: var(--bg-dark); border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 10px 14px; border-radius: 8px; outline: none; font-size: 12px; }

    @media (max-width: 768px) {
      sidebar { width: 60px !important; }
      sidebar .sidebar-header span, sidebar .nav-item span { display: none !important; }
      main { width: calc(100vw - 60px) !important; }
      .nav-item { justify-content: center; padding: 12px 0; }
      header { padding: 0 10px; }
      header span { font-size: 11px !important; }
      .action-btn span { display: none; }
      .msg { max-width: 90%; }
    }
  </style>
</head>
<body>

  <div id="toast-notification">
    <i id="toast-icon" class="fa-solid fa-circle-exclamation"></i>
    <span id="toast-msg">Notification</span>
  </div>

  <div id="entry-screen">
    <h1 class="brand-title">CAREERBOOT <span>AI</span></h1>
    <p style="color: var(--text-muted); margin-top: 6px; margin-bottom: 24px; font-size: 13px;">Enterprise Interactive Excel Portal</p>
    <div class="portal-box">
      <input type="text" id="secretKeyInput" class="key-input" placeholder="ENTER ACCESS KEY">
      <button class="key-btn" onclick="loginWithKey()">LAUNCH WORKSPACE</button>
    </div>
  </div>

  <div id="app-container">
    <sidebar>
      <div class="sidebar-header"><i class="fa-solid fa-file-excel"></i> <span>CareerBoot</span></div>
      <ul class="nav-links">
        <li class="nav-item active" id="nav-live-excel" onclick="switchTab('live-excel')"><i class="fa-solid fa-table"></i> <span>Practice Canvas</span></li>
        <li class="nav-item" id="nav-ai-trainer" onclick="switchTab('ai-trainer')"><i class="fa-solid fa-robot"></i> <span>AI Trainer</span></li>
        <li class="nav-item" id="nav-sheets" onclick="switchTab('sheets')"><i class="fa-solid fa-folder-open"></i> <span>Practice Sheets</span></li>
        <li class="nav-item" id="nav-admin" style="display:none;" onclick="switchTab('admin')"><i class="fa-solid fa-user-shield"></i> <span>Admin Suite</span></li>
      </ul>
    </sidebar>

    <main>
      <header>
        <span id="active-tab-title" style="color: var(--accent-blue); font-weight: 700; font-size: 13px;">Practice Sheet Canvas</span>
        <div style="display: flex; gap: 8px;">
          <input type="file" id="importExcelInput" style="display:none;" accept=".xlsx, .xls, .csv" onchange="importLocalExcel(this)">
          <button class="action-btn" onclick="document.getElementById('importExcelInput').click()"><i class="fa-solid fa-file-import"></i> <span>Import .XLSX</span></button>
          <button class="action-btn" style="background: var(--green-excel); color: #fff; border: none;" onclick="exportToExcel()"><i class="fa-solid fa-file-export"></i> <span>Export .XLSX</span></button>
        </div>
      </header>

      <div id="live-excel" class="tab-content active">
        <div id="luckysheet"></div>
      </div>

      <div id="ai-trainer" class="tab-content">
        <div class="chat-container" id="chat">
          <div class="msg bot">Welcome to CareerBoot AI Trainer! Ask questions regarding formulas (XLOOKUP, INDEX/MATCH), Power Query logic, or VBA macro code. Attach screenshots for visual debugging.</div>
        </div>
        
        <div class="prompt-suggestions">
          <div class="prompt-chip" onclick="usePrompt('How to write XLOOKUP with multiple criteria?')">XLOOKUP Multi-Criteria</div>
          <div class="prompt-chip" onclick="usePrompt('Write a VBA macro to combine all worksheets into one.')">VBA Merge Worksheets</div>
          <div class="prompt-chip" onclick="usePrompt('Explain INDEX MATCH vs VLOOKUP with practical examples.')">INDEX/MATCH Guide</div>
        </div>

        <div class="controls">
          <input type="file" id="chatFileInput" style="display:none;" onchange="handleFileSelect(this)">
          <button class="action-btn" onclick="document.getElementById('chatFileInput').click()"><i class="fa-solid fa-paperclip"></i></button>
          <input type="text" id="userInput" placeholder="Ask Excel query, formula, VBA code..." onkeypress="if(event.key==='Enter') sendQuery()">
          <button class="action-btn" style="background:var(--green-excel); color:#fff; border:none;" onclick="sendQuery()"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
        <span id="selectedFileName" style="font-size: 11px; color: var(--accent-blue); padding: 0 20px 6px 20px; display: none;"></span>
      </div>

      <div id="sheets" class="tab-content">
        <div class="sheet-card-grid" id="sheetsContainer"></div>
      </div>

      <div id="admin" class="tab-content admin-panel">
        <h3 style="color: #fff; margin-bottom: 18px; font-weight: 800; font-size: 18px;">Master Key & Resource Management</h3>
        
        <div class="admin-card">
          <h4><i class="fa-solid fa-key"></i> Generate Secret Access Key</h4>
          <div class="form-group">
            <input type="text" id="newKeyVal" placeholder="NEW KEY (e.g. USER-9821)">
            <input type="text" id="newKeyLabel" placeholder="STUDENT NAME / ASSIGNED LABEL">
            <select id="newKeyMulti">
              <option value="false">Single Device Locked</option>
              <option value="true">Multi-Device Allowed</option>
            </select>
            <button class="action-btn" style="background:var(--green-excel); color:#fff; border:none;" onclick="generateKey()">Generate Key</button>
          </div>
        </div>

        <div class="admin-card">
          <h4><i class="fa-solid fa-cloud-arrow-up"></i> Upload Practice Template (.XLSX)</h4>
          <div class="form-group">
            <input type="text" id="sheetTitle" placeholder="Title (e.g. VLOOKUP Practice)">
            <input type="text" id="sheetCategory" placeholder="Category (e.g. Advanced Formulas)">
            <input type="file" id="adminSheetFile" accept=".xlsx, .xls">
            <button class="action-btn" style="background:var(--green-excel); color:#fff; border:none;" onclick="uploadAdminSheet()">Upload Template</button>
          </div>
        </div>

        <div class="admin-card">
          <h4><i class="fa-solid fa-list-check"></i> Registered Key Directory</h4>
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
      if(!keyInput) return showToast("Please enter a valid Access Key.", false);

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
          showToast("Workspace Authenticated!", true);
          document.getElementById('entry-screen').style.display = 'none';
          document.getElementById('app-container').style.display = 'flex';
          
          if(isAdminUser) {
            document.getElementById('nav-admin').style.display = 'flex';
            loadAdminKeys();
          }

          setTimeout(initLuckysheetEngine, 100);
          loadPracticeSheets();
        } else {
          showToast(data.error || "Authentication Failed", false);
        }
      });
    }

    function initLuckysheetEngine() {
      if (luckysheetInitialized) {
        if(window.luckysheet) luckysheet.resize();
        return;
      }

      luckysheet.create({
        container: 'luckysheet',
        title: 'CareerBoot Practice Canvas',
        lang: 'en',
        showtoolbar: true,
        showinfobar: false,
        showsheetbar: true,
        allowEdit: true,
        data: [{ 
          "name": "Practice Sheet 1", 
          "status": "1", 
          "data": [
            [{"v":"Product ID"},{"v":"Category"},{"v":"Units Sold"},{"v":"Revenue INR"}],
            [{"v":"CB-101"},{"v":"Software"},{"v":120},{"v":240000}],
            [{"v":"CB-102"},{"v":"Hardware"},{"v":45},{"v":135000}]
          ] 
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

      const titles = {
        'live-excel': 'Practice Sheet Canvas',
        'ai-trainer': 'CareerBoot AI Master Trainer',
        'sheets': 'Practice Content Library',
        'admin': 'Master Administrative Suite'
      };
      document.getElementById('active-tab-title').innerText = titles[tabId] || 'Workspace';

      if (tabId === 'live-excel' && window.luckysheet) {
        setTimeout(function() { luckysheet.resize(); }, 150);
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
            if(!jsonArr[r]) continue;
            for (var c = 0; c < jsonArr[r].length; c++) {
              if (jsonArr[r][c] !== undefined && jsonArr[r][c] !== null) {
                celldata.push({ r: r, c: c, v: { v: jsonArr[r][c], m: String(jsonArr[r][c]) } });
              }
            }
          }

          sheetsData.push({ name: name, status: index === 0 ? "1" : "0", celldata: celldata });
        });

        luckysheet.destroy();
        luckysheet.create({ container: 'luckysheet', title: file.name, data: sheetsData });
        switchTab('live-excel');
        showToast("Workbook imported successfully!", true);
      };
      reader.readAsArrayBuffer(file);
    }

    function loadSheetToCanvas(sheetId) {
      fetch('/api/practice-sheets/data/' + sheetId)
        .then(res => res.json())
        .then(data => {
          if(data.success && data.fileData) {
            var binaryStr = atob(data.fileData);
            var bytes = new Uint8Array(binaryStr.length);
            for (var i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            
            var workbook = XLSX.read(bytes.buffer, { type: 'array' });
            var sheetsData = [];
            workbook.SheetNames.forEach(function(name, index) {
              var worksheet = workbook.Sheets[name];
              var jsonArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              var celldata = [];
              for (var r = 0; r < jsonArr.length; r++) {
                if(!jsonArr[r]) continue;
                for (var c = 0; c < jsonArr[r].length; c++) {
                  if (jsonArr[r][c] !== undefined && jsonArr[r][c] !== null) {
                    celldata.push({ r: r, c: c, v: { v: jsonArr[r][c], m: String(jsonArr[r][c]) } });
                  }
                }
              }
              sheetsData.push({ name: name, status: index === 0 ? "1" : "0", celldata: celldata });
            });

            luckysheet.destroy();
            luckysheet.create({ container: 'luckysheet', title: data.fileName, data: sheetsData });
            switchTab('live-excel');
            showToast("Template loaded into Excel Canvas!", true);
          }
        });
    }

    function exportToExcel() {
      if(!window.luckysheet) return;
      var sheetData = luckysheet.getluckysheetfile();
      var wb = XLSX.utils.book_new();
      sheetData.forEach(function(sheet) {
        var arr = luckysheet.gettransdata(sheet.data);
        var ws = XLSX.utils.aoa_to_sheet(arr);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      XLSX.writeFile(wb, "CareerBoot_Export.xlsx");
    }

    function handleFileSelect(input) {
      var fileNameSpan = document.getElementById('selectedFileName');
      if (input.files && input.files[0]) {
        fileNameSpan.innerText = "Attachment: " + input.files[0].name;
        fileNameSpan.style.display = "block";
      } else {
        fileNameSpan.style.display = "none";
      }
    }

    function usePrompt(text) {
      document.getElementById('userInput').value = text;
      sendQuery();
    }

    async function sendQuery() {
      var input = document.getElementById('userInput');
      var fileInput = document.getElementById('chatFileInput');
      var text = input.value.trim();
      var file = fileInput.files[0];
      if (!text && !file) return;

      appendMsg(text || '[Attached Image/File]', 'user');
      input.value = '';
      fileInput.value = '';
      document.getElementById('selectedFileName').style.display = 'none';

      var loadingId = appendMsg("CareerBoot AI is thinking...", 'bot');

      var formData = new FormData();
      formData.append('userKey', currentActiveKey);
      if (text) formData.append('text', text);
      if (file) formData.append('file', file);

      try {
        var res = await fetch('/api/chat', { method: 'POST', body: formData });
        var data = await res.json();
        
        var loadingElem = document.getElementById(loadingId);
        if(loadingElem) loadingElem.remove();

        if (data.success) appendMsg(data.answer, 'bot');
        else appendMsg("Error: " + data.error, 'bot');
      } catch (err) {
        var loadingElem = document.getElementById(loadingId);
        if(loadingElem) loadingElem.remove();
        appendMsg("Connection error to server.", 'bot');
      }
    }

    function appendMsg(msg, sender) {
      var chat = document.getElementById('chat');
      var div = document.createElement('div');
      var msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      div.id = msgId;
      div.className = 'msg ' + sender;
      div.innerHTML = msg.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
      return msgId;
    }

    function loadPracticeSheets() {
      fetch('/api/practice-sheets')
        .then(res => res.json())
        .then(data => {
          if(data.success) {
            var container = document.getElementById('sheetsContainer');
            container.innerHTML = '';
            if(data.sheets.length === 0) {
              container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No practice templates found.</p>';
              return;
            }
            data.sheets.forEach(s => {
              container.innerHTML += \`
                <div class="sheet-card">
                  <h4>\${s.title}</h4>
                  <p style="color:var(--accent-blue); font-weight:600;">\${s.category}</p>
                  <p>\${s.description || 'Practice worksheet designed to improve data analytics skills.'}</p>
                  <div style="display:flex; gap:8px; margin-top:auto;">
                    <button class="load-canvas-btn" style="flex:1;" onclick="loadSheetToCanvas('\${s._id}')"><i class="fa-solid fa-play"></i> Open in Excel</button>
                    <a class="download-btn" style="flex:1;" href="/api/practice-sheets/download/\${s._id}"><i class="fa-solid fa-download"></i> Download</a>
                  </div>
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
      
      if(!key) return showToast("Provide an Access Key string.", false);

      fetch('/api/admin/create-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: currentActiveKey, key, label, isMultiDevice })
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          showToast("Access Key Created!", true);
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

      if (!title || !file) return showToast("Title and file required.", false);

      var formData = new FormData();
      formData.append('adminKey', currentActiveKey);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('sheet', file);

      fetch('/api/admin/upload-sheet', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
          if(data.success) {
            showToast("Practice Template Uploaded!", true);
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
                      \${k.boundSessionId ? 'LOCKED' : 'UNLOCKED'}
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
app.listen(PORT, () => console.log(`[SERVER ACTIVE] CareerBoot Enterprise Engine running on port ${PORT}`));
