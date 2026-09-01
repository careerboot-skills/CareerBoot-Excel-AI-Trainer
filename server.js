import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

// Environment Configurations
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "SUPER_SECURE_ADMIN_KEY_2026";
const JWT_SECRET = process.env.JWT_SECRET || "JWT_CAREERBOOT_SECRET_KEY_PROD";

// Database Connection
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI Environment Variable Missing!");
}
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Production Database Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Failed:", err));

// Database Schemas
const KeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    deviceId: { type: String, default: null },
    boundAt: { type: Date },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 432000 } // Auto-delete in 120 Hours (5 Days)
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

// Gemini AI Config
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are the official CareerBoot MS Excel AI Personal Trainer.
    STRICT RULES:
    1. You MUST ONLY answer questions directly related to Microsoft Excel (Formulas, Functions, Shortcuts, VBA, Macros, Data Analysis, Dashboards, Power Query, Charting).
    2. If a query is NOT about MS Excel (e.g., general programming, history, coding in Python, cooking, general knowledge), decline politely: "I am trained exclusively as a CareerBoot MS Excel AI Trainer. Please ask any questions related to Microsoft Excel!"
    3. Keep answers concise, highly practical, formatted in clean Markdown with step-by-step instructions and bold key shortcuts/formulas.`
});

app.use(express.json({ limit: '20mb' }));

// Middleware: Authenticate Session
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized access" });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired session" });
    }
};

// --- API ENDPOINTS ---

// 1. Secret Key Login & Single Device Lock
app.post('/api/login', async (req, res) => {
    try {
        const { key, deviceSignature } = req.body;
        if (!key || !deviceSignature) {
            return res.status(400).json({ success: false, message: "Key & Device verification required" });
        }

        if (key === ADMIN_SECRET) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
            return res.json({ success: true, role: 'admin', token });
        }

        const keyDoc = await Key.findOne({ key });
        if (!keyDoc) {
            return res.status(401).json({ success: false, message: "Incorrect Secret Key. Check and try again." });
        }

        if (!keyDoc.deviceId) {
            keyDoc.deviceId = deviceSignature;
            keyDoc.boundAt = new Date();
            await keyDoc.save();
        } else if (keyDoc.deviceId !== deviceSignature) {
            return res.status(403).json({ 
                success: false, 
                message: "Security Lock: This Key is already registered & locked to another device!" 
            });
        }

        const token = jwt.sign({ key: keyDoc.key, deviceId: deviceSignature, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({ success: true, role: 'user', token });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server authentication error" });
    }
});

// 2. Admin - Generate User Keys
app.post('/api/admin/create-key', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    const { newKey } = req.body;
    try {
        await Key.create({ key: newKey.trim() });
        res.json({ success: true, message: `Key '${newKey}' created successfully.` });
    } catch (err) {
        res.status(400).json({ success: false, message: "Key already exists in system!" });
    }
});

// 3. Admin - Delete Key
app.post('/api/admin/delete-key', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    const { key } = req.body;
    await Key.deleteOne({ key });
    res.json({ success: true, message: "Key removed successfully." });
});

// 4. Admin - Upload Practice File
app.post('/api/admin/upload-sheet', authMiddleware, upload.single('sheet'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    await PracticeSheet.deleteMany({}); // Keep only latest sheet
    await PracticeSheet.create({
        filename: req.file.originalname,
        data: req.file.buffer,
        contentType: req.file.mimetype
    });
    res.json({ success: true, message: "New Practice Sheet published!" });
});

// 5. User - Download Practice Sheet
app.get('/api/download-sheet', authMiddleware, async (req, res) => {
    const sheet = await PracticeSheet.findOne().sort({ uploadedAt: -1 });
    if (!sheet) return res.status(404).send("No active practice sheet uploaded by Admin.");
    res.setHeader('Content-Type', sheet.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.filename}"`);
    res.send(sheet.data);
});

