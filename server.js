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

// Production Groq AI Route with Auto-Fallback Models
app.post('/api/chat', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { message } = req.body;
        const deviceId = req.user.deviceId;

        if (!message) return res.status(400).json({ success: false, reply: "Please enter a query." });

        const systemInstruction = "You are CareerBoot's MS Excel AI Personal Trainer. Answer ONLY queries directly related to Microsoft Excel (Formulas, Shortcuts, VBA, Functions, PowerQuery, Data Analysis). Format your responses cleanly using Markdown (bold text for formulas, lists for step-by-step guides, tables for comparisons, and code blocks for formulas/VBA). Keep responses direct, well-structured, easy to read, and modern.";

        const groqKey = process.env.GROQ_API_KEY || GROQ_API_KEY;

        if (!groqKey) {
            return res.status(500).json({ success: false, reply: "Groq API Key is not configured on server." });
        }

        // Complete list of fallback models
        const MODELS_TO_TRY = [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'llama3-70b-8192',
            'llama3-8b-8192',
            'mixtral-8x7b-32768',
            'gemma2-9b-it'
        ];

        let reply = null;
        let lastError = null;

        for (const modelName of MODELS_TO_TRY) {
            try {
                const apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqKey.trim()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: message }
                        ],
                        temperature: 0.3
                    })
                });

                const data = await apiRes.json();

                if (apiRes.ok && data.choices?.[0]?.message?.content) {
                    reply = data.choices[0].message.content;
                    console.log(`Success with model: ${modelName}`);
                    break;
                } else {
                    console.warn(`Model ${modelName} failed:`, data.error?.message || "Unknown error");
                    lastError = data.error?.message;
                }
            } catch (err) {
                console.warn(`Fetch error for model ${modelName}:`, err.message);
                lastError = err.message;
            }
        }

        if (!reply) {
            return res.status(500).json({ 
                success: false, 
                reply: `All AI models failed to respond. Last error: ${lastError}` 
            });
        }

        await Chat.create({ deviceId, role: 'user', message: message });
        await Chat.create({ deviceId, role: 'model', message: reply });

        res.json({ success: true, reply });
    } catch (err) {
        console.error("Server Handler Error:", err);
        res.status(500).json({ success: false, reply: "Server error processing AI response." });
    }
});

