import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. MONGODB DATABASE CONNECTION
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
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { passcode } = req.body;
    if (!passcode) return res.status(400).json({ success: false, message: 'Passcode is required' });

    const cleanKey = passcode.trim();

    if (cleanKey === 'ADMIN2026') {
      return res.json({ success: true, role: 'ADMIN', message: 'Master Admin Access Granted' });
    }

    if (cleanKey === 'EXCEL2026') {
      return res.json({ success: true, role: 'USER', message: 'Default User Access Granted' });
    }

    const match = await Passcode.findOne({ code: cleanKey, isActive: true }).lean();
    if (match) {
      return res.json({ success: true, role: 'USER', message: 'User Access Granted' });
    }

    return res.status(401).json({ success: false, message: 'Invalid or Expired Passcode' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Database Error', error: error.message });
  }
});

app.post('/api/admin/generate-key', async (req, res) => {
  try {
    const { adminKey, newCode, label } = req.body;
    if (adminKey !== 'ADMIN2026') return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (!newCode || !newCode.trim()) return res.status(400).json({ success: false, message: 'Passcode empty' });

    const createdKey = await Passcode.create({ code: newCode.trim(), label: label || 'User Access Key' });
    return res.json({ success: true, data: createdKey });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Key Generation Failed', error: error.message });
  }
});