// 6. User - Chat History
app.get('/api/chat-history', authMiddleware, async (req, res) => {
    const history = await Chat.find({ deviceId: req.user.deviceId }).sort({ createdAt: 1 });
    res.json({ success: true, history });
});

// 7. Gemini AI Chat Interface
app.post('/api/chat', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { message } = req.body;
        const deviceId = req.user.deviceId;

        let contents = [];
        if (req.file) {
            contents.push({
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype
                }
            });
        }
        if (message) contents.push(message);

        const result = await model.generateContent(contents);
        const reply = result.response.text();

        // Save Chat to DB
        await Chat.create({ deviceId, role: 'user', message: message || '[Uploaded Media/Document]' });
        await Chat.create({ deviceId, role: 'model', message: reply });

        res.json({ success: true, reply });
    } catch (err) {
        res.status(500).json({ success: false, reply: "AI Processing Error. Please try again with Excel queries." });
    }
});

// FRONTEND APPLICATION (Single Page Application)
app.get('*', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CareerBoot Excel AI Trainer</title>
    <!-- Lottie Web Animation Engine -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
    <style>
        :root {
            --primary: #10b981;
            --primary-dark: #059669;
            --bg-dark: #0f172a;
            --card-dark: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --user-msg: #2563eb;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        body { background-color: var(--bg-dark); color: var(--text-main); height: 100vh; overflow: hidden; }

        .page { display: none; height: 100vh; width: 100vw; flex-direction: column; position: relative; }
        .page.active { display: flex; }

        /* Login Layout */
        .login-top { height: 35vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; text-align: center; }
        .brand-logo { font-size: 24px; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
        .welcome-text { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
        
        .tracker-wrapper { width: 85%; max-width: 380px; margin-top: 25px; position: relative; }
        .tracker-line { height: 4px; background: #334155; border-radius: 2px; position: relative; width: 100%; }
        .tracker-progress { position: absolute; height: 100%; background: var(--primary); width: 0%; transition: width 2.5s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 2px; }
        .tracker-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 6px; font-weight: 600; text-transform: uppercase; }
        .walker-avatar { position: absolute; top: -28px; left: 0%; transform: translateX(-50%); transition: left 2.5s cubic-bezier(0.4, 0, 0.2, 1); font-size: 20px; }

        .login-middle { height: 15vh; display: flex; align-items: center; justify-content: center; padding: 0 20px; }
        .key-box { width: 100%; max-width: 380px; display: flex; gap: 8px; }
        .input-key { flex: 1; padding: 14px; background: var(--card-dark); border: 1.5px solid #334155; border-radius: 10px; color: white; text-align: center; font-size: 16px; font-weight: 600; letter-spacing: 1px; outline: none; transition: border 0.3s; }
        .input-key:focus { border-color: var(--primary); }
        .btn-unlock { padding: 14px 22px; background: var(--primary); border: none; border-radius: 10px; color: white; font-weight: 700; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .btn-unlock:active { background: var(--primary-dark); }

        .login-bottom { height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
        .typing-anim-container { width: 220px; height: 220px; }
        .status-badge { display: none; font-size: 40px; margin-top: 10px; animation: popIn 0.3s ease-out; }

        /* Chat Layout */
        .chat-header { height: 60px; background: var(--card-dark); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #334155; }
        .chat-title { font-weight: 700; font-size: 16px; color: var(--primary); }
        .chat-actions { display: flex; gap: 12px; }
        .icon-btn { background: none; border: none; color: var(--text-main); font-size: 20px; cursor: pointer; }

        .chat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .chat-bubble { max-width: 82%; padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
        .chat-bubble.user { background: var(--user-msg); align-self: flex-end; border-bottom-right-radius: 2px; }
        .chat-bubble.model { background: var(--card-dark); align-self: flex-start; border-bottom-left-radius: 2px; border: 1px solid #334155; }

        .pinned-bar { display: flex; gap: 8px; padding: 8px 16px; overflow-x: auto; background: rgba(15,23,42,0.8); }
        .chip-btn { background: var(--card-dark); border: 1px solid #334155; padding: 6px 12px; border-radius: 20px; font-size: 12px; color: var(--text-muted); cursor: pointer; white-space: nowrap; }
        .chip-btn:hover { border-color: var(--primary); color: white; }

        .chat-input-container { padding: 12px 16px; background: var(--card-dark); border-top: 1px solid #334155; display: flex; align-items: center; gap: 10px; }
        .chat-input { flex: 1; background: var(--bg-dark); border: 1px solid #334155; padding: 12px; border-radius: 8px; color: white; font-size: 14px; outline: none; }
        .chat-input:focus { border-color: var(--primary); }

        /* Drawer Page 3 */
        .drawer-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 99; }
        .drawer-menu { position: fixed; right: -300px; top: 0; width: 280px; height: 100%; background: var(--card-dark); transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 100; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .drawer-menu.open { right: 0; }

        /* Modal */
        .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(3px); z-index: 200; justify-content: center; align-items: center; }
        .modal-box { background: var(--card-dark); padding: 24px; border-radius: 16px; width: 85%; max-width: 320px; text-align: center; border: 1px solid #334155; }

        @keyframes popIn { 0% { transform: scale(0); } 100% { transform: scale(1); } }
    </style>
</head>
<body>

    <!-- PAGE 1: LOGIN -->
    <div id="page1" class="page active">
        <div class="login-top">
            <div class="brand-logo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
                CareerBoot
            </div>
            <div class="welcome-text">MS Excel AI Trainer Access Portal</div>
            
            <div class="tracker-wrapper">
                <div class="walker-avatar" id="walker">🚶</div>
                <div class="tracker-line">
                    <div class="tracker-progress" id="progressBar"></div>
                </div>
                <div class="tracker-labels">
                    <span>Interest</span>
                    <span>Success</span>
                </div>
            </div>
        </div>

        <div class="login-middle">
            <div class="key-box">
                <input type="password" id="secretKey" class="input-key" placeholder="Enter Secret Access Key" autocomplete="off">
                <button class="btn-unlock" onclick="executeUnlockProcess()">Unlock</button>
            </div>
        </div>

        <div class="login-bottom">
            <div id="lottieContainer" class="typing-anim-container"></div>
            <div id="statusBadge" class="status-badge"></div>
        </div>
    </div>

    <!-- PAGE 2: USER AI CHAT -->
    <div id="page2" class="page">
        <div class="chat-header">
            <div class="chat-title">CareerBoot Excel AI Trainer</div>
            <div class="chat-actions">
                <button class="icon-btn" onclick="fetchHistory()" title="History">📜</button>
                <button class="icon-btn" onclick="openDrawer()" title="Menu">|||</button>
            </div>
        </div>

        <div class="chat-body" id="chatBody">
            <div class="chat-bubble model">Hello! I am your CareerBoot MS Excel AI Trainer. Ask me anything about Excel formulas, keyboard shortcuts, or data analysis!</div>
        </div>

        <div class="pinned-bar">
            <button class="chip-btn" onclick="sendQuickQuery('List all important shortcut keys in MS Excel')">Shortcut Keys</button>
            <button class="chip-btn" onclick="sendQuickQuery('List all essential Excel formulas with examples')">All Formulas</button>
            <button class="chip-btn" onclick="sendQuickQuery('What is VLOOKUP and how do I use it with examples?')">What is VLOOKUP</button>
        </div>

        <div class="chat-input-container">
            <input type="file" id="fileAttach" hidden accept="image/*,.xlsx,.xls,.csv">
            <button class="icon-btn" onclick="document.getElementById('fileAttach').click()">📁</button>
            <input type="text" id="userInput" class="chat-input" placeholder="Ask Excel question..." onkeypress="handleKeyPress(event)">
            <button class="icon-btn" onclick="startVoiceRecognition()">🎤</button>
            <button class="btn-unlock" onclick="processUserQuery()" style="padding: 10px 16px;">Send</button>
        </div>
    </div>

    <!-- PAGE 3: DRAWER PAGE -->
    <div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>
    <div class="drawer-menu" id="drawerMenu">
        <h3 style="color: var(--primary);">Options</h3>
        <button class="btn-unlock" onclick="downloadPracticeSheet()" style="width: 100%;">Download Practice Sheet</button>
        <button class="btn-unlock" onclick="closeDrawer()" style="background: #334155; margin-top: auto;">Close</button>
    </div>

    <!-- ADMIN DASHBOARD PAGE -->
    <div id="adminPage" class="page" style="padding: 20px; overflow-y: auto;">
        <h2 style="color: var(--primary); margin-bottom: 20px;">Admin Control Panel</h2>
        
        <div style="background: var(--card-dark); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
            <h4>Create Access Key</h4>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <input type="text" id="newKeyInput" class="chat-input" placeholder="Enter New Key Name">
                <button class="btn-unlock" onclick="adminCreateKey()">Create</button>
            </div>
        </div>

        <div style="background: var(--card-dark); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
            <h4>Revoke Access Key</h4>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <input type="text" id="revokeKeyInput" class="chat-input" placeholder="Enter Key to Delete">
                <button class="btn-unlock" onclick="adminDeleteKey()" style="background: #ef4444;">Delete</button>
            </div>
        </div>

        <div style="background: var(--card-dark); padding: 20px; border-radius: 12px;">
            <h4>Upload Practice Sheet (.xlsx)</h4>
            <input type="file" id="adminSheetFile" style="margin-top: 10px; font-size: 12px;">
            <button class="btn-unlock" onclick="adminUploadSheet()" style="margin-top: 12px; width: 100%;">Upload Sheet</button>
        </div>
    </div>

    <!-- SYSTEM MODAL POPUP -->
    <div class="modal-overlay" id="modalOverlay">
        <div class="modal-box">
            <p id="modalMessage" style="font-size: 14px; color: var(--text-main); margin-bottom: 16px;"></p>
            <button class="btn-unlock" onclick="closeModal()" style="width: 100%;">OK</button>
        </div>
    </div>

    <script>
        // Production System Core Logic
        let jwtToken = localStorage.getItem('jwt_token') || null;

        // Generate Persistent Browser Signature
        function getDeviceSignature() {
            let sig = localStorage.getItem('cb_device_sig');
            if(!sig) {
                sig = 'CB-' + Math.random().toString(36).substring(2) + '-' + Date.now();
                localStorage.setItem('cb_device_sig', sig);
            }
            return sig;
        }

        // Initialize Progress Animation
        window.addEventListener('load', () => {
            setTimeout(() => {
                document.getElementById('walker').style.left = '35%';
                document.getElementById('progressBar').style.width = '35%';
            }, 300);
            
            // Render High Quality Character Typing Lottie
            bodymovin.loadAnimation({
                container: document.getElementById('lottieContainer'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: 'https://assets5.lottiefiles.com/packages/lf20_fcfjwiyb.json' // Premium Typing Developer Lottie
            });
        });

        function showNotification(msg) {
            document.getElementById('modalMessage').innerText = msg;
            document.getElementById('modalOverlay').style.display = 'flex';
        }
        function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

        // Unlock Login Action with 3sec Animation Transition
        async function executeUnlockProcess() {
            const key = document.getElementById('secretKey').value.trim();
            if(!key) return showNotification("Please enter a valid secret key!");

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

                // 3 Seconds Delay to complete Stand-Up / Hand Result Animation
                setTimeout(() => {
                    lottieContainer.style.display = 'none';
                    statusBadge.style.display = 'block';

                    if(data.success) {
                        statusBadge.innerText = '👍🏻';
                        jwtToken = data.token;
                        localStorage.setItem('jwt_token', jwtToken);

                        setTimeout(() => {
                            document.getElementById('page1').classList.remove('active');
                            if(data.role === 'admin') {
                                document.getElementById('adminPage').classList.add('active');
                            } else {
                                document.getElementById('page2').classList.add('active');
                            }
                        }, 1000);
                    } else {
                        statusBadge.innerText = '🙅‍♂️';
                        setTimeout(() => { showNotification(data.message); }, 500);
                    }
                }, 2500);

            } catch (err) {
                showNotification("Network Connection Error");
            }
        }

        // Chat Handlers
        async function processUserQuery() {
            const input = document.getElementById('userInput');
            const fileInput = document.getElementById('fileAttach');
            const chatBody = document.getElementById('chatBody');

            const query = input.value.trim();
            if(!query && !fileInput.files[0]) return;

            if(query) {
                chatBody.innerHTML += \`<div class="chat-bubble user">\${query}</div>\`;
            }

            const formData = new FormData();
            if(query) formData.append('message', query);
            if(fileInput.files[0]) formData.append('file', fileInput.files[0]);

            input.value = '';
            fileInput.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + jwtToken },
                    body: formData
                });
                const data = await res.json();
                chatBody.innerHTML += \`<div class="chat-bubble model">\${data.reply}</div>\`;
                chatBody.scrollTop = chatBody.scrollHeight;
            } catch (err) {
                chatBody.innerHTML += \`<div class="chat-bubble model">Failed to fetch response. Check connection.</div>\`;
            }
        }

        function handleKeyPress(e) { if(e.key === 'Enter') processUserQuery(); }
        function sendQuickQuery(text) { document.getElementById('userInput').value = text; processUserQuery(); }

        // Speech Recognition Integration
        function startVoiceRecognition() {
            if(!('webkitSpeechRecognition' in window)) return showNotification("Speech Recognition not supported on this browser.");
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.onresult = (e) => {
                document.getElementById('userInput').value = e.results[0][0].transcript;
            };
            recognition.start();
        }

        // Drawer Actions
        function openDrawer() {
            document.getElementById('drawerOverlay').style.display = 'block';
            document.getElementById('drawerMenu').classList.add('open');
        }
        function closeDrawer() {
            document.getElementById('drawerOverlay').style.display = 'none';
            document.getElementById('drawerMenu').classList.remove('open');
        }

        async function downloadPracticeSheet() {
            window.open('/api/download-sheet?token=' + jwtToken, '_blank');
        }

        async function fetchHistory() {
            const res = await fetch('/api/chat-history', {
                headers: { 'Authorization': 'Bearer ' + jwtToken }
            });
            const data = await res.json();
            if(data.success) {
                const chatBody = document.getElementById('chatBody');
                chatBody.innerHTML = '';
                data.history.forEach(item => {
                    chatBody.innerHTML += \`<div class="chat-bubble \${item.role}">\${item.message}</div>\`;
                });
            }
        }

        // Admin Panel Functions
        async function adminCreateKey() {
            const newKey = document.getElementById('newKeyInput').value.trim();
            const res = await fetch('/api/admin/create-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
                body: JSON.stringify({ newKey })
            });
            const data = await res.json();
            showNotification(data.message);
        }

        async function adminDeleteKey() {
            const key = document.getElementById('revokeKeyInput').value.trim();
            const res = await fetch('/api/admin/delete-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
                body: JSON.stringify({ key })
            });
            const data = await res.json();
            showNotification(data.message);
        }

        async function adminUploadSheet() {
            const file = document.getElementById('adminSheetFile').files[0];
            if(!file) return showNotification("Select a file first");
            const formData = new FormData();
            formData.append('sheet', file);

            const res = await fetch('/api/admin/upload-sheet', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + jwtToken },
                body: formData
            });
            const data = await res.json();
            showNotification(data.message);
        }
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => console.log(`CareerBoot Server active on port ${PORT}`));
