import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Environment Variables
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "ADMIN123KEY";
const JWT_SECRET = process.env.JWT_SECRET || "CAREERBOOT_PROD_SECURE_KEY_2026";

// MongoDB Connection
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("MongoDB Connected Successfully"))
        .catch(err => console.error("MongoDB Connection Error:", err));
}

// Database Schemas
const KeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    deviceId: { type: String, default: null },
    boundAt: { type: Date },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    message: { type: String, required: true },
    fileUrl: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, expires: 432000 }
});

const PracticeSheetSchema = new mongoose.Schema({
    filename: String,
    data: Buffer,
    contentType: String,
    uploadedAt: { type: Date, default: Date.now }
});

const Key = mongoose.model('Key', KeySchema);
const Chat = mongoose.model('Chat', ChatSchema);
const PracticeSheet = mongoose.model('PracticeSheet', PracticeSheetSchema);

app.use(express.json({ limit: '20mb' }));

// Auth Middleware
const authMiddleware = (req, res, next) => {
    let token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized access" });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired session" });
    }
};

// --- ROUTES ---

app.post('/api/login', async (req, res) => {
    try {
        const { key, deviceSignature } = req.body;
        if (!key || !deviceSignature) {
            return res.status(400).json({ success: false, message: "Key required" });
        }

        if (key === ADMIN_SECRET) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
            return res.json({ success: true, role: 'admin', token });
        }

        const keyDoc = await Key.findOne({ key });
        if (!keyDoc) {
            return res.status(401).json({ success: false, message: "Invalid Access Key" });
        }

        if (!keyDoc.deviceId) {
            keyDoc.deviceId = deviceSignature;
            keyDoc.boundAt = new Date();
            await keyDoc.save();
        } else if (keyDoc.deviceId !== deviceSignature) {
            return res.status(403).json({ success: false, message: "This Key is registered to another device!" });
        }

        const token = jwt.sign({ key: keyDoc.key, deviceId: deviceSignature, role: 'user' }, JWT_SECRET, { expiresIn: '60d' });
        return res.json({ success: true, role: 'user', token });
    } catch (err) {
        res.status(500).json({ success: false, message: "Authentication Error" });
    }
});

app.post('/api/admin/create-key', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    try {
        await Key.create({ key: req.body.newKey.trim() });
        res.json({ success: true, message: "Key Created Successfully!" });
    } catch (err) {
        res.status(400).json({ success: false, message: "Key already exists" });
    }
});

app.post('/api/admin/delete-key', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    await Key.deleteOne({ key: req.body.key });
    res.json({ success: true, message: "Key Revoked Successfully!" });
});

app.post('/api/admin/upload-sheet', authMiddleware, upload.single('sheet'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    await PracticeSheet.deleteMany({});
    await PracticeSheet.create({
        filename: req.file.originalname,
        data: req.file.buffer,
        contentType: req.file.mimetype
    });
    res.json({ success: true, message: "Practice Sheet Published!" });
});

app.get('/api/download-sheet', authMiddleware, async (req, res) => {
    const sheet = await PracticeSheet.findOne().sort({ uploadedAt: -1 });
    if (!sheet) return res.status(404).send("No practice sheet uploaded yet.");
    res.setHeader('Content-Type', sheet.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.filename}"`);
    res.send(sheet.data);
});

app.get('/api/chat-history', authMiddleware, async (req, res) => {
    const history = await Chat.find({ deviceId: req.user.deviceId }).sort({ createdAt: 1 });
    res.json({ success: true, history });
});

