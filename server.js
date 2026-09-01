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
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Atlas Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Error:", err));
} else {
  console.warn("WARNING: MONGO_URI environment variable missing.");
}

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

// --- 2. CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "t-for-topa/420";

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
    return res.status(400).json({ success: false, error: "Secret Key and Session Identification are required." });
  }

  try {
    const formattedKey = secretKey.trim().toUpperCase();
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

// --- 4. ADMIN PANEL ENDPOINTS ---
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

// --- 5. USER PRACTICE SHEETS & AI CHAT API ---
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

    const validKey = await SecretKey.findOne({ key: userKey, isActive: true });
    if (!validKey) return res.status(401).json({ success: false, error: "Invalid Key Session." });

    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userKey, message: text || '[File Attached]', sender: 'user' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let systemInstruction = "You are CareerBoot AI Excel Trainer. Provide comprehensive, structured Excel resources. If user requests shortcuts or formulas, output them clearly formatted inside Markdown Code Blocks categorization from A to Z (Basic to Advanced).";

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

// --- 6. ADMIN UI FRONTEND (/admin) ---
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Dashboard - CareerBoot Excel Hub</title>
  <link href="[https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap)" rel="stylesheet">
  <style>
    * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 0; }
    body { background: #070d19; color: #fff; padding: 30px 20px; display: flex; justify-content: center; }
    .admin-card { background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; width: 100%; max-width: 850px; padding: 30px; }
    h2 { color: #38bdf8; margin-bottom: 20px; text-align: center; }
    .form-group { display: flex; gap: 10px; margin-bottom: 20px; }
    input { background: #070d19; border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 12px; border-radius: 8px; flex: 1; outline: none; }
    button { background: #0284c7; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    th { background: #1e293b; color: #38bdf8; }
    .status-active { color: #10b981; font-weight: bold; }
    .status-inactive { color: #ef4444; font-weight: bold; }
    .status-bound { color: #f59e0b; font-weight: bold; }
    .btn-sm { padding: 6px 10px; font-size: 11px; margin-right: 4px; border-radius: 4px; }
    .section-title { margin-top: 30px; margin-bottom: 10px; color: #38bdf8; font-size: 16px; border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding-bottom: 6px; }
  </style>
</head>
<body>
  <div class="admin-card">
    <h2>CAREERBOOT ADMIN CONTROL PANEL</h2>
    <div class="form-group" id="auth-box">
      <input type="password" id="adminCode" placeholder="Enter Admin Passcode">
      <button onclick="authenticateAdmin()">Login as Admin</button>
    </div>
    <div id="admin-controls" style="display: none;">
      <div class="section-title">1. Secret Key Management</div>
      <div class="form-group">
        <input type="text" id="keyLabel" placeholder="Candidate Name / Description">
        <button onclick="generateKey()">Generate Secret Key</button>
      </div>
      <table>
        <thead>
          <tr><th>Secret Key</th><th>Label</th><th>Status</th><th>Bound Device</th><th>Actions</th></tr>
        </thead>
        <tbody id="keys-list"></tbody>
      </table>

      <div class="section-title">2. Upload Practice Sheets</div>
      <form id="uploadForm" class="form-group" style="flex-direction: column;">
        <input type="text" id="sheetTitle" placeholder="Sheet Title">
        <input type="text" id="sheetCategory" placeholder="Category">
        <input type="file" id="sheetFile" accept=".xlsx,.xls,.csv" required>
        <button type="button" onclick="uploadSheet()">Upload Template Sheet</button>
      </form>
    </div>
  </div>

  <script>
    function authenticateAdmin() {
      const adminCode = document.getElementById('adminCode').value;
      fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode })
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          document.getElementById('auth-box').style.display = 'none';
          document.getElementById('admin-controls').style.display = 'block';
          renderTable(data.keys);
        } else { alert("Error: " + data.error); }
      });
    }

    function generateKey() {
      const adminCode = document.getElementById('adminCode').value;
      const label = document.getElementById('keyLabel').value;
      fetch('/api/admin/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode, label })
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          document.getElementById('keyLabel').value = '';
          authenticateAdmin();
        } else alert(data.error);
      });
    }

    function toggleKey(keyId) {
      const adminCode = document.getElementById('adminCode').value;
      fetch('/api/admin/toggle-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode, keyId })
      }).then(() => authenticateAdmin());
    }

    function unbindSession(keyId) {
      const adminCode = document.getElementById('adminCode').value;
      fetch('/api/admin/reset-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode, keyId })
      }).then(() => authenticateAdmin());
    }

    function uploadSheet() {
      const adminCode = document.getElementById('adminCode').value;
      const title = document.getElementById('sheetTitle').value;
      const category = document.getElementById('sheetCategory').value;
      const fileInput = document.getElementById('sheetFile');
      if (!fileInput.files[0]) return alert("Please select a file.");

      const formData = new FormData();
      formData.append('adminCode', adminCode);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('sheetFile', fileInput.files[0]);

      fetch('/api/admin/upload-sheet', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Practice Sheet Uploaded!");
          document.getElementById('sheetTitle').value = '';
          document.getElementById('sheetCategory').value = '';
          fileInput.value = '';
        } else alert("Upload Failed: " + data.error);
      });
    }

    function renderTable(keys) {
      const tbody = document.getElementById('keys-list');
      tbody.innerHTML = '';
      keys.forEach(k => {
        const tr = document.createElement('tr');
        const boundStatus = k.boundSessionId ? '<span class="status-bound">Bound</span>' : 'Unbound';
        tr.innerHTML = \`
          <td><b style="color:#38bdf8">\${k.key}</b></td>
          <td>\${k.label}</td>
          <td class="\${k.isActive ? 'status-active' : 'status-inactive'}">\${k.isActive ? 'Active' : 'Disabled'}</td>
          <td>\${boundStatus}</td>
          <td>
            <button class="btn-sm" style="background:#334155;" onclick="toggleKey('\${k._id}')">\${k.isActive ? 'Disable' : 'Enable'}</button>
            <button class="btn-sm" style="background:#0284c7;" onclick="unbindSession('\${k._id}')">Reset Device</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }
  </script>
</body>
</html>
  `);
});