// ==========================================
// 4. FRONTEND UI & FULL ACADEMY APPLICATION
// ==========================================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CareerBoot - Complete Enterprise Excel Academy</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
            -webkit-tap-highlight-color: transparent;
        }

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

        html, body {
            width: 100%;
            min-height: 100vh;
            background-color: var(--bg-main);
            color: #f8fafc;
            overflow-x: hidden;
            position: relative;
        }

        .page {
            display: none !important;
            width: 100%;
            min-height: 100vh;
            position: relative;
            z-index: 1;
        }

        .page.active {
            display: flex !important;
            flex-direction: column;
        }

        #page1 {
            height: 100vh;
            max-height: 100vh;
            overflow: hidden;
            background: radial-gradient(125% 125% at 50% 10%, #020617 30%, #0f172a 100%);
        }

        .section-35 {
            height: 35vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px 16px;
            border-bottom: 1px solid var(--card-border);
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(16px);
        }

        .logo-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #60a5fa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }

        .tagline {
            color: var(--text-muted);
            margin-top: 4px;
            font-size: 0.88rem;
            font-weight: 600;
        }

        .section-15 {
            height: 15vh;
            background: #090d16;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 0 16px;
            border-bottom: 1px solid var(--card-border);
        }

        .input-box {
            padding: 14px 18px;
            font-size: 1rem;
            font-weight: 700;
            border-radius: 14px;
            border: 2px solid #334155;
            background: #0f172a !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            outline: none;
            width: 55%;
            max-width: 240px;
            text-align: center;
            letter-spacing: 2px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }

        .input-box::placeholder {
            color: #64748b !important;
            -webkit-text-fill-color: #64748b !important;
            letter-spacing: 0px;
            font-weight: 500;
        }

        .input-box:focus {
            border-color: var(--accent-green);
            box-shadow: 0 0 20px var(--accent-green-glow);
        }

        .btn-unlock {
            padding: 14px 22px;
            font-size: 0.95rem;
            font-weight: 800;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            border: none;
            border-radius: 14px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
            white-space: nowrap;
        }

        .section-50 {
            height: 50vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at 50% 60%, #0f172a 0%, #020617 100%);
            padding: 10px;
        }

        .floating-cloud-payload {
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            display: none;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 12px 22px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border: 2px solid #93c5fd;
            border-radius: 30px;
            color: #ffffff;
            font-weight: 800;
            font-size: 0.95rem;
            box-shadow: 0 0 35px rgba(59, 130, 246, 0.8);
            backdrop-filter: blur(10px);
        }

        @keyframes directTravelAndDock {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            60% { transform: translate(var(--target-x), var(--target-y)) scale(0.75); opacity: 1; }
            100% { transform: translate(var(--target-x), var(--target-y)) scale(0.2); opacity: 0; }
        }

        .animating-cloud {
            display: flex !important;
            animation: directTravelAndDock 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .status-pill {
            margin-top: 12px;
            font-size: 0.9rem;
            font-weight: 700;
            min-height: 36px;
            padding: 6px 20px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 24px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--card-border);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .nav-controls {
            display: flex;
            gap: 10px;
        }

        .nav-btn {
            padding: 9px 16px;
            background: rgba(30, 41, 59, 0.8);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            cursor: pointer;
            font-weight: 700;
            font-size: 0.85rem;
        }

        .container {
            padding: 24px 20px;
            max-width: 950px;
            margin: 0 auto;
            width: 100%;
        }

        .grid-layout {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .card-btn {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            padding: 26px 20px;
            border-radius: 20px;
            color: #ffffff;
            text-align: left;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
        }

        .card-btn .card-icon {
            font-size: 2.2rem;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 14px;
        }

        .card-btn .card-title {
            font-size: 1.1rem;
            font-weight: 800;
            color: #f8fafc;
        }

        .card-btn .card-sub {
            font-size: 0.82rem;
            color: var(--text-muted);
            line-height: 1.4;
        }

        .topic-list {
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-top: 20px;
        }

        .topic-item-btn {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            padding: 18px 22px;
            border-radius: 16px;
            color: #f8fafc;
            font-size: 1rem;
            font-weight: 700;
            text-align: left;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .lesson-card {
            background: var(--card-bg);
            border-radius: 24px;
            padding: 28px;
            border: 1px solid var(--card-border);
        }

        .lesson-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--card-border);
        }

        .lesson-badge {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 800;
        }

        .section-label {
            font-size: 0.82rem;
            color: #60a5fa;
            font-weight: 800;
            margin-top: 22px;
            margin-bottom: 8px;
        }

        .explanation-text {
            color: #cbd5e1;
            font-size: 0.98rem;
            line-height: 1.7;
        }

        .scenario-box {
            background: rgba(30, 41, 59, 0.5);
            border-left: 4px solid var(--accent-blue);
            padding: 16px 18px;
            border-radius: 0 12px 12px 0;
            margin: 12px 0;
            color: #e2e8f0;
            font-size: 0.92rem;
        }

        .code-block {
            background: #020617;
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 12px;
            padding: 18px;
            font-family: 'JetBrains Mono', monospace;
            color: #34d399;
            margin: 12px 0;
            font-size: 0.92rem;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .tip-badge {
            background: rgba(139, 92, 246, 0.12);
            color: #c084fc;
            border: 1px solid rgba(139, 92, 246, 0.3);
            padding: 14px 18px;
            border-radius: 14px;
            font-size: 0.9rem;
            margin-top: 20px;
            display: flex;
            gap: 10px;
        }

        .shortcut-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            font-size: 0.9rem;
        }

        .shortcut-table th, .shortcut-table td {
            padding: 12px 14px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .shortcut-table th {
            background: rgba(30, 41, 59, 0.8);
            color: #60a5fa;
            font-weight: 800;
        }

        .key-combo {
            background: #1e293b;
            color: #f3f4f6;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid #475569;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
        }
    </style>
</head>
<body>

    <div id="floatingCloud" class="floating-cloud-payload">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M17.5 19H5a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
        </svg>
        <span id="cloudKeyText">KEY</span>
    </div>

    <!-- PAGE 1: LOGIN PAGE -->
    <div id="page1" class="page active">
        <div class="section-35">
            <div class="logo-brand">
                <span>CareerBoot</span>
            </div>
            <p class="tagline">Enterprise Excel, Complete Shortcuts & Dashboard Master Academy</p>
        </div>

        <div class="section-15">
            <input type="text" id="secretKey" class="input-box" placeholder="Passcode" autocomplete="off">
            <button type="button" class="btn-unlock" id="submitBtn">Enter Academy</button>
        </div>

        <div class="section-50">
            <svg id="workstationSvg" width="280" height="180" viewBox="0 0 280 180">
                <rect x="20" y="130" width="240" height="10" rx="5" fill="#334155"></rect>
                <rect x="80" y="45" width="120" height="70" rx="8" fill="#0f172a" stroke="#334155" stroke-width="3"></rect>
                <rect id="screenGlow" x="85" y="50" width="110" height="60" rx="5" fill="#020617"></rect>
            </svg>
            <div id="statusPill" class="status-pill"></div>
        </div>
    </div>

    <!-- PAGE 2: MAIN SYLLABUS TILES -->
    <div id="page2" class="page">
        <header class="app-header">
            <div>
                <h3 style="font-weight: 800; font-size: 1.2rem;">CareerBoot Portal</h3>
                <p style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Job-Oriented Master Syllabus</p>
            </div>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page1')">Logout</button>
            </div>
        </header>
        <div class="container">
            <p style="color: #60a5fa; font-size: 0.85rem; font-weight: 800; text-transform: uppercase;">Select Modules</p>
            <div class="grid-layout" id="dashboardGrid">
                <button class="card-btn" data-cat="basic_shortcuts">
                    <div class="card-icon">⌨️</div>
                    <div class="card-title">1. Essential Basic Shortcuts</div>
                    <div class="card-sub">Navigation, File Control, Selection & Everyday Productivity Keys</div>
                </button>
                <button class="card-btn" data-cat="pro_shortcuts">
                    <div class="card-icon">⚡</div>
                    <div class="card-title">2. Pro Shortcuts Library</div>
                    <div class="card-sub">Alt Keys, Formatting, Filtering, Paste Special & AutoSum</div>
                </button>
                <button class="card-btn" data-cat="basic_formulas">
                    <div class="card-icon">📐</div>
                    <div class="card-title">3. Core Basic Formulas</div>
                    <div class="card-sub">SUM, AVERAGE, COUNT, COUNTA, MAX, MIN, ROUND & Math Logic</div>
                </button>
                <button class="card-btn" data-cat="logical_text">
                    <div class="card-icon">🔤</div>
                    <div class="card-title">4. Text, Date & Logic Formulas</div>
                    <div class="card-sub">IF, AND, OR, IFERROR, CONCAT, TEXTJOIN, TRIM, TODAY, DATEDIF</div>
                </button>
                <button class="card-btn" data-cat="lookups">
                    <div class="card-icon">🔍</div>
                    <div class="card-title">5. Lookup & Matching Masters</div>
                    <div class="card-sub">VLOOKUP, HLOOKUP, XLOOKUP, INDEX + MATCH Engine</div>
                </button>
                <button class="card-btn" data-cat="dashboards">
                    <div class="card-icon">📊</div>
                    <div class="card-title">6. Complete Dashboard Architecture</div>
                    <div class="card-sub">Pivot Tables, Dynamic KPI Cards, Interactive Slicers & Charts</div>
                </button>
            </div>
        </div>
    </div>

    <!-- PAGE 3: TOPICS LIST PAGE -->
    <div id="page3" class="page">
        <header class="app-header">
            <h3 id="categoryTitle" style="font-weight: 800; font-size: 1.15rem;">Topics</h3>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page2')">Back</button>
                <button class="nav-btn" onclick="navigateTo('page1')">Home</button>
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
                <button class="nav-btn" onclick="navigateTo('page1')">Home</button>
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

    <!-- PAGE ADMIN -->
    <div id="pageAdmin" class="page">
        <header class="app-header" style="border-bottom-color: #f59e0b;">
            <h3 style="color: #f59e0b; font-weight: 800;">Admin Center</h3>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page2')">Dashboard</button>
                <button class="nav-btn" onclick="navigateTo('page1')">Logout</button>
            </div>
        </header>
        <div class="container">
            <div class="lesson-card" style="border-color: #f59e0b;">
                <h3 style="color: #f59e0b; font-weight: 800;">System Passcode Control</h3>
                <p style="margin-top: 8px; color: var(--text-muted); font-size: 0.9rem;">Portal Security Passcodes:</p>
                <div class="code-block" style="border-color: #f59e0b; color: #fbbf24;">• STANDARD USER KEY : EXCEL2026
• ADMIN CONTROL KEY : ADMIN2026</div>
            </div>
        </div>
    </div>

    <script>
        var currentCatKey = "basic_shortcuts";

        function navigateTo(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const targetPage = document.getElementById(pageId);
            if (targetPage) targetPage.classList.add('active');
            window.scrollTo(0, 0);
        }

        async function triggerCloudAuthentication() {
            const inputElem = document.getElementById('secretKey');
            const keyVal = inputElem ? inputElem.value.trim() : "";
            const statusPill = document.getElementById('statusPill');
            const screenGlow = document.getElementById('screenGlow');

            if (!keyVal) {
                statusPill.style.color = '#ef4444';
                statusPill.style.background = 'rgba(239, 68, 68, 0.12)';
                statusPill.innerHTML = "⚠️ Passcode likhein!";
                return;
            }

            statusPill.innerHTML = "Authenticating...";
            statusPill.style.color = "#94a3b8";

            const floatingCloud = document.getElementById('floatingCloud');
            document.getElementById('cloudKeyText').innerText = keyVal;

            const inputRect = inputElem.getBoundingClientRect();
            const screenRect = screenGlow.getBoundingClientRect();

            const startX = inputRect.left + (inputRect.width / 2) - 40;
            const startY = inputRect.top;
            const endX = screenRect.left + (screenRect.width / 2) - 15;
            const endY = screenRect.top + (screenRect.height / 2) - 10;

            floatingCloud.style.left = startX + 'px';
            floatingCloud.style.top = startY + 'px';
            floatingCloud.style.setProperty('--target-x', (endX - startX) + 'px');
            floatingCloud.style.setProperty('--target-y', (endY - startY) + 'px');

            floatingCloud.classList.remove('animating-cloud');
            void floatingCloud.offsetWidth;
            floatingCloud.classList.add('animating-cloud');

            try {
                const response = await fetch(window.location.origin + '/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passcode: keyVal })
                });

                const data = await response.json();

                setTimeout(() => {
                    floatingCloud.classList.remove('animating-cloud');

                    if (data.success) {
                        screenGlow.setAttribute('fill', '#10b981');
                        statusPill.style.color = '#34d399';
                        statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
                        statusPill.innerHTML = "✓ " + data.message;

                        if (data.role === 'ADMIN') {
                            injectAdminTile();
                        }

                        setTimeout(() => {
                            screenGlow.setAttribute('fill', '#020617');
                            statusPill.innerHTML = "";
                            inputElem.value = "";
                            navigateTo('page2');
                        }, 800);
                    } else {
                        screenGlow.setAttribute('fill', '#ef4444');
                        statusPill.style.color = '#f87171';
                        statusPill.style.background = 'rgba(239, 68, 68, 0.15)';
                        statusPill.innerHTML = "❌ " + data.message;
                    }
                }, 1000);

            } catch (err) {
                floatingCloud.classList.remove('animating-cloud');
                statusPill.style.color = '#ef4444';
                statusPill.innerHTML = "❌ Network Error!";
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

        var academyData = {
            basic_shortcuts: {
                title: "1. Essential Basic Shortcuts",
                subCategories: [
                    {
                        name: "File Control & Basic Operations",
                        concept: "Ye basic shortcuts har ek computer user aur accountant ke liye mandatory hain. Inse file create, open, save aur edit karna fast ho jata hai.",
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
                        tip: "💡 Universal Rule: Har 5 minute me Ctrl + S dabane ki aadat banayein."
                    },
                    {
                        name: "Selection & Fast Navigation Keys",
                        concept: "Mouse bilkul chhod kar keyboard se fast jump aur continuous selection karna.",
                        scenario: "Logistics Inventory: 50,000 rows waali file me mouse se scrolling me time waste na karke shortcut se last row pahuchein.",
                        shortcutsTable: [
                            { key: "Ctrl + Arrow Keys", desc: "Data Region ke exact corners par jump karna" },
                            { key: "Ctrl + Shift + Down/Up", desc: "Pura Column continuous select karna" },
                            { key: "Ctrl + Shift + Right/Left", desc: "Puri Row continuous select karna" },
                            { key: "Ctrl + A", desc: "Entire Data Table Select karna" },
                            { key: "Ctrl + Home", desc: "Cell A1 par wapas aana" },
                            { key: "Ctrl + End", desc: "Data ke last active cell par jump karna" }
                        ],
                        tip: "💡 Speed Tip: Ctrl + Shift + Down se direct saara data 1 millisecond me select karein."
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
                            { key: "Ctrl + 0 (Zero)", desc: "Selected Column Hide karna" },
                            { key: "Ctrl + Shift + +", desc: "New Row / Column Insert karna" },
                            { key: "Ctrl + -", desc: "Selected Row / Column Delete karna" },
                            { key: "Alt + H + O + I", desc: "Auto-Fit Column Width" }
                        ],
                        tip: "💡 Pro Formatting Tip: Alt + H + O + I dabate hi saare columns auto-expand ho jaate hain."
                    },
                    {
                        name: "Advanced Alt Hotkeys & AutoSum",
                        concept: "Alt hotkeys Ribbon menu ko bina mouse open karti hain. AutoSum single click calculation deta hai.",
                        scenario: "BPO Floor Dashboard: Auto-filter lagana aur values paste karke formulas strip karna.",
                        shortcutsTable: [
                            { key: "Ctrl + Alt + V", desc: "Paste Special Menu kholna" },
                            { key: "Alt + A + T", desc: "Sheet par Auto-Filter Toggle karna" },
                            { key: "Alt + =", desc: "AutoSum (Upar waale saare numbers SUM karna)" },
                            { key: "F4 Key", desc: "Formula me absolute cell lock ($) lagana" }
                        ],
                        tip: "💡 Interview Question: 'Formula hata kar sirf value paste kaise karenge?' Answer: Ctrl + Alt + V -> Values."
                    }
                ]
            },
            basic_formulas: {
                title: "3. Core Basic Formulas",
                subCategories: [
                    {
                        name: "1. SUM & AVERAGE Engine",
                        concept: "Excel me total values ka sum aur average nikalna basic foundation hai.",
                        scenario: "Retail & Sales: Monthly store revenue add karna aur daily average sales volume nikalna.",
                        code: "=SUM(A2:A100)\n=AVERAGE(B2:B100)",
                        tip: "💡 Pro Tip: Filtered data par SUM ki jagah SUBTOTAL(9, A2:A100) use karein taaki hidden rows sum na ho."
                    },
                    {
                        name: "2. COUNT, COUNTA & COUNTBLANK",
                        concept: "COUNT numeric cells ginta hai, COUNTA non-empty cells aur COUNTBLANK khaali cells ginta hai.",
                        scenario: "HR Attendance: Present employees (COUNTA) aur absent/missing entries (COUNTBLANK) track karna.",
                        code: "=COUNT(C2:C500)      // Numbers Only\n=COUNTA(C2:C500)     // Text + Numbers\n=COUNTBLANK(C2:C500) // Khaali Cells",
                        tip: "💡 Interview Q: 'COUNT aur COUNTA me kya fark hai?' COUNTA text bhi ginta hai!"
                    },
                    {
                        name: "3. MAX, MIN & ROUND",
                        concept: "Highest/Lowest numerical values find karna aur decimals ko clean integer me round off karna.",
                        scenario: "Sales Performance: Best deal amount (MAX), lowest price quote (MIN) aur GST invoice rounding.",
                        code: "=MAX(D2:D50)        // Maximum Sale\n=MIN(D2:D50)        // Lowest Price\n=ROUND(E2 * 0.18, 2) // GST Rounded to 2 decimals",
                        tip: "💡 Financial Rule: Financial modeling me precision ke liye ROUND mandatory hota hai."
                    },
                    {
                        name: "4. SUMIF & COUNTIF (Conditional Calculations)",
                        concept: "Single condition ke base par totals ya cell counts nikalna.",
                        scenario: "Retail Operations: Specific Store Region (e.g., 'North') ki Total Sales aur Transaction Count nikalna.",
                        code: "=SUMIF(Range, Criteria, Sum_Range)\nExample: =SUMIF(A2:A100, \"North\", C2:C100)\n\n=COUNTIF(Range, Criteria)\nExample: =COUNTIF(B2:B100, \">50000\")",
                        tip: "💡 Interview Tip: Wildcards like \"North*\" use karke partial matches bhi calculate kar sakte hain."
                    },
                    {
                        name: "5. SUMIFS & COUNTIFS (Multi-Condition Calculations)",
                        concept: "Multiple criteria ke sath complex numerical aggregates aur counts calculate karna.",
                        scenario: "E-commerce Analytics: Year 2026 me Category 'Electronics' ke Product Sales ka sum nikalna.",
                        code: "=SUMIFS(Sum_Range, Criteria_Range1, Criteria1, Criteria_Range2, Criteria2)\nExample: =SUMIFS(D2:D100, A2:A100, \"Electronics\", B2:B100, \">2026-01-01\")\n\n=COUNTIFS(Criteria_Range1, Criteria1, Criteria_Range2, Criteria2)\nExample: =COUNTIFS(A2:A100, \"Delhi\", C2:C100, \"Delivered\")",
                        tip: "💡 Best Practice: SUMIFS me Sum_Range HAMESHA pehla parameter hota hai, jabki SUMIF me aakhri."
                    }
                ]
            },
            logical_text: {
                title: "4. Text, Date & Logic Formulas",
                subCategories: [
                    {
                        name: "1. IF, AND, OR & IFERROR Logic",
                        concept: "Conditional decision making. Multilevel conditions aur error handling ke liye.",
                        scenario: "Sales Commission: Agar sale > 100000 AND experience > 2 yrs tabhi 10% bonus Dena.",
                        code: "=IF(AND(A2>100000, B2>2), A2*0.10, 0)\n=IFERROR(VLOOKUP(A2, C:D, 2, FALSE), \"Not Found\")",
                        tip: "💡 Best Practice: Clean dashboards me #N/A se bachne ke liye hamesha IFERROR lagayein."
                    },
                    {
                        name: "2. Nested IF & IFS Function",
                        concept: "Multiple grade/tier conditions check karne ke liye multiple IF conditions chaining.",
                        scenario: "HR Appraisal: Marks > 90 (A Grade), > 75 (B Grade), > 60 (C Grade) categorize karna.",
                        code: "=IFS(A2>=90, \"A\", A2>=75, \"B\", A2>=60, \"C\", TRUE, \"Fail\")\n// Old Nested IF:\n=IF(A2>=90, \"A\", IF(A2>=75, \"B\", IF(A2>=60, \"C\", \"Fail\")))",
                        tip: "💡 Modern Standard: Nested IF ki jagah Hamesha clean IFS function ka upyog karein."
                    },
                    {
                        name: "3. CONCAT, TEXTJOIN & TRIM",
                        concept: "Multiple columns ke text ko combine karna aur extra space bad-data clean karna.",
                        scenario: "CRM Data Cleaning: First Name aur Last Name jodna aur extra spaces remove karna.",
                        code: "=CONCAT(A2, \" \", B2)\n=TEXTJOIN(\", \", TRUE, A2:A10) // Comma separated list\n=TRIM(C2) // Unwanted spaces clean",
                        tip: "💡 VLOOKUP Fail Fix: Data me spaces ki wajah se VLOOKUP fail hota hai, pehle TRIM karein."
                    },
                    {
                        name: "4. LEFT, RIGHT, MID & LEN (Text Extraction)",
                        concept: "Cell me se specifics characters slice/extract karna.",
                        scenario: "Inventory Coding: Product Code 'SKU-9948-DEL' me se Middle Number '9948' nikalna.",
                        code: "=LEFT(A2, 3)     // Output: SKU\n=RIGHT(A2, 3)    // Output: DEL\n=MID(A2, 5, 4)    // Output: 9948\n=LEN(A2)         // Cell ke Total Characters Count",
                        tip: "💡 Formula Parsing: LEN + FIND combination se dynamic length strings split kiye jaate hain."
                    },
                    {
                        name: "5. TODAY, NOW & DATEDIF Engine",
                        concept: "Real-time system date-time aur 2 dates ke beech exact years, months ya days calculate karna.",
                        scenario: "Loan / Age Tracker: Employee ki exact age ya policy expiry tenure calculate karna.",
                        code: "=TODAY()                     // Aaj ki Date\n=DATEDIF(A2, TODAY(), \"Y\")   // Total Years Completed\n=DATEDIF(A2, TODAY(), \"M\")   // Total Months Completed",
                        tip: "💡 Note: DATEDIF Excel ka hidden master formula hai, autocomplete me nahi dikhta par 100% chalega."
                    }
                ]
            },
            lookups: {
                title: "5. Lookup & Matching Masters",
                subCategories: [
                    {
                        name: "1. VLOOKUP & HLOOKUP",
                        concept: "Vertical aur Horizontal data table se unique key match karke target column ka data laana.",
                        scenario: "Supply Chain: Product ID ke base par Item Description aur Rate master list se laana.",
                        code: "=VLOOKUP(Lookup_Value, Table_Array, Col_Index_Num, FALSE)\nEx: =VLOOKUP(A2, MasterData!A:E, 4, FALSE)",
                        tip: "💡 Rule: VLOOKUP me key column HAMESHA selection table ka pehla column hona chahiye."
                    },
                    {
                        name: "2. XLOOKUP (Modern Super Lookup)",
                        concept: "VLOOKUP ki limitations (left lookup restriction, column index counting) ko replace karne wala modern tool.",
                        scenario: "Enterprise ERP: Left side ke column se lookup karna aur dynamic error text show karna.",
                        code: "=XLOOKUP(A2, CodeColumn, TargetColumn, \"Not Available\")\nEx: =XLOOKUP(A2, Master!C:C, Master!A:A, \"Invalid ID\")",
                        tip: "💡 Modern Standard: Interviews me XLOOKUP prefer karna aapko expert dikhata hai."
                    },
                    {
                        name: "3. INDEX + MATCH Combination",
                        concept: "Excel ka sabse flexible aur lightweight lookup combination.",
                        scenario: "Heavy Financial Models: 5 Lakh rows waale model me fast lookup bina spreadsheet slow kiye.",
                        code: "=INDEX(Result_Range, MATCH(Lookup_Value, Lookup_Range, 0))\nEx: =INDEX(B:B, MATCH(A2, C:C, 0))",
                        tip: "💡 Speed Tip: High volume data par VLOOKUP se 5x fast kaam karta hai INDEX+MATCH."
                    },
                    {
                        name: "4. Two-Way Lookup (INDEX + Double MATCH)",
                        concept: "Matrix tables me Row Header aur Column Header dono se intersection value search karna.",
                        scenario: "Financial Budgeting: Specific Month (Column) aur Specific Department (Row) ka Expense figure auto-fetch karna.",
                        code: "=INDEX(Data_Matrix, MATCH(Row_Key, Row_Range, 0), MATCH(Col_Key, Col_Range, 0))\nEx: =INDEX(B2:M10, MATCH(\"Marketing\", A2:A10, 0), MATCH(\"June\", B1:M1, 0))",
                        tip: "💡 Master Level: Interactive financial dashboards me 2-way matrix matching bohot zaroori hai."
                    },
                    {
                        name: "5. Wildcard Lookup & Multiple Criteria Match",
                        concept: "Partial text (e.g. kisi naam ka adha hissa) ya multiple columns join karke lookup karna.",
                        scenario: "Customer Support: Customer Name me se partial 'Gupta' search karke Contact ID lana.",
                        code: "// Wildcard Lookup:\n=VLOOKUP(\"*\" & A2 & \"*\", MasterTable!A:D, 2, FALSE)\n\n// Multi-Condition XLOOKUP:\n=XLOOKUP(1, (RegionRange=\"North\") * (DeptRange=\"Sales\"), TargetRange)",
                        tip: "💡 Pro Tip: Boolean Array multiplication (Condition1)*(Condition2) multi-column lock create karta hai."
                    }
                ]
            },
            dashboards: {
                title: "6. Complete Dashboard Architecture",
                subCategories: [
                    {
                        name: "1. Pivot Table Master Engine",
                        concept: "Unstructured thousands of rows ko summarized management reports me badalna.",
                        scenario: "MIS Reporting: Region-wise, Category-wise Total Sales aur Average Order Value summary.",
                        code: "1. Select Data -> Alt + N + V + T\n2. Put 'Region' in Rows, 'Category' in Columns, 'Sales' in Values.",
                        tip: "💡 Pivot Tip: Data source convert to Table (Ctrl + T) taaki naya data aane par auto refresh ho."
                    },
                    {
                        name: "2. Calculated Fields & Items in Pivot Tables",
                        concept: "Original data table ko bina change kiye Pivot table ke andar naye custom formulas add karna.",
                        scenario: "Sales MIS: Raw sales data se direct 18% GST ya 10% Profit Margin column generate karna.",
                        code: "1. Click Pivot Table -> PivotTable Analyze Tab\n2. Fields, Items, & Sets -> Calculated Field\n3. Name: 'GST Amount', Formula: = Sales * 0.18",
                        tip: "💡 Pro Tip: Calculated fields aapki base dataset file size ko badhne se rokte hain."
                    },
                    {
                        name: "3. Interactive Slicers & Timeline Controls",
                        concept: "Pivot charts aur tables me visual clickable buttons add karna dynamic filtering ke liye.",
                        scenario: "Executive Boardroom Dashboard: CEO click karke Year/Region ke mutabiq live data dekhe.",
                        code: "1. Click Pivot Table -> Insert -> Slicer\n2. Select Region / Year\n3. Right Click Slicer -> Report Connections -> Tick all Pivot Tables.",
                        tip: "💡 Executive Level: Slicer Connection se 1 button dabane par poora 5-page dashboard update hota hai."
                    },
                    {
                        name: "4. Dynamic KPI Cards & Formatting",
                        concept: "KPI summary cards (Total Revenue, Total Customers, Growth %) aur dynamic visual indicators create karna.",
                        scenario: "Operations Dashboard: Real-time target vs achievement visualization with green/red status indicators.",
                        code: "1. Insert Shape -> Select Shape -> Go to Formula Bar -> Type =Sheet1!A1\n2. Conditional Formatting -> Icon Sets -> 3 Traffic Lights (Green > 80%, Yellow 50-80%, Red < 50%).",
                        tip: "💡 Visual Rule: Visual clean rakhne ke liye dashboard par maximum 3-4 primary colors hi use karein."
                    },
                    {
                        name: "5. Pivot Charts, Combo Charts & Dashboard Layouts",
                        concept: "Management updates ke liye executive presentation layers build karna.",
                        scenario: "Board Presentation: Sales Volume (Bar Chart) aur Profit Margin % (Line Chart) ko combine karke dual axis visual banana.",
                        code: "1. Insert Pivot Chart -> Combo Chart\n2. Sales = Clustered Column, Profit Margin % = Line on Secondary Axis\n3. View Tab -> Uncheck Gridlines & Headings for clean app look.",
                        tip: "💡 Layout Tip: Gridlines aur Headings hide karne se sheet bilkul standalone software / dashboard app jaisi lagne lagti hai."
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
                btn.innerHTML = '<span>' + item.name + '</span><span style="color:#10b981">→</span>';
                btn.onclick = function() { openExplanationPage(item); };
                listElement.appendChild(btn);
            });

            navigateTo('page3');
        }

        function openExplanationPage(item) {
            document.getElementById('topicTitle').innerText = academyData[currentCatKey].title;
            document.getElementById('materialTitle').innerText = item.name;
            
            document.getElementById('materialConcept').innerText = item.concept || "";
            document.getElementById('materialScenario').innerText = item.scenario || "";

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
                var html = '<table class="shortcut-table"><thead><tr><th>Shortcut Keys</th><th>Action</th></tr></thead><tbody>';
                item.shortcutsTable.forEach(function(row) {
                    html += '<tr><td><span class="key-combo">' + row.key + '</span></td><td style="color:#cbd5e1;">' + row.desc + '</td></tr>';
                });
                html += '</tbody></table>';
                tableContainer.innerHTML = html;
            } else {
                tableContainer.innerHTML = '';
            }

            document.getElementById('materialTip').innerHTML = '<span>💡</span><span>' + (item.tip || "") + '</span>';

            navigateTo('page4');
        }

        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('submitBtn').addEventListener('click', triggerCloudAuthentication);
            document.getElementById('secretKey').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') triggerCloudAuthentication();
            });

            var dashGrid = document.getElementById('dashboardGrid');
            if (dashGrid) {
                dashGrid.querySelectorAll('.card-btn').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var cat = btn.getAttribute('data-cat');
                        if (cat) openCategory(cat);
                    });
                });
            }
        });
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 CareerBoot Application running on port ${PORT}`);
});