// Production AI Chat Route supporting Vision Models & File Attachments
app.post('/api/chat', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { message } = req.body;
        const deviceId = req.user.deviceId;
        const attachedFile = req.file;

        if (!message && !attachedFile) {
            return res.status(400).json({ success: false, reply: "Please enter a query or upload a file." });
        }

        const systemInstruction = "You are CareerBoot's MS Excel AI Personal Trainer. Answer ONLY queries directly related to Microsoft Excel (Formulas, Shortcuts, VBA, Functions, PowerQuery, Data Analysis). Render clean Markdown tables and bold formatting. Keep responses direct, well-structured, easy to learn, and step-by-step.";

        const groqKey = process.env.GROQ_API_KEY || GROQ_API_KEY;
        if (!groqKey) {
            return res.status(500).json({ success: false, reply: "Groq API Key is not configured on server." });
        }

        let userContent = [];
        // UPDATED: Standard fully-supported Groq text model
        let selectedModel = 'llama-3.1-8b-instant';

        userContent.push({ type: 'text', text: message || "Analyze the attached context/image." });

        if (attachedFile) {
            if (attachedFile.mimetype.startsWith('image/')) {
                const base64Image = attachedFile.buffer.toString('base64');
                const imageUrl = `data:${attachedFile.mimetype};base64,${base64Image}`;
                userContent.push({
                    type: 'image_url',
                    image_url: { url: imageUrl }
                });
                // UPDATED: Active vision model for image processing
                selectedModel = 'llama-3.2-11b-vision-preview';
            } else {
                const fileText = attachedFile.buffer.toString('utf-8');
                userContent[0].text += `\n\n[Attached File Content (${attachedFile.originalname})]:\n${fileText.substring(0, 4000)}`;
            }
        }

        const apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.2
            })
        });

        const data = await apiRes.json();

        if (data.error) {
            console.error("Groq API Error:", data.error);
            return res.status(400).json({ 
                success: false, 
                reply: `AI Engine Error: ${data.error.message}` 
            });
        }

        const reply = data.choices?.[0]?.message?.content || "No response generated.";

        await Chat.create({ deviceId, role: 'user', message: message || "[File Attached]" });
        await Chat.create({ deviceId, role: 'model', message: reply });

        res.json({ success: true, reply });
    } catch (err) {
        console.error("Server Handler Error:", err);
        res.status(500).json({ success: false, reply: "Server error processing AI response." });
    }
});

