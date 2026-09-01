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

// --- 6. FRONTEND APPLICATION ---
app.get('/', (req, res) => {
  const userHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>CareerBoot AI - Excel Mobile Hub</title>
  <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
    body, html { height: 100%; width: 100vw; background: #070d19; color: #fff; overflow: hidden; }

    #toast-notification {
      position: fixed; top: 15px; right: 15px; z-index: 9999;
      background: rgba(15, 23, 42, 0.95); border: 1px solid #ef4444; color: #fff;
      padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25); display: none; align-items: center; gap: 10px;
    }
    #toast-notification.success { border-color: #10b981; }

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
      background: linear-gradient(135deg, #107c41, #0f6c38); color: #fff; border: none;
      padding: 12px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; white-space: nowrap; font-size: 13px;
    }

    .entry-bottom { padding: 25px 15px; display: flex; flex-direction: column; align-items: center; }
    .bottom-title { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; font-weight: 700; }
    
    .ecosystem-grid { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 450px; }
    .eco-card {
      background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(16, 124, 65, 0.3);
      border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px;
    }
    .eco-icon { width: 28px; height: 28px; fill: #107c41; flex-shrink: 0; }
    .eco-text h4 { font-size: 13px; color: #fff; margin-bottom: 2px; font-weight: 700; }
    .eco-text p { font-size: 11px; color: #64748b; }

    #app-container { display: none; height: 100vh; width: 100vw; overflow: hidden; }

    sidebar {
      width: 250px; min-width: 250px; background: #0f172a; border-right: 1px solid rgba(56, 189, 248, 0.2);
      display: flex; flex-direction: column; transition: transform 0.3s ease; z-index: 100;
    }
    .sidebar-header { padding: 16px 20px; font-weight: 800; color: #107c41; font-size: 15px; border-bottom: 1px solid rgba(56, 189, 248, 0.1); }
    .nav-links { list-style: none; padding: 12px 10px; display: flex; flex-direction: column; gap: 6px; }
    .nav-item { padding: 10px 14px; border-radius: 8px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .nav-item:hover, .nav-item.active { background: #107c41; color: #fff; }

    main { flex: 1; display: flex; flex-direction: column; background: #070d19; height: 100vh; overflow: hidden; min-width: 0; }
    header { background: #0f172a; padding: 12px 16px; border-bottom: 1px solid rgba(56, 189, 248, 0.2); display: flex; justify-content: space-between; align-items: center; height: 50px; }

    .menu-toggle { display: none; background: transparent; border: none; color: #38bdf8; font-size: 18px; cursor: pointer; }

    .tab-content { display: none; padding: 0; height: calc(100vh - 50px); flex-direction: column; width: 100%; min-width: 0; }
    .tab-content.active { display: flex; }

    /* --- EXCEL ANDROID NATIVE RECREATION --- */
    .excel-mobile-app { display: flex; flex-direction: column; height: 100%; width: 100%; background: #181818; color: #fff; position: relative; }
    
    .excel-top-bar {
      height: 44px; background: #107c41; display: flex; align-items: center; justify-content: space-between; padding: 0 12px;
    }
    .excel-top-title { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .excel-top-actions { display: flex; gap: 14px; font-size: 16px; }

    .excel-fx-bar {
      height: 40px; background: #242424; border-bottom: 1px solid #333; display: flex; align-items: center; padding: 0 8px; gap: 8px;
    }
    .excel-cell-name { width: 45px; font-size: 12px; font-weight: 700; color: #107c41; text-align: center; border-right: 1px solid #444; }
    .excel-fx-label { font-size: 13px; font-style: italic; color: #888; }
    .excel-fx-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 13px; }

    .excel-grid-viewport {
      flex: 1; overflow: auto; position: relative; background: #1f1f1f; touch-action: manipulation;
    }

    .excel-table { border-collapse: collapse; table-layout: fixed; width: max-content; }
    .excel-table th, .excel-table td {
      border: 1px solid #333; font-size: 12px; height: 32px; text-align: left; padding: 0 6px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none;
    }
    .excel-table th { background: #2d2d2d; color: #aaa; font-weight: 600; text-align: center; position: sticky; top: 0; z-index: 10; }
    .excel-table th.row-header { position: sticky; left: 0; z-index: 20; width: 35px; min-width: 35px; background: #2d2d2d; }
    
    .excel-table td.selected { outline: 2px solid #107c41; outline-offset: -2px; background: rgba(16, 124, 65, 0.2) !important; }
    .excel-table td.editing { background: #000 !important; color: #fff; outline: 2px solid #38bdf8; }

    .excel-bottom-toolbar {
      height: 48px; background: #242424; border-top: 1px solid #333; display: flex; align-items: center; justify-content: space-around; padding: 0 10px;
    }
    .excel-tool-btn { background: transparent; border: none; color: #ccc; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; }
    .excel-tool-btn span { font-size: 9px; }
    .excel-tool-btn.active { color: #107c41; }

    /* Bottom Sheet Options Drawer */
    .excel-drawer {
      position: absolute; bottom: -250px; left: 0; width: 100%; height: 230px; background: #242424; border-top: 1px solid #444;
      transition: bottom 0.25s ease-in-out; z-index: 50; padding: 15px; display: flex; flex-direction: column; gap: 12px;
      box-shadow: 0 -10px 20px rgba(0,0,0,0.5);
    }
    .excel-drawer.open { bottom: 0; }
    .excel-drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 8px; font-weight: 700; color: #107c41; font-size: 13px; }
    .excel-drawer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .drawer-item { background: #333; border: 1px solid #444; border-radius: 8px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 11px; cursor: pointer; color: #fff; }

    .chat-area { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; width: 100%; }
    .msg { max-width: 90%; padding: 12px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5; word-break: break-word; }
    .msg.bot { background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.2); align-self: flex-start; }
    .msg.user { background: #107c41; align-self: flex-end; }
    .msg pre { background: #030712; border: 1px solid #107c41; border-radius: 8px; padding: 10px; margin-top: 8px; font-family: monospace; font-size: 12px; color: #107c41; overflow-x: auto; white-space: pre-wrap; }

    .quick-actions { display: flex; gap: 6px; overflow-x: auto; padding: 10px 15px; background: #0f172a; border-bottom: 1px solid rgba(56, 189, 248, 0.15); }
    .action-btn { background: rgba(16, 124, 65, 0.15); border: 1px solid rgba(16, 124, 65, 0.4); color: #107c41; padding: 6px 10px; border-radius: 16px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; }

    .controls { padding: 12px 15px; background: #0f172a; border-top: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; gap: 8px; width: 100%; }
    input[type="text"] { flex: 1; background: #070d19; border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 10px 12px; border-radius: 8px; outline: none; font-size: 13px; min-width: 0; }
    button { background: #107c41; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; white-space: nowrap; }

    table.ps-table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #0f172a; border-radius: 8px; overflow: hidden; }
    table.ps-table th, table.ps-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; }
    table.ps-table th { background: #1e293b; color: #107c41; }

    @media (max-width: 768px) {
      #app-container { flex-direction: column; }
      sidebar { position: fixed; top: 0; left: -260px; height: 100vh; box-shadow: 10px 0 30px rgba(0,0,0,0.8); }
      sidebar.open { transform: translateX(260px); }
      .menu-toggle { display: block; }
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
          <text x="0" y="42" fill="#107c41" font-size="30" font-weight="800">CAREERBOOT</text>
          <text x="215" y="42" fill="#38bdf8" font-size="30" font-weight="800">AI</text>
        </svg>
        <p class="welcome-note">Empowering your career growth with real-time AI Excel intelligence, practice environments, and native tools.</p>
      </div>
    </div>

    <div class="entry-middle">
      <div class="key-portal-form">
        <input type="text" id="secretKeyInput" class="key-portal-input" placeholder="ENTER SECRET KEY">
        <button class="key-portal-btn" onclick="loginWithKey()">UNLOCK HUB</button>
      </div>
    </div>

    <div class="entry-bottom">
      <div class="bottom-title">EXCEL MOBILE HUB WORKSPACE</div>
      <div class="ecosystem-grid">
        <div class="eco-card">
          <svg class="eco-icon" viewBox="0 0 24 24"><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M7,7h4v4H7V7z M13,7h4v4h-4V7z"/></svg>
          <div class="eco-text"><h4>Android Excel Engine</h4><p>Native Mobile Grid, Tap Focus & Clean Toolbar</p></div>
        </div>
      </div>
    </div>
  </div>

  <div id="app-container">
    <sidebar id="mobileSidebar">
      <div class="sidebar-header"><i class="fa-solid fa-file-excel"></i> Excel Mobile Hub</div>
      <ul class="nav-links">
        <li class="nav-item active" id="nav-live-excel" onclick="switchTab('live-excel')"><i class="fa-solid fa-table"></i> Mobile Practice Grid</li>
        <li class="nav-item" id="nav-ai-trainer" onclick="switchTab('ai-trainer')"><i class="fa-solid fa-robot"></i> AI Excel Trainer</li>
        <li class="nav-item" id="nav-practice-sheets" onclick="switchTab('practice-sheets')"><i class="fa-solid fa-download"></i> Download Templates</li>
      </ul>
    </sidebar>

    <main>
      <header>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button class="menu-toggle" onclick="toggleSidebar()"><i class="fa-solid fa-bars"></i></button>
          <strong id="active-tab-title" style="color: #107c41; font-size: 14px;">Mobile Practice Grid</strong>
        </div>
        <span style="font-size: 11px; color: #107c41;"><i class="fa-solid fa-shield-halved"></i> Ready</span>
      </header>

      <!-- EXCEL ANDROID RECREATED ENGINE -->
      <div id="live-excel" class="tab-content active">
        <div class="excel-mobile-app">
          <div class="excel-top-bar">
            <div class="excel-top-title"><i class="fa-solid fa-file-excel"></i> PracticeBook.xlsx</div>
            <div class="excel-top-actions">
              <i class="fa-solid fa-undo" onclick="showToast('Undo performed', true)"></i>
              <i class="fa-solid fa-search" onclick="showToast('Search active', true)"></i>
              <i class="fa-solid fa-ellipsis-vertical" onclick="toggleExcelDrawer()"></i>
            </div>
          </div>

          <div class="excel-fx-bar">
            <div class="excel-cell-name" id="selected-cell-ref">A1</div>
            <div class="excel-fx-label">fx</div>
            <input type="text" class="excel-fx-input" id="excel-formula-input" placeholder="Enter value or formula" oninput="updateActiveCellValue(this.value)">
          </div>

          <div class="excel-grid-viewport" id="gridViewport">
            <table class="excel-table" id="excelNativeTable">
              <!-- Dynamically Generated Clean Canvas Grid -->
            </table>
          </div>

          <div class="excel-bottom-toolbar">
            <button class="excel-tool-btn active" onclick="toggleExcelDrawer()"><i class="fa-solid fa-list"></i><span>Home</span></button>
            <button class="excel-tool-btn" onclick="applyBold()"><i class="fa-solid fa-bold"></i><span>Bold</span></button>
            <button class="excel-tool-btn" onclick="applyColor('#f59e0b')"><i class="fa-solid fa-fill-drip"></i><span>Fill</span></button>
            <button class="excel-tool-btn" onclick="autoSum()"><i class="fa-solid fa-calculator"></i><span>AutoSum</span></button>
            <button class="excel-tool-btn" onclick="toggleExcelDrawer()"><i class="fa-solid fa-chevron-up"></i><span>More</span></button>
          </div>

          <!-- Slide Drawer Options -->
          <div class="excel-drawer" id="excelDrawer">
            <div class="excel-drawer-header">
              <span>EXCEL HOME RIBBON OPTIONS</span>
              <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="toggleExcelDrawer()"></i>
            </div>
            <div class="excel-drawer-grid">
              <div class="drawer-item" onclick="applyBold()"><i class="fa-solid fa-bold"></i>Bold</div>
              <div class="drawer-item" onclick="applyColor('#ef4444')"><i class="fa-solid fa-palette"></i>Red Fill</div>
              <div class="drawer-item" onclick="applyColor('#10b981')"><i class="fa-solid fa-palette"></i>Green Fill</div>
              <div class="drawer-item" onclick="autoSum()"><i class="fa-solid fa-sigma"></i>AutoSum</div>
              <div class="drawer-item" onclick="triggerQuickAction('Explain VLOOKUP formula')"><i class="fa-solid fa-wand-magic-sparkles"></i>AI Fix</div>
              <div class="drawer-item" onclick="clearActiveCell()"><i class="fa-solid fa-eraser"></i>Clear</div>
              <div class="drawer-item" onclick="showToast('Cell borders added', true)"><i class="fa-solid fa-border-all"></i>Borders</div>
              <div class="drawer-item" onclick="toggleExcelDrawer()"><i class="fa-solid fa-check"></i>Done</div>
            </div>
          </div>
        </div>
      </div>

      <div id="ai-trainer" class="tab-content">
        <div class="quick-actions">
          <button class="action-btn" onclick="triggerQuickAction('List ALL Excel Shortcut Keys from A-Z inside Code Box.')">A-Z Shortcuts</button>
          <button class="action-btn" onclick="triggerQuickAction('List ALL Excel Formulas & Functions with syntax.')">A-Z Formulas</button>
        </div>

        <div class="chat-area" id="chat">
          <div class="msg bot">Welcome to CareerBoot AI! Ask any Excel query.</div>
        </div>

        <div class="controls">
          <div class="row">
            <input type="text" id="userInput" placeholder="Ask Excel formula, VBA macro..." onkeypress="handleKeyPress(event)">
            <button onclick="sendQuery()">Send</button>
          </div>
        </div>
      </div>

      <div id="practice-sheets" class="tab-content" style="padding: 15px; overflow-y: auto;">
        <h3 style="color: #107c41;">Download Practice Templates</h3>
        <table class="ps-table">
          <thead>
            <tr><th>Template Title</th><th>Category</th><th>Action</th></tr>
          </thead>
          <tbody id="sheets-table-body">
            <tr><td colspan="3" style="text-align:center; color:#64748b;">Loading practice sheets...</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>

  <script>
    var currentActiveKey = null;
    var activeCell = { row: 1, col: 1 };
    var gridData = {};

    // --- PREVENT MOBILE BACK BUTTON EXITS ---
    window.addEventListener('popstate', function(event) {
      if (document.getElementById('app-container').style.display === 'flex') {
        history.pushState(null, null, window.location.pathname);
        switchTab('live-excel');
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
            renderNativeExcelGrid();
            loadPracticeSheets();
          }, 600);
        } else { 
          showToast(data.error || "Login Failed"); 
        }
      });
    }

    // --- EXCEL ANDROID GRID ENGINE ---
    function renderNativeExcelGrid() {
      var table = document.getElementById('excelNativeTable');
      table.innerHTML = '';
      
      var cols = 10;
      var rows = 30;

      // Initial Preset Data
      gridData["R1C1"] = "Sales Item"; gridData["R1C2"] = "Category"; gridData["R1C3"] = "Amount (INR)";
      gridData["R2C1"] = "Q1 Revenue"; gridData["R2C2"] = "Financial"; gridData["R2C3"] = "150000";
      gridData["R3C1"] = "Marketing"; gridData["R3C2"] = "Expense"; gridData["R3C3"] = "35000";

      // Header Row
      var headerRow = document.createElement('tr');
      var cornerTh = document.createElement('th');
      cornerTh.className = "row-header";
      cornerTh.innerText = "";
      headerRow.appendChild(cornerTh);

      for (var c = 1; c <= cols; c++) {
        var th = document.createElement('th');
        th.innerText = String.fromCharCode(64 + c);
        th.style.width = "100px";
        headerRow.appendChild(th);
      }
      table.appendChild(headerRow);

      // Data Rows
      for (var r = 1; r <= rows; r++) {
        var tr = document.createElement('tr');
        var rowHd = document.createElement('td');
        rowHd.className = "row-header";
        rowHd.innerText = r;
        tr.appendChild(rowHd);

        for (var c = 1; c <= cols; c++) {
          var td = document.createElement('td');
          td.id = "cell_" + r + "_" + c;
          var key = "R" + r + "C" + c;
          td.innerText = gridData[key] || "";
          
          (function(row, col) {
            td.onclick = function() { selectCell(row, col); };
            td.ondblclick = function() { editCell(row, col); };
          })(r, c);

          tr.appendChild(td);
        }
        table.appendChild(tr);
      }

      selectCell(1, 1);
    }

    function selectCell(r, c) {
      document.querySelectorAll('.excel-table td').forEach(function(el) { el.classList.remove('selected'); });
      activeCell = { row: r, col: c };
      
      var target = document.getElementById("cell_" + r + "_" + c);
      if(target) target.classList.add('selected');

      var cellRef = String.fromCharCode(64 + c) + r;
      document.getElementById('selected-cell-ref').innerText = cellRef;
      
      var val = gridData["R" + r + "C" + c] || "";
      document.getElementById('excel-formula-input').value = val;
    }

    function updateActiveCellValue(val) {
      var key = "R" + activeCell.row + "C" + activeCell.col;
      gridData[key] = val;
      var target = document.getElementById("cell_" + activeCell.row + "_" + activeCell.col);
      if(target) target.innerText = val;
    }

    function toggleExcelDrawer() {
      document.getElementById('excelDrawer').classList.toggle('open');
    }

    function applyBold() {
      var target = document.getElementById("cell_" + activeCell.row + "_" + activeCell.col);
      if(target) {
        target.style.fontWeight = target.style.fontWeight === 'bold' ? 'normal' : 'bold';
      }
    }

    function applyColor(hex) {
      var target = document.getElementById("cell_" + activeCell.row + "_" + activeCell.col);
      if(target) target.style.background = hex;
    }

    function clearActiveCell() {
      updateActiveCellValue("");
    }

    function autoSum() {
      updateActiveCellValue("=SUM(C2:C3)");
      showToast("AutoSum applied", true);
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
      
      document.getElementById(tabId).classList.add('active');
      var activeNav = document.getElementById('nav-' + tabId);
      if(activeNav) activeNav.classList.add('active');

      document.getElementById('mobileSidebar').classList.remove('open');
    }

    function loadPracticeSheets() {
      fetch('/api/practice-sheets')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success) {
            var tbody = document.getElementById('sheets-table-body');
            tbody.innerHTML = '';
            if (data.sheets.length === 0) {
              tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#64748b;">No sheets available.</td></tr>';
              return;
            }
            data.sheets.forEach(function(s) {
              var tr = document.createElement('tr');
              tr.innerHTML = '<td><b>' + s.title + '</b></td>' +
                '<td><span style="color:#107c41">' + s.category + '</span></td>' +
                '<td><a href="/api/practice-sheets/download/' + s._id + '" style="color:#10b981; font-weight:bold; text-decoration:none;"><i class="fa-solid fa-download"></i> Download</a></td>';
              tbody.appendChild(tr);
            });
          }
        });
    }

    function triggerQuickAction(promptText) {
      switchTab('ai-trainer');
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
app.listen(PORT, () => console.log(`CareerBoot Excel Server running on port ${PORT}`));