// --- 7. MAIN USER APPLICATION UI (/) ---
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareerBoot AI - Excel Hub</title>
  <link href="[https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap)" rel="stylesheet">
  <link rel="stylesheet" href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)">
  
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/pluginsCss.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/pluginsCss.css)' />
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/plugins.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/plugins.css)' />
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css)' />
  <link rel='stylesheet' href='[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/assets/iconfont/iconfont.css](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/assets/iconfont/iconfont.css)' />
  <script src="[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/plugin.js](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/plugin.js)"></script>
  <script src="[https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js](https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js)"></script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body, html { height: 100%; background: #070d19; color: #fff; overflow: hidden; }

    #entry-screen {
      height: 100vh; width: 100vw; display: flex; flex-direction: column;
      background: linear-gradient(135deg, #070d19 0%, #0f172a 100%);
    }

    .entry-top {
      height: 35vh; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid rgba(56, 189, 248, 0.15); position: relative; overflow: hidden;
    }
    .branding-box { display: flex; flex-direction: column; gap: 8px; max-width: 45%; z-index: 2; }
    .brand-svg { width: 220px; height: auto; }
    .welcome-note { color: #94a3b8; font-size: 14px; line-height: 1.5; }

    .walk-animation-container {
      width: 50%; height: 100%; display: flex; align-items: center; justify-content: space-around;
      position: relative; z-index: 2;
    }
    .stage-node { text-align: center; font-size: 12px; font-weight: 700; color: #38bdf8; }
    .path-line { flex: 1; height: 3px; background: linear-gradient(90deg, #38bdf8, #10b981); margin: 0 15px; position: relative; border-radius: 2px; }

    .walker-icon {
      position: absolute; top: -20px; left: 0%; transform: translateX(-50%);
      font-size: 24px; color: #38bdf8; animation: walkAlong 6s infinite ease-in-out;
    }
    @keyframes walkAlong {
      0% { left: 0%; color: #38bdf8; }
      50% { left: 50%; color: #f59e0b; }
      100% { left: 100%; color: #10b981; }
    }

    .entry-middle {
      height: 15vh; display: flex; justify-content: center; align-items: center;
      background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(56, 189, 248, 0.15);
    }
    .key-portal-form { display: flex; gap: 12px; width: 100%; max-width: 550px; padding: 0 20px; }
    .key-portal-input {
      flex: 1; background: #070d19; border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8; font-size: 15px; font-weight: 700; padding: 12px 18px; border-radius: 8px;
      outline: none; text-transform: uppercase; letter-spacing: 2px; text-align: center;
    }
    .key-portal-btn {
      background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none;
      padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.3s;
    }

    .entry-bottom {
      height: 50vh; padding: 24px 40px; display: flex; flex-direction: column; align-items: center; overflow-y: auto;
    }
    .bottom-title { color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 18px; }
    
    .ecosystem-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; width: 100%; max-width: 1100px;
    }
    .eco-card {
      background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px;
    }
    .eco-icon { width: 36px; height: 36px; fill: #38bdf8; }
    .eco-text h4 { font-size: 13px; color: #fff; margin-bottom: 2px; }
    .eco-text p { font-size: 11px; color: #64748b; }

    #app-container { display: none; flex: 1; height: 100vh; flex-direction: row; }
    
    sidebar { width: 260px; background: #0f172a; border-right: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; }
    .sidebar-header { padding: 20px; font-weight: 800; color: #38bdf8; font-size: 17px; border-bottom: 1px solid rgba(56, 189, 248, 0.1); }
    .nav-links { list-style: none; padding: 15px 10px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
    .nav-item { padding: 10px 14px; border-radius: 8px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 10px; font-size: 13px; transition: 0.2s; }
    .nav-item:hover, .nav-item.active { background: #0284c7; color: #fff; }

    main { flex: 1; display: flex; flex-direction: column; background: #070d19; overflow-y: auto; }
    header { background: #0f172a; padding: 16px 24px; border-bottom: 1px solid rgba(56, 189, 248, 0.2); display: flex; justify-content: space-between; align-items: center; }

    .tab-content { display: none; padding: 24px; height: 100%; }
    .tab-content.active { display: flex; flex-direction: column; }

    .chat-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .msg { max-width: 85%; padding: 14px 18px; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    .msg.bot { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.2); align-self: flex-start; }
    .msg.user { background: #0284c7; align-self: flex-end; }
    
    /* CODE BOX STYLING FOR AI RESPONSES */
    .msg pre {
      background: #030712; border: 1px solid #38bdf8; border-radius: 8px;
      padding: 12px; margin-top: 10px; font-family: monospace; font-size: 13px;
      color: #38bdf8; overflow-x: auto; white-space: pre;
    }

    /* QUICK ACTION BUTTONS BAR */
    .quick-actions {
      display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 20px;
      background: #0f172a; border-bottom: 1px solid rgba(56, 189, 248, 0.15);
    }
    .action-btn {
      background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8; padding: 6px 12px; border-radius: 20px; font-size: 12px;
      font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px;
    }
    .action-btn:hover { background: #0284c7; color: #fff; border-color: #0284c7; }

    .controls { padding: 16px; background: #0f172a; border-top: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; gap: 10px; }
    input[type="text"] { flex: 1; background: #070d19; border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 12px; border-radius: 8px; outline: none; }
    button { background: #0284c7; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .file-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #fff; }

    table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #0f172a; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    th { background: #1e293b; color: #38bdf8; }
  </style>
</head>
<body>

  <div id="entry-screen">
    <div class="entry-top">
      <div class="branding-box">
        <svg class="brand-svg" viewBox="0 0 300 60" fill="none" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
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
      <div class="bottom-title">You are just a step away to dive into</div>
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
    <sidebar>
      <div class="sidebar-header"><i class="fa-solid fa-file-excel"></i> Excel Mastery Hub</div>
      <ul class="nav-links">
        <li class="nav-item active" onclick="switchTab('ai-trainer')"><i class="fa-solid fa-robot"></i> AI Excel Trainer</li>
        <li class="nav-item" onclick="switchTab('live-excel')"><i class="fa-solid fa-table"></i> Live Practice Screen</li>
        <li class="nav-item" onclick="switchTab('practice-sheets')"><i class="fa-solid fa-download"></i> Admin Practice Sheets</li>
      </ul>
    </sidebar>

    <main>
      <header>
        <strong id="active-tab-title" style="color: #38bdf8;">AI Excel Trainer Workspace</strong>
        <span style="font-size: 11px; color: #10b981;"><i class="fa-solid fa-shield-halved"></i> Authorized Session</span>
      </header>

      <!-- 1. AI CHAT MODULE WITH QUICK ACTION BUTTONS -->
      <div id="ai-trainer" class="tab-content active" style="padding:0;">
        
        <!-- DYNAMIC QUICK ACTION BUTTONS -->
        <div class="quick-actions">
          <button class="action-btn" onclick="triggerQuickAction('List ALL Excel Shortcut Keys from A-Z (Basic to Advanced) in a clean Code Box.')">
            <i class="fa-solid fa-keyboard"></i> A-Z All Shortcuts
          </button>
          <button class="action-btn" onclick="triggerQuickAction('List ALL Excel Formulas & Functions (Lookup, Math, Dynamic Arrays, Text) with syntax in a Code Box.')">
            <i class="fa-solid fa-calculator"></i> A-Z All Formulas
          </button>
          <button class="action-btn" onclick="triggerQuickAction('Provide top 5 Useful VBA Macro Codes (e.g., Export PDF, Auto Email, Clean Data) in Code Blocks.')">
            <i class="fa-solid fa-code"></i> Essential VBA Macros
          </button>
          <button class="action-btn" onclick="triggerQuickAction('Provide complete Excel Error Troubleshooting Guide (#N/A, #REF!, #SPILL!, #VALUE!) in Code Box.')">
            <i class="fa-solid fa-triangle-exclamation"></i> Error Solutions
          </button>
        </div>

        <div class="chat-area" id="chat">
          <div class="msg bot">Welcome! Click any of the Quick Action buttons above to instantly generate complete A-Z Shortcuts, Formulas, or VBA codes inside a Code Box, or type your own question below.</div>
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
            <input type="text" id="userInput" placeholder="Ask Excel formula, VBA macro, or click Quick Action buttons above..." onkeypress="handleKeyPress(event)">
            <button onclick="sendQuery()">Send Query</button>
          </div>
        </div>
      </div>

      <!-- 2. LIVE EXCEL PRACTICE SCREEN -->
      <div id="live-excel" class="tab-content" style="padding: 0; position: relative;">
        <div id="luckysheet" style="margin:0px;padding:0px;position:absolute;width:100%;height:100%;left:0px;top:0px;"></div>
      </div>

      <!-- 3. PRACTICE SHEETS DOWNLOAD CENTER -->
      <div id="practice-sheets" class="tab-content">
        <h2 style="color: #38bdf8;">Download Admin Practice Sheets</h2>
        <table style="margin-top: 20px;">
          <thead>
            <tr><th>Template Title</th><th>Category</th><th>File Format</th><th>Action</th></tr>
          </thead>
          <tbody id="sheets-table-body">
            <tr><td colspan="4" style="text-align:center; color:#64748b;">Loading downloadable practice sheets...</td></tr>
          </tbody>
        </table>
      </div>

    </main>
  </div>

  <script>
    var currentActiveKey = null;
    var luckysheetInitialized = false;

    function getSessionId() {
      let sid = localStorage.getItem('cb_session_id');
      if (!sid) {
        sid = 'SESS-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        localStorage.setItem('cb_session_id', sid);
      }
      return sid;
    }

    function loginWithKey() {
      const keyInput = document.getElementById('secretKeyInput').value.trim();
      if(!keyInput) return alert("Please enter your Secret Key.");

      fetch('/api/auth/key-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: keyInput, sessionId: getSessionId() })
      })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          currentActiveKey = data.userKey;
          document.getElementById('entry-screen').style.display = 'none';
          document.getElementById('app-container').style.display = 'flex';
          loadPracticeSheets();
        } else { alert(data.error || "Login Failed"); }
      });
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      
      document.getElementById(tabId).classList.add('active');
      if(window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');

      if (tabId === 'live-excel' && !luckysheetInitialized) {
        setTimeout(function() {
          luckysheet.create({
            container: 'luckysheet',
            title: 'Live MS Excel Sandbox Workspace',
            lang: 'en',
            showtoolbar: true,
            showinfobar: true,
            showsheetbar: true
          });
          luckysheetInitialized = true;
        }, 100);
      }
    }

    function loadPracticeSheets() {
      fetch('/api/practice-sheets')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const tbody = document.getElementById('sheets-table-body');
            tbody.innerHTML = '';
            if (data.sheets.length === 0) {
              tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b;">No practice sheets uploaded by admin yet.</td></tr>';
              return;
            }
            data.sheets.forEach(s => {
              const tr = document.createElement('tr');
              tr.innerHTML = \`
                <td><b>\${s.title}</b></td>
                <td><span style="color:#38bdf8">\${s.category}</span></td>
                <td>\${s.fileName.split('.').pop().toUpperCase()}</td>
                <td><a href="/api/practice-sheets/download/\${s._id}" style="color:#10b981; font-weight:bold; text-decoration:none;"><i class="fa-solid fa-download"></i> Download Sheet</a></td>
              \`;
              tbody.appendChild(tr);
            });
          }
        });
    }

    function showFileName(input) {
      if (input.files && input.files[0]) document.getElementById('fileNameDisplay').innerText = input.files[0].name;
    }

    function toggleVoice() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return alert("Voice recognition not supported.");
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      var recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.start();
      recognition.onresult = function(event) { document.getElementById('userInput').value = event.results[0][0].transcript; };
    }

    function triggerQuickAction(promptText) {
      document.getElementById('userInput').value = promptText;
      sendQuery();
    }

    function handleKeyPress(e) { if (e.key === 'Enter') sendQuery(); }

    async function sendQuery() {
      var input = document.getElementById('userInput');
      var fileInput = document.getElementById('fileInput');
      var text = input.value.trim();

      if (!text && (!fileInput.files || !fileInput.files[0])) return;

      var fileLabel = (fileInput.files && fileInput.files[0]) ? " [File: " + fileInput.files[0].name + "]" : "";
      appendMsg(text + fileLabel, 'user');

      var formData = new FormData();
      formData.append('userKey', currentActiveKey);
      formData.append('text', text);
      if (fileInput.files && fileInput.files[0]) formData.append('file', fileInput.files[0]);

      input.value = '';
      document.getElementById('fileNameDisplay').innerText = '';
      appendMsg("Generating response in Code Box...", 'bot');

      try {
        var res = await fetch('/api/chat', { method: 'POST', body: formData });
        var data = await res.json();
        
        var chat = document.getElementById('chat');
        chat.removeChild(chat.lastChild);

        if (data.success) appendMsg(data.answer, 'bot');
        else appendMsg("Error: " + data.error, 'bot');
      } catch (err) {
        appendMsg("Connection error to server.", 'bot');
      }

      fileInput.value = '';
    }

    function appendMsg(msg, sender) {
      var chat = document.getElementById('chat');
      var div = document.createElement('div');
      div.className = 'msg ' + sender;
      
      // Safe Regex without breaking string literal syntax
      let formattedMsg = msg.replace(/\\`\\`\\`([\\s\\S]*?)\\`\\`\\`/g, function(match, code) {
        return '<pre><code>' + code.trim() + '</code></pre>';
      });

      div.innerHTML = formattedMsg;
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