// FRONTEND INTERFACE WITH PREMIUM CHAT UI & MARKDOWN PARSER
app.get('*', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CareerBoot Excel AI Trainer</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        :root {
            --primary: #10b981;
            --primary-hover: #059669;
            --bg-dark: #090d16;
            --card-dark: #131c2e;
            --border-color: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --user-msg: #1d4ed8;
            --ai-msg: #1e293b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        html, body { height: 100%; width: 100%; background-color: var(--bg-dark); color: var(--text-main); overflow: hidden; }

        .page { display: none; height: 100dvh; width: 100vw; flex-direction: column; position: relative; }
        .page.active { display: flex; }

        /* Login Interface */
        .login-top { height: 35vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; text-align: center; }
        .brand-logo { font-size: 28px; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; }
        .welcome-text { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
        
        .tracker-wrapper { width: 85%; max-width: 350px; margin-top: 25px; position: relative; }
        .tracker-line { height: 4px; background: #334155; border-radius: 2px; position: relative; width: 100%; }
        .tracker-progress { position: absolute; height: 100%; background: var(--primary); width: 0%; transition: width 2.5s ease; }
        .tracker-labels { display: flex; justify-space-between; font-size: 11px; color: var(--text-muted); margin-top: 6px; }
        .walker-avatar { position: absolute; top: -25px; left: 0%; transform: translateX(-50%); transition: left 2.5s ease; font-size: 18px; }

        .login-middle { height: 15vh; display: flex; align-items: center; justify-content: center; padding: 0 20px; }
        .input-key { width: 220px; padding: 12px; background: var(--card-dark); border: 1.5px solid var(--border-color); border-radius: 8px; color: white; text-align: center; font-size: 15px; outline: none; }
        .btn-unlock { padding: 12px 18px; background: var(--primary); border: none; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; transition: background 0.2s ease; }
        .btn-unlock:hover { background: var(--primary-hover); }

        .login-bottom { height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .typing-anim-container { width: 200px; height: 200px; }
        .status-badge { display: none; font-size: 50px; }

        /* Modern Premium Chat Header */
        .chat-header { height: 60px; background: rgba(19, 28, 46, 0.8); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--border-color); flex-shrink: 0; z-index: 10; }
        .chat-header-info { display: flex; align-items: center; gap: 10px; }
        .ai-status-dot { width: 8px; height: 8px; background: var(--primary); border-radius: 50%; box-shadow: 0 0 8px var(--primary); }
        .chat-title { font-weight: 700; font-size: 16px; color: #ffffff; letter-spacing: -0.3px; }

        /* Chat Workspace */
        .chat-body { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }
        
        .chat-row { display: flex; gap: 12px; max-width: 90%; }
        .chat-row.user { align-self: flex-end; flex-direction: row-reverse; }
        .chat-row.model { align-self: flex-start; }

        .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; font-weight: bold; }
        .avatar.user { background: var(--user-msg); color: white; }
        .avatar.model { background: var(--primary); color: white; }

        .chat-bubble { padding: 14px 18px; border-radius: 16px; font-size: 14.5px; line-height: 1.6; color: #f1f5f9; position: relative; width: 100%; overflow-x: auto; }
        .chat-row.user .chat-bubble { background: var(--user-msg); border-bottom-right-radius: 4px; }
        .chat-row.model .chat-bubble { background: var(--ai-msg); border: 1px solid var(--border-color); border-bottom-left-radius: 4px; }

        /* Dynamic Markdown Formatting Improvements */
        .chat-bubble p { margin-bottom: 10px; }
        .chat-bubble p:last-child { margin-bottom: 0; }
        .chat-bubble ul, .chat-bubble ol { margin: 8px 0 12px 20px; }
        .chat-bubble li { margin-bottom: 4px; }
        .chat-bubble h1, .chat-bubble h2, .chat-bubble h3 { color: var(--primary); margin: 14px 0 8px 0; font-weight: 700; }
        .chat-bubble code { background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #38bdf8; }
        .chat-bubble pre { background: #090d16; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); overflow-x: auto; margin: 10px 0; }
        .chat-bubble pre code { background: none; padding: 0; color: #e2e8f0; }

        /* Formatted Markdown Table Styling */
        .chat-bubble table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13.5px; overflow-x: auto; display: block; }
        .chat-bubble th, .chat-bubble td { border: 1px solid var(--border-color); padding: 8px 12px; text-align: left; }
        .chat-bubble th { background: #0f172a; color: var(--primary); font-weight: 600; }
        .chat-bubble tr:nth-child(even) { background: rgba(255,255,255,0.02); }

        /* Quick Action Bar */
        .pinned-bar { display: flex; gap: 8px; padding: 10px 16px; overflow-x: auto; background: var(--bg-dark); flex-shrink: 0; border-top: 1px solid var(--border-color); }
        .chip-btn { background: var(--card-dark); border: 1px solid var(--border-color); padding: 7px 14px; border-radius: 20px; font-size: 12px; color: var(--text-muted); cursor: pointer; white-space: nowrap; transition: all 0.2s ease; }
        .chip-btn:hover { border-color: var(--primary); color: white; background: #1a263d; }

        /* Bottom Input Bar */
        .chat-input-wrapper { padding: 12px 16px; background: var(--bg-dark); flex-shrink: 0; }
        .chat-input-container { background: var(--card-dark); border: 1px solid var(--border-color); border-radius: 24px; padding: 6px 14px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .chat-input-container:focus-within { border-color: var(--primary); }
        .chat-input { flex: 1; background: transparent; border: none; padding: 10px 4px; color: white; font-size: 14.5px; outline: none; }
        .icon-btn { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; padding: 6px; border-radius: 50%; transition: color 0.2s ease; display: flex; align-items: center; justify-content: center; }
        .icon-btn:hover { color: white; background: rgba(255,255,255,0.05); }
        .send-btn { background: var(--primary); border: none; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s ease; }
        .send-btn:active { transform: scale(0.92); }

        /* File Attachment Preview Bar */
        .attachment-preview { display: none; padding: 6px 12px; background: #1e293b; border-radius: 8px; margin-bottom: 8px; font-size: 12px; align-items: center; justify-content: space-between; color: var(--primary); }

        /* Drawer Overlay & Menus */
        .drawer-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 99; }
        .drawer-menu { position: fixed; right: -280px; top: 0; width: 260px; height: 100%; background: var(--card-dark); transition: right 0.3s ease; z-index: 100; padding: 24px; display: flex; flex-direction: column; gap: 15px; border-left: 1px solid var(--border-color); }
        .drawer-menu.open { right: 0; }

        .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 200; justify-content: center; align-items: center; }
        .modal-box { background: var(--card-dark); padding: 24px; border-radius: 16px; width: 85%; max-width: 320px; text-align: center; border: 1px solid var(--border-color); }
    </style>
</head>
<body>

    <div id="page1" class="page active">
        <div class="login-top">
            <div class="brand-logo">CareerBoot</div>
            <div class="welcome-text">Excel AI Trainer Portal</div>
            <div class="tracker-wrapper">
                <div class="walker-avatar" id="walker">🚶</div>
                <div class="tracker-line"><div class="tracker-progress" id="progressBar"></div></div>
                <div class="tracker-labels"><span>Interest</span><span>Success</span></div>
            </div>
        </div>

        <div class="login-middle">
            <input type="password" id="secretKey" class="input-key" placeholder="Enter Secret Key">
            <button class="btn-unlock" onclick="executeUnlockProcess()" style="margin-left:8px;">Unlock</button>
        </div>

        <div class="login-bottom">
            <div id="lottieContainer" class="typing-anim-container"></div>
            <div id="statusBadge" class="status-badge"></div>
        </div>
    </div>

    <div id="page2" class="page">
        <div class="chat-header">
            <div class="chat-header-info">
                <div class="ai-status-dot"></div>
                <div class="chat-title">CareerBoot Excel AI</div>
            </div>
            <div>
                <button class="icon-btn" onclick="fetchHistory()" title="History">📜</button>
                <button class="icon-btn" onclick="openDrawer()" title="Menu">☰</button>
            </div>
        </div>

        <div class="chat-body" id="chatBody">
            <div class="chat-row model">
                <div class="avatar model">AI</div>
                <div class="chat-bubble">Welcome! I am your <b>CareerBoot MS Excel Trainer</b>. Ask any Excel question, upload images or spreadsheets for analysis, or click a quick prompt below.</div>
            </div>
        </div>

        <div class="pinned-bar">
            <button class="chip-btn" onclick="sendQuickQuery('List top 20 essential shortcut keys in MS Excel with their usage')">⌨️ Shortcut Keys</button>
            <button class="chip-btn" onclick="sendQuickQuery('Explain top 10 important Excel formulas with simple examples')">📊 All Formulas</button>
            <button class="chip-btn" onclick="sendQuickQuery('How do I use VLOOKUP step-by-step with an example?')">🔍 VLOOKUP Guide</button>
            <button class="chip-btn" onclick="sendQuickQuery('How to create an interactive Pivot Table in Excel?')">📈 Pivot Table</button>
        </div>

        <div class="chat-input-wrapper">
            <div class="attachment-preview" id="attachmentPreview">
                <span id="attachmentName">file.png</span>
                <span style="cursor:pointer;" onclick="clearAttachment()">✖</span>
            </div>
            <div class="chat-input-container">
                <input type="file" id="fileInput" style="display: none;" onchange="handleFileSelect(event)">
                <button class="icon-btn" onclick="document.getElementById('fileInput').click()" title="Attach File or Image">📎</button>
                <input type="text" id="userInput" class="chat-input" placeholder="Ask Excel question or attach sheet..." onkeypress="if(event.key==='Enter') processUserQuery()">
                <button class="icon-btn" onclick="startVoiceRecognition()" title="Voice Input">🎤</button>
                <button class="send-btn" onclick="processUserQuery()" title="Send Message">➤</button>
            </div>
        </div>
    </div>

    <div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>
    <div class="drawer-menu" id="drawerMenu">
        <h3 style="color: var(--primary);">Menu Options</h3>
        <button class="btn-unlock" onclick="downloadPracticeSheet()" style="width: 100%;">Download Practice Sheet</button>
        <button class="btn-unlock" onclick="logout()" style="background: #ef4444; margin-top: auto;">Logout</button>
    </div>

    <div id="adminPage" class="page" style="padding: 20px; overflow-y: auto;">
        <h2 style="color: var(--primary); margin-bottom: 20px;">Admin Panel</h2>
        <div style="background: var(--card-dark); padding: 15px; border-radius: 10px; margin-bottom: 12px; border:1px solid var(--border-color);">
            <h4>Create Access Key</h4>
            <input type="text" id="newKeyInput" class="chat-input" placeholder="New Key" style="margin-top: 8px; width: 100%; border:1px solid var(--border-color); border-radius:6px; padding:8px;">
            <button class="btn-unlock" onclick="adminCreateKey()" style="margin-top: 8px; width: 100%;">Create</button>
        </div>
        <div style="background: var(--card-dark); padding: 15px; border-radius: 10px; margin-bottom: 12px; border:1px solid var(--border-color);">
            <h4>Revoke Key</h4>
            <input type="text" id="revokeKeyInput" class="chat-input" placeholder="Key Name" style="margin-top: 8px; width: 100%; border:1px solid var(--border-color); border-radius:6px; padding:8px;">
            <button class="btn-unlock" onclick="adminDeleteKey()" style="background: #ef4444; margin-top: 8px; width: 100%;">Delete</button>
        </div>
        <div style="background: var(--card-dark); padding: 15px; border-radius: 10px; border:1px solid var(--border-color);">
            <h4>Upload Practice Sheet</h4>
            <input type="file" id="adminSheetFile" style="margin-top: 8px;">
            <button class="btn-unlock" onclick="adminUploadSheet()" style="margin-top: 8px; width: 100%;">Upload Sheet</button>
        </div>
    </div>

    <div class="modal-overlay" id="modalOverlay">
        <div class="modal-box">
            <p id="modalMessage" style="font-size: 14px; margin-bottom: 15px;"></p>
            <button class="btn-unlock" onclick="closeModal()" style="width: 100%;">OK</button>
        </div>
    </div>

    <script>
        let jwtToken = localStorage.getItem('jwt_token') || null;
        let userRole = localStorage.getItem('user_role') || null;
        let selectedFile = null;

        marked.setOptions({
            gfm: true,
            breaks: true
        });

        function getDeviceSignature() {
            let sig = localStorage.getItem('cb_device_sig');
            if(!sig) {
                sig = 'CB-' + Math.random().toString(36).substring(2) + '-' + Date.now();
                localStorage.setItem('cb_device_sig', sig);
            }
            return sig;
        }

        window.addEventListener('load', () => {
            setTimeout(() => {
                document.getElementById('walker').style.left = '35%';
                document.getElementById('progressBar').style.width = '35%';
            }, 300);
            
            bodymovin.loadAnimation({
                container: document.getElementById('lottieContainer'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: 'https://assets5.lottiefiles.com/packages/lf20_fcfjwiyb.json'
            });
        });

        function showModal(msg) {
            document.getElementById('modalMessage').innerText = msg;
            document.getElementById('modalOverlay').style.display = 'flex';
        }
        function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (file) {
                selectedFile = file;
                document.getElementById('attachmentName').innerText = "📎 " + file.name;
                document.getElementById('attachmentPreview').style.display = 'flex';
            }
        }

        function clearAttachment() {
            selectedFile = null;
            document.getElementById('fileInput').value = '';
            document.getElementById('attachmentPreview').style.display = 'none';
        }

        async function executeUnlockProcess() {
            const key = document.getElementById('secretKey').value.trim();
            if(!key) return showModal("Enter Secret Key");

            const statusBadge = document.getElementById('statusBadge');
            const lottieContainer = document.getElementById('lottieContainer');

            statusBadge.style.display = 'none';
            lottieContainer.style.display = 'block';

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key, deviceSignature: getDeviceSignature() })
                });

                const data = await res.json();

                setTimeout(() => {
                    lottieContainer.style.display = 'none';
                    statusBadge.style.display = 'block';

                    if(data.success) {
                        statusBadge.innerText = '👍🏻';
                        jwtToken = data.token;
                        userRole = data.role;
                        localStorage.setItem('jwt_token', jwtToken);
                        localStorage.setItem('user_role', userRole);

                        setTimeout(() => {
                            document.getElementById('page1').classList.remove('active');
                            if(data.role === 'admin') {
                                document.getElementById('adminPage').classList.add('active');
                            } else {
                                document.getElementById('page2').classList.add('active');
                                fetchHistory();
                            }
                        }, 1000);
                    } else {
                        statusBadge.innerText = '🙅‍♂️';
                        setTimeout(() => { showModal(data.message); }, 500);
                    }
                }, 2000);

            } catch (err) {
                showModal("Network Connection Error");
            }
        }

        async function processUserQuery() {
            const input = document.getElementById('userInput');
            const chatBody = document.getElementById('chatBody');

            const query = input.value.trim();
            if(!query && !selectedFile) return;

            let fileInfoHtml = selectedFile ? '<br><small style="opacity:0.8;">📎 Attached: ' + selectedFile.name + '</small>' : '';
            let userDisplayHtml = query + fileInfoHtml;

            const userRow = document.createElement('div');
            userRow.className = 'chat-row user';
            userRow.innerHTML = '<div class="avatar user">U</div><div class="chat-bubble">' + userDisplayHtml + '</div>';
            chatBody.appendChild(userRow);

            input.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;

            const formData = new FormData();
            formData.append('message', query);
            if(selectedFile) {
                formData.append('file', selectedFile);
            }

            clearAttachment();

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 
                        'Authorization': 'Bearer ' + jwtToken 
                    },
                    body: formData
                });
                const data = await res.json();
                
                const parsedReply = marked.parse(data.reply);
                const aiRow = document.createElement('div');
                aiRow.className = 'chat-row model';
                aiRow.innerHTML = '<div class="avatar model">AI</div><div class="chat-bubble">' + parsedReply + '</div>';
                chatBody.appendChild(aiRow);

                chatBody.scrollTop = chatBody.scrollHeight;
            } catch (err) {
                const errRow = document.createElement('div');
                errRow.className = 'chat-row model';
                errRow.innerHTML = '<div class="avatar model">AI</div><div class="chat-bubble">Connection error. Please try again.</div>';
                chatBody.appendChild(errRow);
            }
        }

        function sendQuickQuery(text) { document.getElementById('userInput').value = text; processUserQuery(); }

        function startVoiceRecognition() {
            if(!('webkitSpeechRecognition' in window)) return showModal("Speech recognition not supported in this browser");
            const recognition = new webkitSpeechRecognition();
            recognition.onresult = (e) => { document.getElementById('userInput').value = e.results[0][0].transcript; };
            recognition.start();
        }

        function openDrawer() { document.getElementById('drawerOverlay').style.display = 'block'; document.getElementById('drawerMenu').classList.add('open'); }
        function closeDrawer() { document.getElementById('drawerOverlay').style.display = 'none'; document.getElementById('drawerMenu').classList.remove('open'); }

        function downloadPracticeSheet() {
            window.open('/api/download-sheet?token=' + jwtToken, '_blank');
        }

        function logout() {
            localStorage.clear();
            location.reload();
        }

        async function fetchHistory() {
            try {
                const res = await fetch('/api/chat-history', {
                    headers: { 'Authorization': 'Bearer ' + jwtToken }
                });
                const data = await res.json();
                if(data.success && data.history.length > 0) {
                    const chatBody = document.getElementById('chatBody');
                    chatBody.innerHTML = '';
                    data.history.forEach(item => {
                        const avatarText = item.role === 'user' ? 'U' : 'AI';
                        const bubbleContent = item.role === 'model' ? marked.parse(item.message) : item.message;
                        
                        const row = document.createElement('div');
                        row.className = 'chat-row ' + item.role;
                        row.innerHTML = '<div class="avatar ' + item.role + '">' + avatarText + '</div><div class="chat-bubble">' + bubbleContent + '</div>';
                        chatBody.appendChild(row);
                    });
                    chatBody.scrollTop = chatBody.scrollHeight;
                }
            } catch (e) {
                console.log("History sync error");
            }
        }

        async function adminCreateKey() {
            const newKey = document.getElementById('newKeyInput').value.trim();
            if(!newKey) return showModal("Enter Key Name");
            const res = await fetch('/api/admin/create-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
                body: JSON.stringify({ newKey })
            });
            const data = await res.json();
            showModal(data.message);
        }

        async function adminDeleteKey() {
            const key = document.getElementById('revokeKeyInput').value.trim();
            if(!key) return showModal("Enter Key Name");
            const res = await fetch('/api/admin/delete-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
                body: JSON.stringify({ key })
            });
            const data = await res.json();
            showModal(data.message);
        }

        async function adminUploadSheet() {
            const file = document.getElementById('adminSheetFile').files[0];
            if(!file) return showModal("Select file first");
            const formData = new FormData();
            formData.append('sheet', file);

            const res = await fetch('/api/admin/upload-sheet', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + jwtToken },
                body: formData
            });
            const data = await res.json();
            showModal(data.message);
        }
    </script>
</body>
</html>
    `);
});

// Server Initialization
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
