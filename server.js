import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. MONGODB DATABASE CONNECTION SETUP
// ==========================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/careerboot_excel_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 2. MONGOOSE SCHEMA & MODELS
// ==========================================
const PasscodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  label: { type: String, default: 'Generated Key' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Passcode = mongoose.model('Passcode', PasscodeSchema);

// ==========================================
// 3. API ENDPOINTS
// ==========================================

// Passcode Verification API (Strict Security)
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { passcode } = req.body;
    if (!passcode) {
      return res.status(400).json({ success: false, message: 'Passcode is required' });
    }

    const cleanKey = passcode.trim();

    // Check Master Admin Key
    if (cleanKey === 'ADMIN2026') {
      return res.json({ success: true, role: 'ADMIN', message: 'Master Admin Access Granted' });
    }

    // Check Dynamic Keys Generated in MongoDB
    const match = await Passcode.findOne({ code: cleanKey, isActive: true }).lean();
    if (match) {
      return res.json({ success: true, role: 'USER', message: 'User Access Granted' });
    }

    return res.status(401).json({ success: false, message: 'Invalid or Expired Passcode' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

// Admin API: Generate New Secret Key
app.post('/api/admin/generate-key', async (req, res) => {
  try {
    const { adminKey, newCode, label } = req.body;
    if (adminKey !== 'ADMIN2026') {
      return res.status(403).json({ success: false, message: 'Unauthorized Admin Access' });
    }

    if (!newCode || !newCode.trim()) {
      return res.status(400).json({ success: false, message: 'Passcode cannot be empty' });
    }

    const createdKey = await Passcode.create({ code: newCode.trim(), label: label || 'User Access Key' });
    return res.json({ success: true, data: createdKey });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Key Generation Failed. Key might already exist.', error: error.message });
  }
});

// Admin API: Get All Active Keys
app.get('/api/admin/keys', async (req, res) => {
  try {
    const keys = await Passcode.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, keys });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch keys' });
  }
});

// ==========================================
// 4. FULL HTML FRONTEND EMBEDDED
// ==========================================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CareerBoot - Ultimate Enterprise Excel & Dashboard Academy</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
        :root {
            --bg-main: #020617;
            --card-bg: rgba(15, 23, 42, 0.85);
            --card-border: rgba(255, 255, 255, 0.08);
            --accent-green: #10b981;
            --accent-green-glow: rgba(16, 185, 129, 0.35);
            --accent-blue: #3b82f6;
            --accent-purple: #8b5cf6;
            --accent-gold: #f59e0b;
            --text-muted: #94a3b8;
        }
        html, body { width: 100%; min-height: 100vh; background-color: var(--bg-main); color: #f8fafc; overflow-x: hidden; position: relative; }

        .page { display: none !important; width: 100%; min-height: 100vh; position: relative; z-index: 1; }
        .page.active { display: flex !important; flex-direction: column; }

        /* AUTH PORTAL */
        #page1 { height: 100vh; max-height: 100vh; overflow: hidden; background: radial-gradient(125% 125% at 50% 10%, #020617 30%, #0f172a 100%); }
        .section-35 { height: 35vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 16px; border-bottom: 1px solid var(--card-border); background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(16px); }
        .logo-brand { display: flex; align-items: center; gap: 12px; font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #60a5fa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .tagline { color: var(--text-muted); margin-top: 4px; font-size: 0.88rem; font-weight: 600; }
        .section-15 { height: 15vh; background: #090d16; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--card-border); }
        .input-box { padding: 14px 18px; font-size: 0.95rem; font-weight: 700; border-radius: 14px; border: 2px solid #1e293b; background: #0f172a; color: #ffffff; outline: none; width: 55%; max-width: 240px; text-align: center; letter-spacing: 2px; }
        .input-box:focus { border-color: var(--accent-green); box-shadow: 0 0 25px var(--accent-green-glow); }
        .btn-unlock { padding: 14px 22px; font-size: 0.95rem; font-weight: 800; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border: none; border-radius: 14px; cursor: pointer; }
        .section-50 { height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 60%, #0f172a 0%, #020617 100%); padding: 10px; }
        .status-pill { margin-top: 12px; font-size: 0.9rem; font-weight: 700; padding: 6px 20px; border-radius: 20px; }

        /* HEADER & NAVIGATION */
        .app-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--card-border); position: sticky; top: 0; z-index: 100; }
        .nav-controls { display: flex; gap: 10px; }
        .nav-btn { padding: 9px 16px; background: rgba(30, 41, 59, 0.8); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.85rem; }
        .container { padding: 24px 20px; max-width: 950px; margin: 0 auto; width: 100%; }

        /* MODULE CARDS & TOPICS */
        .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-top: 20px; }
        .card-btn { background: var(--card-bg); border: 1px solid var(--card-border); padding: 26px 20px; border-radius: 20px; color: #ffffff; text-align: left; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; gap: 12px; }
        .card-btn:hover { transform: translateY(-5px); border-color: rgba(16, 185, 129, 0.4); }
        .card-icon { font-size: 2.2rem; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); border-radius: 14px; }
        .card-title { font-size: 1.1rem; font-weight: 800; color: #f8fafc; }
        .card-sub { font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; }

        .topic-list { display: flex; flex-direction: column; gap: 14px; margin-top: 20px; }
        .topic-item-btn { background: var(--card-bg); border: 1px solid var(--card-border); padding: 18px 22px; border-radius: 16px; color: #f8fafc; font-size: 1rem; font-weight: 700; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .arrow-icon { width: 32px; height: 32px; background: rgba(16, 185, 129, 0.1); color: var(--accent-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; }

        /* LESSON DETAIL VIEW */
        .lesson-card { background: var(--card-bg); border-radius: 24px; padding: 28px; border: 1px solid var(--card-border); backdrop-filter: blur(12px); }
        .lesson-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--card-border); }
        .lesson-badge { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; text-transform: uppercase; }
        .section-label { font-size: 0.82rem; color: #60a5fa; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 22px; margin-bottom: 8px; }
        .explanation-text { color: #cbd5e1; font-size: 0.98rem; line-height: 1.7; font-weight: 500; }
        .scenario-box { background: rgba(30, 41, 59, 0.5); border-left: 4px solid var(--accent-blue); padding: 16px 18px; border-radius: 0 12px 12px 0; margin: 12px 0; color: #e2e8f0; font-size: 0.92rem; line-height: 1.6; }
        .code-block { background: #020617; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px; font-family: 'JetBrains Mono', monospace; color: #34d399; margin: 12px 0; font-size: 0.92rem; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
        .tip-badge { background: rgba(139, 92, 246, 0.12); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); padding: 14px 18px; border-radius: 14px; font-size: 0.9rem; font-weight: 600; margin-top: 20px; display: flex; gap: 10px; align-items: flex-start; }

        .shortcut-table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 0.9rem; }
        .shortcut-table th, .shortcut-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .shortcut-table th { background: rgba(30, 41, 59, 0.8); color: #60a5fa; font-weight: 800; text-transform: uppercase; font-size: 0.78rem; }
        .key-combo { background: #1e293b; color: #f3f4f6; padding: 4px 8px; border-radius: 6px; border: 1px solid #475569; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.82rem; display: inline-block; }
    </style>
</head>
<body>

    <!-- PAGE 1: AUTHENTICATION PORTAL -->
    <div id="page1" class="page active">
        <div class="section-35">
            <div class="logo-brand">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                <span>CareerBoot</span>
            </div>
            <p class="tagline">Enterprise Excel, Complete Shortcuts & Dashboard Master Academy</p>
        </div>

        <div class="section-15">
            <input type="password" id="secretKey" class="input-box" placeholder="Passcode" autocomplete="off">
            <button class="btn-unlock" onclick="triggerAuthentication()">Enter Academy</button>
        </div>

        <div class="section-50">
            <div id="statusPill" class="status-pill"></div>
        </div>
    </div>

    <!-- PAGE 2: DASHBOARD CATEGORIES -->
    <div id="page2" class="page">
        <header class="app-header">
            <div>
                <h3 style="font-weight: 800; font-size: 1.2rem;">CareerBoot Portal</h3>
                <p style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Job-Oriented Master Syllabus</p>
            </div>
            <div class="nav-controls">
                <button class="nav-btn" onclick="logout()">Logout</button>
            </div>
        </header>
        <div class="container">
            <p style="color: #60a5fa; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Select Modules</p>
            <div class="grid-layout" id="dashboardGrid">
                <button class="card-btn" onclick="openCategory('basic_shortcuts')">
                    <div class="card-icon">⌨️</div>
                    <div class="card-title">1. Essential Basic Shortcuts</div>
                    <div class="card-sub">Navigation, File Control, Selection & Everyday Productivity Keys</div>
                </button>
                <button class="card-btn" onclick="openCategory('pro_shortcuts')">
                    <div class="card-icon">⚡</div>
                    <div class="card-title">2. Pro Shortcuts Library</div>
                    <div class="card-sub">Alt Keys, Formatting, Filtering, Paste Special & AutoSum</div>
                </button>
                <button class="card-btn" onclick="openCategory('basic_formulas')">
                    <div class="card-icon">📐</div>
                    <div class="card-title">3. Core Basic Formulas</div>
                    <div class="card-sub">SUM, AVERAGE, COUNT, COUNTA, MAX, MIN & Math Logic</div>
                </button>
                <button class="card-btn" onclick="openCategory('logical_text')">
                    <div class="card-icon">🔤</div>
                    <div class="card-title">4. Text, Date & Logic Formulas</div>
                    <div class="card-sub">IF, AND, OR, IFERROR, CONCAT, TEXTJOIN, TRIM, TODAY</div>
                </button>
                <button class="card-btn" onclick="openCategory('lookups')">
                    <div class="card-icon">🔍</div>
                    <div class="card-title">5. Lookup & Matching Masters</div>
                    <div class="card-sub">VLOOKUP, HLOOKUP, XLOOKUP, INDEX + MATCH Engine</div>
                </button>
                <button class="card-btn" onclick="openCategory('dashboards')">
                    <div class="card-icon">📊</div>
                    <div class="card-title">6. Complete Dashboard Architecture</div>
                    <div class="card-sub">Pivot Tables, Dynamic KPI Cards, Interactive Slicers & Charts</div>
                </button>
            </div>
        </div>
    </div>

    <!-- PAGE 3: SUB-CATEGORIES -->
    <div id="page3" class="page">
        <header class="app-header">
            <h3 id="categoryTitle" style="font-weight: 800; font-size: 1.15rem;">Topics</h3>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page2')">Back</button>
                <button class="nav-btn" onclick="logout()">Home</button>
            </div>
        </header>
        <div class="container">
            <div id="subCategoryList" class="topic-list"></div>
        </div>
    </div>

    <!-- PAGE 4: DETAILED LESSON PAGE -->
    <div id="page4" class="page">
        <header class="app-header">
            <h3 id="topicTitle" style="font-weight: 800; font-size: 1.15rem;">Lesson</h3>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page3')">Back</button>
                <button class="nav-btn" onclick="logout()">Home</button>
            </div>
        </header>
        <div class="container">
            <div class="lesson-card">
                <div class="lesson-header">
                    <span class="lesson-badge">Job-Ready Practical Lesson</span>
                    <h2 id="materialTitle" style="color: #f8fafc; font-size: 1.3rem; font-weight: 800;">Topic Details</h2>
                </div>

                <div class="section-label">📌 1. Bilkul Basic Se Samjhein (Concept)</div>
                <div id="materialConcept" class="explanation-text"></div>

                <div class="section-label">🏢 2. Company Me Kahan Kaam Aata Hai? (Real Job Scenario)</div>
                <div id="materialScenario" class="scenario-box"></div>

                <div id="materialCodeSection">
                    <div class="section-label">⚡ 3. Exact Syntax & Practical Example</div>
                    <div id="materialCode" class="code-block"></div>
                </div>

                <div id="materialTableContainer"></div>

                <div class="section-label">🎯 4. Interview & Production Tip</div>
                <div id="materialTip" class="tip-badge"></div>
            </div>
        </div>
    </div>

    <!-- PAGE ADMIN CONTROL -->
    <div id="pageAdmin" class="page">
        <header class="app-header" style="border-bottom-color: #f59e0b;">
            <h3 style="color: #f59e0b; font-weight: 800;">Master Admin Center</h3>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page2')">Dashboard</button>
                <button class="nav-btn" onclick="logout()">Logout</button>
            </div>
        </header>
        <div class="container">
            <div class="lesson-card" style="border-color: #f59e0b;">
                <h3 style="color: #f59e0b;">Generate Secret Key in MongoDB</h3>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 6px;">Create custom user passcodes stored safely in database:</p>
                <input type="text" id="newPasscode" class="input-box" placeholder="New Passcode (e.g. USER2026)" style="text-align: left; padding: 12px; width: 100%; max-width: 100%; margin-top: 15px;">
                <input type="text" id="newLabel" class="input-box" placeholder="User Name / Label" style="text-align: left; padding: 12px; width: 100%; max-width: 100%; margin-top: 10px;">
                <button class="btn-unlock" style="background: #f59e0b; color: #000; width: 100%; margin-top: 15px;" onclick="generateKeyInDb()">SAVE KEY TO DATABASE</button>
                <div id="adminMsg" style="margin-top: 15px; font-weight: 700;"></div>
            </div>
        </div>
    </div>

    <script>
        var currentRole = '';
        var currentCatKey = 'basic_shortcuts';

        function navigateTo(pageId) {
            var pages = document.querySelectorAll('.page');
            for (var i = 0; i < pages.length; i++) {
                pages[i].classList.remove('active');
            }
            document.getElementById(pageId).classList.add('active');
            window.scrollTo(0, 0);
        }

        function logout() {
            currentRole = '';
            document.getElementById('secretKey').value = '';
            document.getElementById('statusPill').innerText = '';
            navigateTo('page1');
        }

        async function triggerAuthentication() {
            var keyVal = document.getElementById('secretKey').value.trim();
            var statusPill = document.getElementById('statusPill');

            if (!keyVal) {
                statusPill.style.color = '#ef4444';
                statusPill.style.background = 'rgba(239, 68, 68, 0.12)';
                statusPill.innerHTML = "⚠️ Please enter passcode!";
                return;
            }

            statusPill.style.color = '#60a5fa';
            statusPill.style.background = 'rgba(59, 130, 246, 0.15)';
            statusPill.innerHTML = "Verifying with MongoDB...";

            try {
                const res = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passcode: keyVal })
                });

                const data = await res.json();
                if (data.success) {
                    currentRole = data.role;
                    statusPill.style.color = '#34d399';
                    statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
                    statusPill.innerHTML = "✓ Passcode Authenticated! Granting Access...";
                    
                    if (currentRole === 'ADMIN') {
                        injectAdminTile();
                    }

                    setTimeout(function() {
                        statusPill.innerHTML = "";
                        document.getElementById('secretKey').value = "";
                        if (currentRole === 'ADMIN') {
                            navigateTo('pageAdmin');
                        } else {
                            navigateTo('page2');
                        }
                    }, 1200);
                } else {
                    statusPill.style.color = '#f87171';
                    statusPill.style.background = 'rgba(239, 68, 68, 0.15)';
                    statusPill.innerHTML = "❌ " + data.message;
                }
            } catch (err) {
                statusPill.style.color = '#f87171';
                statusPill.style.background = 'rgba(239, 68, 68, 0.15)';
                statusPill.innerHTML = "❌ Cannot connect to backend server!";
            }
        }

        function injectAdminTile() {
            if (document.getElementById('adminTile')) return;
            var grid = document.getElementById('dashboardGrid');
            if (!grid) return;
            
            var adminBtn = document.createElement('button');
            adminBtn.id = 'adminTile';
            adminBtn.className = 'card-btn';
            adminBtn.style.borderColor = '#f59e0b';
            adminBtn.style.background = 'linear-gradient(160deg, #271e0c 0%, #020617 100%)';
            adminBtn.onclick = function() { navigateTo('pageAdmin'); };
            adminBtn.innerHTML = '<div class="card-icon">⚙️</div><div class="card-title" style="color:#f59e0b">Admin Control Center</div><div class="card-sub">Manage System Security Passcodes</div>';
            grid.appendChild(adminBtn);
        }

        async function generateKeyInDb() {
            var newCode = document.getElementById('newPasscode').value.trim();
            var newLabel = document.getElementById('newLabel').value.trim();
            var adminMsg = document.getElementById('adminMsg');

            if (!newCode) {
                adminMsg.style.color = '#ef4444';
                adminMsg.innerText = '⚠️ Key code is required!';
                return;
            }

            try {
                const res = await fetch('/api/admin/generate-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminKey: 'ADMIN2026', newCode: newCode, label: newLabel })
                });

                const data = await res.json();
                if (data.success) {
                    adminMsg.style.color = '#34d399';
                    adminMsg.innerText = '✅ Key "' + newCode + '" saved to MongoDB successfully!';
                    document.getElementById('newPasscode').value = '';
                    document.getElementById('newLabel').value = '';
                } else {
                    adminMsg.style.color = '#ef4444';
                    adminMsg.innerText = '❌ ' + data.message;
                }
            } catch (err) {
                adminMsg.style.color = '#ef4444';
                adminMsg.innerText = '❌ Database Save Error!';
            }
        }

        /* 100% COMPLETE & UN-CUT ACADEMY SYLLABUS DATA */
        var academyData = {
            basic_shortcuts: {
                title: "1. Essential Basic Shortcuts",
                subCategories: [
                    {
                        name: "File Control & Basic Operations",
                        concept: "Ye basic shortcuts har ek computer user aur accountant ke liye mandatory hain. Inse file create, open, save aur edit karna 10x fast ho jata hai.",
                        scenario: "BPO / Daily Reporting: Roz subah nayi sheet banakar usme data paste karke file save karna regular job task hota hai.",
                        shortcutsTable: [
                            { key: "Ctrl + N", desc: "Nayi Workbook (Excel File) Open Karna" },
                            { key: "Ctrl + O", desc: "Purani File Open Karna" },
                            { key: "Ctrl + S", desc: "File Save Karna (Habit banayein)" },
                            { key: "Ctrl + W", desc: "Current File Close Karna" },
                            { key: "Ctrl + Z", desc: "Undo (Galti hone par piche jaana)" },
                            { key: "Ctrl + Y", desc: "Redo (Wapas aage aana)" },
                            { key: "Ctrl + F", desc: "Find (Data dhoondhna)" },
                            { key: "Ctrl + H", desc: "Replace (Text ko change karna)" }
                        ],
                        tip: "💡 Universal Rule: Har 5 minute me Ctrl + S dabane ki aadat banayein taaki system crash hone par data na khoye."
                    },
                    {
                        name: "Selection & Fast Navigation Keys",
                        concept: "Mouse bilkul chhod kar keyboard se fast jump aur continuous selection karna.",
                        scenario: "Logistics Inventory: 50,000 rows waali file me mouse se niche scrolling me 5 minute lagte hain, shortcut se 0.1 second me last row pahuchein.",
                        shortcutsTable: [
                            { key: "Ctrl + Arrow Keys", desc: "Data Region ke exact corners par jump karna" },
                            { key: "Ctrl + Shift + Down/Up", desc: "Pura Column continuous select karna" },
                            { key: "Ctrl + Shift + Right/Left", desc: "Puri Row continuous select karna" },
                            { key: "Ctrl + A", desc: "Entire Data Table Select karna" },
                            { key: "Ctrl + Home", desc: "Cell A1 par wapas aana" },
                            { key: "Ctrl + End", desc: "Data ke last active cell par jump karna" },
                            { key: "Ctrl + PageDown / PageUp", desc: "Next / Previous Sheet tab par switch karna" }
                        ],
                        tip: "💡 Interview Speed Tip: Interviewer ke samne mouse bypass karke Ctrl + Shift + Down se data select karne se candidate instantly highly proficient lagta hai."
                    }
                ]
            },
            pro_shortcuts: {
                title: "2. Pro Shortcuts Library",
                subCategories: [
                    {
                        name: "Row, Column & Cell Formatting Keys",
                        concept: "Cells ko hide/unhide karna, alignment set karna aur rows insert/delete karna.",
                        scenario: "Accounting Reports: Unwanted columns ko client file se hide karna aur currency formatting add karna.",
                        shortcutsTable: [
                            { key: "Ctrl + B / I / U", desc: "Bold, Italic, Underline Apply karna" },
                            { key: "Ctrl + 9", desc: "Selected Row Hide karna" },
                            { key: "Ctrl + Shift + (", desc: "Hidden Row Unhide karna" },
                            { key: "Ctrl + 0 (Zero)", desc: "Selected Column Hide karna" },
                            { key: "Ctrl + Shift + )", desc: "Hidden Column Unhide karna" },
                            { key: "Ctrl + Shift + + (Plus)", desc: "New Row / Column Insert karna" },
                            { key: "Ctrl + - (Minus)", desc: "Selected Row / Column Delete karna" },
                            { key: "Alt + H + O + I", desc: "Auto-Fit Column Width (Text fit ho jayega)" },
                            { key: "Alt + H + A + C", desc: "Text Center Align karna" }
                        ],
                        tip: "💡 Pro Formatting Tip: Alt + H + O + I dabate hi saare columns auto-expand hokar tidy ho jaate hain."
                    },
                    {
                        name: "Advanced Alt Hotkeys & AutoSum",
                        concept: "Alt hotkeys Ribbon menu ko bina mouse open karti hain. AutoSum single click calculation deta hai.",
                        scenario: "BPO Floor Dashboard: Auto-filter lagana aur values paste karke formulas strip karna.",
                        shortcutsTable: [
                            { key: "Ctrl + Alt + V", desc: "Paste Special Menu kholna" },
                            { key: "Alt + E + S + V + Enter", desc: "Fast Value Paste (Formulas ko static text me badalna)" },
                            { key: "Alt + A + T (ya Ctrl + Shift + L)", desc: "Sheet par Auto-Filter Toggle (ON / OFF) karna" },
                            { key: "Alt + = (Equals)", desc: "AutoSum (Upar waale saare numbers instantly SUM karna)" },
                            { key: "F4 Key", desc: "Last action repeat karna YA Formula me absolute cell lock ($) lagana" }
                        ],
                        tip: "💡 Interview Question: 'Formula hata kar sirf value paste kaise karenge?' Answer: Ctrl + Alt + V daba kar Values choose karenge."
                    }
                ]
            },
            basic_formulas: {
                title: "3. Core Basic Formulas",
                subCategories: [
                    {
                        name: "1. SUM, AVERAGE & MATH (Basic Calculations)",
                        concept: "Excel me calculations hamesha '=' sign se start hoti hain. SUM jodne ke liye aur AVERAGE ausat nikalne ke liye use hota hai.",
                        scenario: "Accounting & Logistics: Daily Sales Total calculate karna aur Per-Day Average Dispatch Speed nikalna.",
                        code: "// Sum Range A1 to A20\n=SUM(A1:A20)\n\n// Calculate Average Sale\n=AVERAGE(B1:B50)\n\n// Basic Division / Subtraction\n=(A2 - B2) / C2",
                        tip: "💡 Basic Rule: Kabhi bhi numbers ko manual '=10+20' mat likho, cell reference '=A1+B1' use karo taaki data change hone par result auto-update ho."
                    },
                    {
                        name: "2. COUNT, COUNTA & COUNTBLANK (Ginti Karna)",
                        concept: "COUNT sirf numbers ko ginta hai. COUNTA Text aur Numbers dono ko ginta hai. COUNTBLANK khali cells ko ginta hai.",
                        scenario: "BPO Call Tracker: Total calls handled (COUNTA), non-numeric error entries (COUNT), aur missing agent feedback (COUNTBLANK) ginnna.",
                        code: "// Count Numeric Entries Only\n=COUNT(A2:A500)\n\n// Count All Filled Cells (Text + Numbers)\n=COUNTA(A2:A500)\n\n// Count Blank Cells (Missing Data)\n=COUNTBLANK(A2:A500)",
                        tip: "💡 Interview Tip: Interviewer puchhega 'COUNT aur COUNTA me kya farq hai?' COUNTA non-empty cells ginta hai jabki COUNT sirf numbers."
                    },
                    {
                        name: "3. MAX, MIN & LARGE (Highest & Lowest Values)",
                        concept: "Data list me sabse bada number (MAX) ya sabse chhota number (MIN) dhoondhna.",
                        scenario: "Logistics Freight Cost: Maximum Freight Charge kitna gaya aur minimum shipping time kitna laga.",
                        code: "// Maximum Value\n=MAX(C2:C1000)\n\n// Minimum Value\n=MIN(C2:C1000)\n\n// 2nd Highest Sales Amount\n=LARGE(C2:C1000, 2)",
                        tip: "💡 Pro Tip: LARGE(range, 2) se 2nd highest, aur LARGE(range, 3) se 3rd highest number nikala ja sakta hai."
                    }
                ]
            },
            logical_text: {
                title: "4. Text, Date & Logic Formulas",
                subCategories: [
                    {
                        name: "1. IF, AND, OR & IFERROR (Decision Logic)",
                        concept: "Conditions check karna. Agar target achieve hua to 'Bonus', varna 'No Bonus'. IFERROR se #N/A errors chhupaye jate hain.",
                        scenario: "Payroll & Accounts: Overtime Pay Calculate karna aur Reports me Clean Formatting maintain rakhna.",
                        code: "// Single IF Condition\n=IF(B2 >= 100, \"Target Achieved\", \"Pending\")\n\n// AND Condition (Dono Sahi Hone Chahiye)\n=IF(AND(B2>=100, C2>=90%), \"Promoted\", \"Retain\")\n\n// Clean Errors\n=IFERROR(VLOOKUP(A2, B:C, 2, FALSE), \"Record Not Found\")",
                        tip: "💡 Quality Rule: Professional Analyst messy #N/A ya #DIV/0! errors dashboard me kabhi nahi chhodte, IFERROR zaroor use karte hain."
                    },
                    {
                        name: "2. CONCAT, TEXTJOIN, TRIM & Text Cleaning",
                        concept: "Kharaab formatting, extra spaces clean karna aur do-teen columns ka text ek sath jodhna.",
                        scenario: "BPO Data Cleaning: First Name aur Last Name ko combine karna, aur system dump se unwanted spaces hatana.",
                        code: "// Combine Text with Space\n=CONCATENATE(A2, \" \", B2)\n\n// Advanced Modern Join (Delimiter ke saath)\n=TEXTJOIN(\", \", TRUE, A2:D2)\n\n// Extra Spaces Clean Karna\n=TRIM(A2)\n\n// Text Case Change\n=UPPER(A2) | =LOWER(A2) | =PROPER(A2)",
                        tip: "💡 Real Job Scenario: CRM Data me aksar hidden spaces hoti hain. VLOOKUP fail hone par pehle TRIM formula use karein."
                    },
                    {
                        name: "3. TODAY, NOW & DATEDIF (Date Analytics)",
                        concept: "System Date, Time, aur Aging (Do dates ke beech kitne din/mahine beet gaye) calculate karna.",
                        scenario: "Accounting Invoice Aging: Invoice Date se aaj tak kitne din overdue huye hain check karna.",
                        code: "// Current Today Date\n=TODAY()\n\n// Days Overdue (Today minus Invoice Date)\n=TODAY() - A2\n\n// Calculate Age in Years\n=DATEDIF(A2, TODAY(), \"Y\")",
                        tip: "💡 Aging Tip: BPO & Logistics Accounts me Overdue Invoices highlight karne ke liye Date Difference formulas lagaye jate hain."
                    }
                ]
            },
            lookups: {
                title: "5. Lookup & Matching Masters",
                subCategories: [
                    {
                        name: "1. VLOOKUP & HLOOKUP (Vertical & Horizontal Matching)",
                        concept: "Do alag sheets se matching Key ID ke base par data pull karna. VLOOKUP vertical tables ke liye hai, HLOOKUP horizontal rows ke liye.",
                        scenario: "Logistics Track Sheet: Parcel ID ke basis par Delivery Status dusri master sheet se current sheet me fetch karna.",
                        code: "// VLOOKUP Syntax: (Search Value, Table Range, Column Index, FALSE for Exact Match)\n=VLOOKUP(A2, MasterData!A:E, 3, FALSE)\n\n// HLOOKUP Syntax\n=HLOOKUP(A2, PricingTable!A1:Z5, 2, FALSE)",
                        tip: "💡 Crucial VLOOKUP Rules:\n1. Search Key ID table ke 1st column me honi chahiye.\n2. Last parameter hamesha FALSE ya 0 rakhein."
                    },
                    {
                        name: "2. XLOOKUP (Modern Super Lookup Engine)",
                        concept: "VLOOKUP ki sabhi kamzoriyon ko khatam karne wala sabse advance formula. Ye Left, Right, Up, Down kisi bhi side lookup kar sakta hai.",
                        scenario: "Accounting & Payroll: Left-side lookups jahan VLOOKUP fail hota hai, XLOOKUP 1 second me kar deta hai.",
                        code: "// XLOOKUP Syntax: (Search Item, Search Column, Return Column, Not Found Text)\n=XLOOKUP(A2, Sheet2!B:B, Sheet2!A:A, \"Customer Not Found\")",
                        tip: "💡 Interview Killer Skill: Interviewer ko bataiye ki 'Main VLOOKUP ke saath-saath modern XLOOKUP follow karta hu kyunki ye fast aur left-lookup supportive hai'."
                    },
                    {
                        name: "3. INDEX + MATCH (Dynamic Duo)",
                        concept: "Flexibility ka Baap! Column numbers manual count karne ki zaroorat nahi padti, table dynamic rehti hai.",
                        scenario: "Executive Dashboards: Dynamic dropdown selection ke basis par entire row and column metrics pull karna.",
                        code: "// INDEX(Return Column, MATCH(Lookup Value, Lookup Column, 0))\n=INDEX(C2:C1000, MATCH(A2, A2:A1000, 0))",
                        tip: "💡 Pro Tip: Large Enterprise files me INDEX-MATCH, VLOOKUP se zyada fast perform karta hai aur file lag nahi hoti."
                    }
                ]
            },
            dashboards: {
                title: "6. Complete Dashboard Architecture",
                subCategories: [
                    {
                        name: "1. Raw Data Structuring & Pivot Table Foundation",
                        concept: "Unstructured raw data ko clean, organized summary table me convert karna bina kisi single formula ke.",
                        scenario: "E-Commerce / BPO Floor: Management ke liye 1 Lakh sales rows ko 1 minute me Region-Wise Summary me summarize karna.",
                        code: "Step 1: Raw Data me kahin bhi click karke Ctrl + A dabaayein.\nStep 2: Press Alt + N + V + T (Insert Pivot Table) -> Press Enter.\nStep 3: Right Panel se 'Region' ko Rows me drag karein, aur 'Revenue' ko Values me drag karein.\nStep 4: Values par Right Click -> Show Values As -> % of Grand Total.",
                        tip: "💡 Dashboard Rule: Pivot Table hamesha Clean Tabular Data par banti hai, merged cells me fail ho jaati hai."
                    },
                    {
                        name: "2. Dynamic Slicers, KPI Cards & Visual Charts",
                        concept: "Executive Visual Dashboard banana jisme Top KPI Cards (Total Sales, Orders, CSAT) aur Live Filter Buttons (Slicers) ho.",
                        scenario: "Logistics Executive Meeting: Slicer par 'North Region' click karte hi pure dashboard ki visual charts live update ho jaati hain.",
                        code: "Step 1: Pivot Table par Click -> PivotTable Analyze Tab -> Click 'Insert Slicer'.\nStep 2: Tick 'Month', 'Region', 'Product Category' -> OK.\nStep 3: Pivot Chart Insert karein (Alt + F1).\nStep 4: Slicer Right Click -> Report Connections -> Tick ALL Pivot Tables.",
                        tip: "💡 Pro Executive Design Tip: Dark Gridlines remove karein (Alt + W + V + G), clean cards banayein aur premium gradients use karein."
                    }
                ]
            }
        };

        function openCategory(catKey) {
            currentCatKey = catKey;
            var titleElement = document.getElementById('categoryTitle');
            var listElement = document.getElementById('subCategoryList');
            if (!listElement || !titleElement) return;

            listElement.innerHTML = '';
            var data = academyData[catKey] || { title: "Category", subCategories: [] };
            titleElement.innerText = data.title;

            data.subCategories.forEach(function(item) {
                var btn = document.createElement('button');
                btn.className = 'topic-item-btn';
                btn.innerHTML = '<span>' + item.name + '</span><div class="arrow-icon">→</div>';
                btn.onclick = function() { openExplanationPage(item); };
                listElement.appendChild(btn);
            });

            navigateTo('page3');
        }

        function openExplanationPage(item) {
            document.getElementById('topicTitle').innerText = academyData[currentCatKey].title;
            document.getElementById('materialTitle').innerText = item.name;
            
            document.getElementById('materialConcept').innerText = item.concept || "Concept details updated.";
            document.getElementById('materialScenario').innerText = item.scenario || "Scenario details updated.";

            var codeBlock = document.getElementById('materialCode');
            var codeSection = document.getElementById('materialCodeSection');
            var tableContainer = document.getElementById('materialTableContainer');
            
            if (item.code) {
                codeSection.style.display = 'block';
                codeBlock.innerText = item.code;
            } else {
                codeSection.style.display = 'none';
            }

            if (item.shortcutsTable && item.shortcutsTable.length > 0) {
                var html = '<table class="shortcut-table"><thead><tr><th>Shortcut Keys</th><th>Action / Job Function</th></tr></thead><tbody>';
                item.shortcutsTable.forEach(function(row) {
                    html += '<tr><td><span class="key-combo">' + row.key + '</span></td><td style="color:#cbd5e1; font-weight:600;">' + row.desc + '</td></tr>';
                });
                html += '</tbody></table>';
                tableContainer.innerHTML = html;
            } else {
                tableContainer.innerHTML = '';
            }

            document.getElementById('materialTip').innerHTML = '<span>💡</span><span>' + (item.tip || "") + '</span>';

            navigateTo('page4');
        }

        document.getElementById('secretKey').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') triggerAuthentication();
        });
    </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CareerBoot Application live on http://localhost:${PORT}`);
});