// FRONTEND INTERFACE
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
            --bg-dark: #0f172a;
            --card-dark: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --user-msg: #2563eb;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        html, body { height: 100%; width: 100%; background-color: var(--bg-dark); color: var(--text-main); overflow: hidden; }

        .page { display: none; height: 100dvh; width: 100vw; flex-direction: column; position: relative; }
        .page.active { display: flex; }

        .login-top { height: 35vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; text-align: center; }
        .brand-logo { font-size: 26px; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; }
        .welcome-text { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
        
        .tracker-wrapper { width: 85%; max-width: 350px; margin-top: 25px; position: relative; }
        .tracker-line { height: 4px; background: #334155; border-radius: 2px; position: relative; width: 100%; }
        .tracker-progress { position: absolute; height: 100%; background: var(--primary); width: 0%; transition: width 2.5s ease; }
        .tracker-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 6px; }
        .walker-avatar { position: absolute; top: -25px; left: 0%; transform: translateX(-50%); transition: left 2.5s ease; font-size: 18px; }

        .login-middle { height: 15vh; display: flex; align-items: center; justify-content: center; padding: 0 20px; }
        .input-key { width: 220px; padding: 12px; background: var(--card-dark); border: 1.5px solid #334155; border-radius: 8px; color: white; text-align: center; font-size: 15px; outline: none; }
        .btn-unlock { padding: 12px 18px; background: var(--primary); border: none; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; margin-left: 8px; }

        .login-bottom { height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .typing-anim-container { width: 200px; height: 200px; }
        .status-badge { display: none; font-size: 50px; }

        .chat-header { height: 55px; background: var(--card-dark); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #334155; flex-shrink: 0; }
        .chat-title { font-weight: 700; font-size: 15px; color: var(--primary); }

        .chat-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        
        .chat-bubble { max-width: 90%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.6; word-wrap: break-word; }
        .chat-bubble.user { background: var(--user-msg); align-self: flex-end; white-space: pre-wrap; }
        .chat-bubble.model { background: var(--card-dark); align-self: flex-start; border: 1px solid #334155; }

        /* Modern Markdown Formatting */
        .chat-bubble.model h1, .chat-bubble.model h2, .chat-bubble.model h3 { color: var(--primary); margin-top: 10px; margin-bottom: 6px; }
        .chat-bubble.model h1 { font-size: 18px; }
        .chat-bubble.model h2 { font-size: 16px; }
        .chat-bubble.model h3 { font-size: 14px; }
        .chat-bubble.model p { margin-bottom: 8px; }
        .chat-bubble.model ul, .chat-bubble.model ol { margin-left: 20px; margin-bottom: 8px; }
        .chat-bubble.model li { margin-bottom: 4px; }
        .chat-bubble.model code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #38bdf8; }
        .chat-bubble.model pre { background: #0f172a; padding: 10px; border-radius: 8px; overflow-x: auto; margin: 8px 0; border: 1px solid #334155; }
        .chat-bubble.model pre code { background: none; padding: 0; color: #f1f5f9; }
        .chat-bubble.model table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 13px; }
        .chat-bubble.model th, .chat-bubble.model td { border: 1px solid #334155; padding: 6px 10px; text-align: left; }
        .chat-bubble.model th { background: #0f172a; color: var(--primary); }

        .pinned-bar { display: flex; gap: 8px; padding: 8px 12px; overflow-x: auto; background: var(--bg-dark); flex-shrink: 0; border-top: 1px solid #1e293b; }
        .chip-btn { background: var(--card-dark); border: 1px solid #334155; padding: 6px 12px; border-radius: 16px; font-size: 12px; color: var(--text-muted); cursor: pointer; white-space: nowrap; }

        .chat-input-container { min-height: 60px; padding: 8px 12px; background: var(--card-dark); border-top: 1px solid #334155; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .chat-input { flex: 1; background: var(--bg-dark); border: 1px solid #334155; padding: 10px 12px; border-radius: 8px; color: white; font-size: 14px; outline: none; }
        .icon-btn { background: none; border: none; color: var(--text-main); font-size: 18px; cursor: pointer; padding: 4px; }

        .drawer-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99; }
        .drawer-menu { position: fixed; right: -280px; top: 0; width: 260px; height: 100%; background: var(--card-dark); transition: right 0.3s ease; z-index: 100; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
        .drawer-menu.open { right: 0; }

        .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 200; justify-content: center; align-items: center; }
        .modal-box { background: var(--card-dark); padding: 20px; border-radius: 12px; width: 80%; max-width: 300px; text-align: center; }
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
            <button class="btn-unlock" onclick="executeUnlockProcess()">Unlock</button>
        </div>

        <div class="login-bottom">
            <div id="lottieContainer" class="typing-anim-container"></div>
            <div id="statusBadge" class="status-badge"></div>
        </div>
    </div>

    <div id="page2" class="page">
        <div class="chat-header">
            <div class="chat-title">CareerBoot Excel AI Trainer</div>
            <div>
                <button class="icon-btn" onclick="fetchHistory()">📜</button>
                <button class="icon-btn" onclick="openDrawer()">|||</button>
            </div>
        </div>

        <div class="chat-body" id="chatBody">
            <div class="chat-bubble model">Welcome! I am your CareerBoot MS Excel Trainer. Ask any Excel query or select a topic below to start learning!</div>
        </div>

        <div class="pinned-bar">
            <button class="chip-btn" onclick="sendQuickQuery('List top 20 essential shortcut keys in MS Excel with their usage')">Shortcut Keys</button>
            <button class="chip-btn" onclick="sendQuickQuery('Explain top 10 important Excel formulas with simple examples')">All Formulas</button>
            <button class="chip-btn" onclick="sendQuickQuery('How do I use VLOOKUP step-by-step with an example?')">VLOOKUP Guide</button>
            <button class="chip-btn" onclick="sendQuickQuery('How to create an interactive Pivot Table in Excel?')">Pivot Table</button>
        </div>

        <div class="chat-input-container">
            <input type="text" id="userInput" class="chat-input" placeholder="Ask Excel question..." onkeypress="if(event.key==='Enter') processUserQuery()">
            <button class="icon-btn" onclick="startVoiceRecognition()">🎤</button>
            <button class="btn-unlock" onclick="processUserQuery()" style="padding: 8px 14px;">Send</button>
        </div>
    </div>

    <div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>
    <div class="drawer-menu" id="drawerMenu">
        <h3 style="color: var(--primary);">Menu</h3>
        <button class="btn-unlock" onclick="downloadPracticeSheet()" style="width: 100%;">Download Practice Sheet</button>
        <button class="btn-unlock" onclick="logout()" style="background: #ef4444; margin-top: auto;">Logout</button>
    </div>

    <div id="adminPage" class="page" style="padding: 20px; overflow-y: auto;">
        <h2 style="color: var(--primary); margin-bottom: 20px;">Admin Panel</h2>
        <div style="background: var(--card-dark); padding: 15px; border-radius: 10px; margin-bottom: 12px;">
            <h4>Create Access Key</h4>
            <input type="text" id="newKeyInput" class="chat-input" placeholder="New Key" style="margin-top: 8px; width: 100%;">
            <button class="btn-unlock" onclick="adminCreateKey()" style="margin-top: 8px; width: 100%;">Create</button>
        </div>
        <div style="background: var(--card-dark); padding: 15px; border-radius: 10px; margin-bottom: 12px;">
            <h4>Revoke Key</h4>
            <input type="text" id="revokeKeyInput" class="chat-input" placeholder="Key Name" style="margin-top: 8px; width: 100%;">
            <button class="btn-unlock" onclick="adminDeleteKey()" style="background: #ef4444; margin-top: 8px; width: 100%;">Delete</button>
        </div>
        <div style="background: var(--card-dark); padding: 15px; border-radius: 10px;">
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

        function getDeviceSignature() {
            let sig = localStorage.getItem('cb_device_sig');
            if(!sig) {
                sig = 'CB-' + Math.random().toString(36).substring(2) + '-' + Date.now();
                localStorage.setItem('cb_device_sig', sig);
            }
            return sig;
        }

        function formatMessage(content, role) {
            if (role === 'model') {
                return typeof marked !== 'undefined' ? marked.parse(content) : content;
            }
            return content;
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
            if(!query) return;

            const userDiv = document.createElement('div');
            userDiv.className = 'chat-bubble user';
            userDiv.textContent = query;
            chatBody.appendChild(userDiv);

            input.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + jwtToken 
                    },
                    body: JSON.stringify({ message: query })
                });
                const data = await res.json();

                const modelDiv = document.createElement('div');
                modelDiv.className = 'chat-bubble model';
                modelDiv.innerHTML = formatMessage(data.reply, 'model');
                chatBody.appendChild(modelDiv);
                
                chatBody.scrollTop = chatBody.scrollHeight;
            } catch (err) {
                const errDiv = document.createElement('div');
                errDiv.className = 'chat-bubble model';
                errDiv.textContent = "Connection error. Please try again.";
                chatBody.appendChild(errDiv);
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
                        const msgDiv = document.createElement('div');
                        msgDiv.className = `chat-bubble ${item.role}`;
                        if(item.role === 'model') {
                            msgDiv.innerHTML = formatMessage(item.message, 'model');
                        } else {
                            msgDiv.textContent = item.message;
                        }
                        chatBody.appendChild(msgDiv);
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
