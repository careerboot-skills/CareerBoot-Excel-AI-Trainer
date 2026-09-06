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
// 4. COMPLETE FRONTEND UI & ANIMATION ENGINE
// ==========================================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CareerBoot - Ultimate Enterprise Excel & Dashboard Academy</title>
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

        body::before {
            content: '';
            position: fixed;
            top: -10%;
            left: 20%;
            width: 450px;
            height: 450px;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%);
            z-index: 0;
            pointer-events: none;
        }

        body::after {
            content: '';
            position: fixed;
            bottom: -10%;
            right: 10%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(0,0,0,0) 70%);
            z-index: 0;
            pointer-events: none;
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
            letter-spacing: 0.2px;
        }

        .journey-wrapper {
            width: 100%;
            max-width: 500px;
            margin-top: 12px;
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
            font-size: 0.95rem;
            font-weight: 700;
            border-radius: 14px;
            border: 2px solid #1e293b;
            background: #0f172a;
            color: #ffffff;
            outline: none;
            width: 55%;
            max-width: 240px;
            text-align: center;
            letter-spacing: 2px;
            transition: all 0.3s ease;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }

        .input-box:focus {
            border-color: var(--accent-green);
            box-shadow: 0 0 25px var(--accent-green-glow);
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
            transition: all 0.25s ease;
            white-space: nowrap;
        }

        .btn-unlock:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5);
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
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
            62.5% {
                transform: translate(var(--target-x), var(--target-y)) scale(0.75);
                opacity: 1;
            }
            85% {
                transform: translate(var(--target-x), var(--target-y)) scale(0.70);
                opacity: 1;
            }
            100% {
                transform: translate(var(--target-x), var(--target-y)) scale(0.25);
                opacity: 0;
            }
        }

        .animating-cloud {
            display: flex !important;
            animation: directTravelAndDock 4.0s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .status-pill {
            margin-top: 12px;
            font-size: 0.9rem;
            font-weight: 700;
            height: 36px;
            padding: 6px 20px;
            border-radius: 20px;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
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
            transition: all 0.2s ease;
        }

        .nav-btn:hover {
            background: #334155;
            border-color: rgba(255, 255, 255, 0.25);
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
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
        }

        .card-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #10b981, #3b82f6);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .card-btn:hover {
            transform: translateY(-5px);
            border-color: rgba(16, 185, 129, 0.4);
            box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.15);
        }

        .card-btn:hover::before {
            opacity: 1;
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
            border: 1px solid rgba(255, 255, 255, 0.05);
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
            transition: all 0.25s ease;
            backdrop-filter: blur(10px);
        }

        .topic-item-btn:hover {
            border-color: var(--accent-green);
            background: rgba(15, 23, 42, 0.95);
            transform: translateX(6px);
        }

        .topic-item-btn .arrow-icon {
            width: 32px;
            height: 32px;
            background: rgba(16, 185, 129, 0.1);
            color: var(--accent-green);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            font-weight: 800;
        }

        .lesson-card {
            background: var(--card-bg);
            border-radius: 24px;
            padding: 28px;
            border: 1px solid var(--card-border);
            backdrop-filter: blur(12px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
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
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        .section-label {
            font-size: 0.82rem;
            color: #60a5fa;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 22px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .explanation-text {
            color: #cbd5e1;
            font-size: 0.98rem;
            line-height: 1.7;
            font-weight: 500;
        }

        .scenario-box {
            background: rgba(30, 41, 59, 0.5);
            border-left: 4px solid var(--accent-blue);
            padding: 16px 18px;
            border-radius: 0 12px 12px 0;
            margin: 12px 0;
            color: #e2e8f0;
            font-size: 0.92rem;
            line-height: 1.6;
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
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-all;
            position: relative;
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.8);
        }

        .tip-badge {
            background: rgba(139, 92, 246, 0.12);
            color: #c084fc;
            border: 1px solid rgba(139, 92, 246, 0.3);
            padding: 14px 18px;
            border-radius: 14px;
            font-size: 0.9rem;
            font-weight: 600;
            margin-top: 20px;
            line-height: 1.5;
            display: flex;
            gap: 10px;
            align-items: flex-start;
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
            text-transform: uppercase;
            font-size: 0.78rem;
            letter-spacing: 0.5px;
        }

        .key-combo {
            background: #1e293b;
            color: #f3f4f6;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid #475569;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 0.82rem;
            display: inline-block;
            box-shadow: 0 2px 0 #0f172a;
        }

        @keyframes screenShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
        }

        .shake {
            animation: screenShake 0.4s ease-in-out;
        }
    </style>
</head>
<body>

    <div id="floatingCloud" class="floating-cloud-payload">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M17.5 19px 5 19a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
        </svg>
        <span id="cloudKeyText">KEY</span>
    </div>

    <div id="page1" class="page active">
        <div class="section-35">
            <div class="logo-brand">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
                <span>CareerBoot</span>
            </div>
            <p class="tagline">Enterprise Excel, Complete Shortcuts & Dashboard Master Academy</p>
            
            <div class="journey-wrapper">
                <svg viewBox="0 0 500 60" width="100%" height="60">
                    <line x1="50" y1="40" x2="450" y2="40" stroke="#1e293b" stroke-width="4" stroke-dasharray="8,8" stroke-linecap="round"></line>
                    
                    <circle cx="50" cy="40" r="14" fill="#3b82f6" fill-opacity="0.15"></circle>
                    <circle cx="50" cy="40" r="6" fill="#3b82f6"></circle>
                    <text x="50" y="18" fill="#60a5fa" font-size="11" text-anchor="middle" font-weight="800">Absolute Beginner</text>
                    
                    <circle cx="450" cy="40" r="14" fill="#10b981" fill-opacity="0.15"></circle>
                    <circle cx="450" cy="40" r="6" fill="#10b981"></circle>
                    <text x="450" y="18" fill="#34d399" font-size="11" text-anchor="middle" font-weight="800">Dashboard & Pro Expert</text>

                    <g id="walker" transform="translate(50, 0)">
                        <circle cx="0" cy="18" r="7" fill="#fbcfe8"></circle>
                        <path d="M -5 26 C -5 23 5 23 5 26 L 4 40 L -4 40 Z" fill="#3b82f6"></path>
                        <line x1="-2" y1="40" x2="-6" y2="55" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"></line>
                        <line x1="2" y1="40" x2="6" y2="55" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"></line>
                    </g>
                </svg>
            </div>
        </div>

        <div class="section-15">
            <input type="password" id="secretKey" class="input-box" placeholder="Passcode" autocomplete="off">
            <button class="btn-unlock" id="submitBtn">Enter Academy</button>
        </div>

        <div class="section-50">
            <svg id="workstationSvg" width="280" height="180" viewBox="0 0 280 180">
                <defs>
                    <linearGradient id="deskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#334155"/>
                        <stop offset="100%" stop-color="#1e293b"/>
                    </linearGradient>
                </defs>

                <rect x="20" y="130" width="240" height="10" rx="5" fill="url(#deskGrad)"></rect>
                <rect x="45" y="140" width="10" height="30" rx="2" fill="#1e293b"></rect>
                <rect x="225" y="140" width="10" height="30" rx="2" fill="#1e293b"></rect>

                <rect x="80" y="45" width="120" height="70" rx="8" fill="#0f172a" stroke="#334155" stroke-width="3"></rect>
                <rect id="screenGlow" x="85" y="50" width="110" height="60" rx="5" fill="#020617"></rect>
                <rect x="135" y="115" width="10" height="15" fill="#334155"></rect>
                <rect x="120" y="128" width="40" height="3" rx="1.5" fill="#475569"></rect>

                <g id="sittingDeveloper">
                    <rect x="195" y="55" width="10" height="70" rx="5" fill="#1e293b"></rect>
                    <rect x="180" y="120" width="35" height="8" rx="4" fill="#1e293b"></rect>
                    <circle cx="200" cy="65" r="10" fill="#fbcfe8"></circle>
                    <path d="M 192 63 C 195 56 205 56 208 63 Z" fill="#0f172a"></path>
                    <path d="M 194 76 C 190 85 190 105 194 115 L 206 115 C 210 105 210 85 206 76 Z" fill="#10b981"></path>
                    <path id="developerArm" d="M 200 82 Q 175 100 160 125" stroke="#10b981" stroke-width="4.5" stroke-linecap="round" fill="none"></path>
                    <path d="M 200 115 L 185 135 L 185 160" stroke="#1e293b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
                </g>
            </svg>

            <div id="statusPill" class="status-pill"></div>
        </div>
    </div>

    <div id="page2" class="page">
        <header class="app-header">
            <div>
                <h3 style="font-weight: 800; font-size: 1.2rem;">CareerBoot Portal</h3>
                <p style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Job-Oriented Master Syllabus</p>
            </div>
            <div class="nav-controls">
                <button class="nav-btn" id="p2HomeBtn">Logout</button>
            </div>
        </header>
        <div class="container">
            <p style="color: #60a5fa; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Select Modules</p>
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
                    <div class="card-sub">SUM, AVERAGE, COUNT, COUNTA, MAX, MIN & Math Logic</div>
                </button>
                <button class="card-btn" data-cat="logical_text">
                    <div class="card-icon">🔤</div>
                    <div class="card-title">4. Text, Date & Logic Formulas</div>
                    <div class="card-sub">IF, AND, OR, IFERROR, CONCAT, TEXTJOIN, TRIM, TODAY</div>
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

    <div id="page3" class="page">
        <header class="app-header">
            <h3 id="categoryTitle" style="font-weight: 800; font-size: 1.15rem;">Topics</h3>
            <div class="nav-controls">
                <button class="nav-btn" id="p3BackBtn">Back</button>
                <button class="nav-btn" id="p3HomeBtn">Home</button>
            </div>
        </header>
        <div class="container">
            <div id="subCategoryList" class="topic-list"></div>
        </div>
    </div>

    <div id="page4" class="page">
        <header class="app-header">
            <h3 id="topicTitle" style="font-weight: 800; font-size: 1.15rem;">Lesson</h3>
            <div class="nav-controls">
                <button class="nav-btn" id="p4BackBtn">Back</button>
                <button class="nav-btn" id="p4HomeBtn">Home</button>
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

    <div id="pageAdmin" class="page">
        <header class="app-header" style="border-bottom-color: #f59e0b;">
            <h3 style="color: #f59e0b; font-weight: 800;">Admin Center</h3>
            <div class="nav-controls">
                <button class="nav-btn" id="adminBackBtn">Dashboard</button>
                <button class="nav-btn" id="adminHomeBtn">Logout</button>
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
        var USER_KEY = "EXCEL2026";
        var ADMIN_KEY = "ADMIN2026";
        var currentCatKey = "basic_shortcuts";

        function navigateTo(pageId) {
            var pages = document.querySelectorAll('.page');
            for (var i = 0; i < pages.length; i++) {
                pages[i].classList.remove('active');
            }
            var targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            window.scrollTo(0, 0);
        }

        var walkerPos = 50;
        setInterval(function() {
            var walker = document.getElementById('walker');
            if (walker) {
                walkerPos += 0.5;
                if (walkerPos > 450) walkerPos = 50;
                walker.setAttribute('transform', 'translate(' + walkerPos + ', 0)');
            }
        }, 30);

        function triggerCloudAuthentication() {
            var inputElem = document.getElementById('secretKey');
            var keyVal = inputElem.value.trim();
            var statusPill = document.getElementById('statusPill');
            var screenGlow = document.getElementById('screenGlow');
            var workstationSvg = document.getElementById('workstationSvg');

            if (!keyVal) {
                statusPill.style.color = '#ef4444';
                statusPill.style.background = 'rgba(239, 68, 68, 0.12)';
                statusPill.innerHTML = "⚠️ Please enter passcode!";
                return;
            }

            statusPill.innerHTML = "";
            statusPill.style.background = "transparent";

            var inputRect = inputElem.getBoundingClientRect();
            var screenRect = screenGlow.getBoundingClientRect();

            var startX = inputRect.left + (inputRect.width / 2) - 40;
            var startY = inputRect.top;

            var endX = screenRect.left + (screenRect.width / 2) - 15;
            var endY = screenRect.top + (screenRect.height / 2) - 10;

            var deltaX = endX - startX;
            var deltaY = endY - startY;

            var floatingCloud = document.getElementById('floatingCloud');
            document.getElementById('cloudKeyText').innerText = keyVal;

            floatingCloud.style.left = startX + 'px';
            floatingCloud.style.top = startY + 'px';
            floatingCloud.style.setProperty('--target-x', deltaX + 'px');
            floatingCloud.style.setProperty('--target-y', deltaY + 'px');

            floatingCloud.classList.remove('animating-cloud');
            void floatingCloud.offsetWidth;
            floatingCloud.classList.add('animating-cloud');

            setTimeout(function() {
                if (keyVal === USER_KEY || keyVal === ADMIN_KEY) {
                    screenGlow.setAttribute('fill', '#10b981');
                    statusPill.style.color = '#34d399';
                    statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
                    statusPill.innerHTML = "✓ Passcode Authenticated! Granting Access...";
                } else {
                    screenGlow.setAttribute('fill', '#ef4444');
                    statusPill.style.color = '#f87171';
                    statusPill.style.background = 'rgba(239, 68, 68, 0.15)';
                    statusPill.innerHTML = "❌ Invalid Passcode! Access Denied";
                    workstationSvg.classList.add('shake');
                }
            }, 2500);

            setTimeout(function() {
                floatingCloud.classList.remove('animating-cloud');
                workstationSvg.classList.remove('shake');

                if (keyVal === USER_KEY || keyVal === ADMIN_KEY) {
                    if (keyVal === ADMIN_KEY) {
                        injectAdminTile();
                    }
                    screenGlow.setAttribute('fill', '#020617');
                    statusPill.innerHTML = "";
                    statusPill.style.background = "transparent";
                    inputElem.value = "";
                    navigateTo('page2');
                } else {
                    screenGlow.setAttribute('fill', '#020617');
                }
            }, 4000);
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
                        tip: "💡 Universal Rule: Har 5 minute me `Ctrl + S` dabane ki aadat banayein taaki system crash hone par data na khoye."
                    },
                    {
                        name: "Selection & Fast Navigation Keys",
                        concept: "Mouse bilkul chhod kar keyborad se fast jump aur continuous selection karna.",
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
                        tip: "💡 Interview Speed Tip: Interviewer ke samne mouse bypass karke `Ctrl + Shift + Down` se data select karne se candidate instantly highly proficient lagta hai."
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
                        tip: "💡 Pro Formatting Tip: `Alt + H + O + I` dabate hi saare columns auto-expand hokar tidy ho jaate hain."
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
                        tip: "💡 Interview Question: 'Formula hata kar sirf value paste kaise karenge?' Answer: `Ctrl + Alt + V` daba kar Values choose karenge."
                    }
                ]
            },
            basic_formulas: {
                title: "3. Core Basic Formulas",
                subCategories: [
                    {
                        name: "1. SUM, AVERAGE & MATH (Basic Calculations)",
                        concept: "Excel me calculations hamesha `=` sign se start hoti hain. SUM jodne ke liye aur AVERAGE ausat nikalne ke liye use hota hai.",
                        scenario: "Accounting & Logistics: Daily Sales Total calculate karna aur Per-Day Average Dispatch Speed nikalna.",
                        code: "// Sum Range A1 to A20\\n=SUM(A1:A20)\\n\\n// Calculate Average Sale\\n=AVERAGE(B1:B50)\\n\\n// Basic Division / Subtraction\\n=(A2 - B2) / C2",
                        tip: "💡 Basic Rule: Kabhi bhi numbers ko manual `=10+20` mat likho, cell reference `=A1+B1` use karo taaki data change hone par result auto-update ho."
                    },
                    {
                        name: "2. COUNT, COUNTA & COUNTBLANK (Ginti Karna)",
                        concept: "COUNT sirf numbers ko ginta hai. COUNTA Text aur Numbers dono ko ginta hai. COUNTBLANK khali cells ko ginta hai.",
                        scenario: "BPO Call Tracker: Total calls handled (COUNTA), non-numeric error entries (COUNT), aur missing agent feedback (COUNTBLANK) ginnna.",
                        code: "// Count Numeric Entries Only\\n=COUNT(A2:A500)\\n\\n// Count All Filled Cells (Text + Numbers)\\n=COUNTA(A2:A500)\\n\\n// Count Blank Cells (Missing Data)\\n=COUNTBLANK(A2:A500)",
                        tip: "💡 Interview Tip: Interviewer puchhega 'COUNT aur COUNTA me kya farq hai?' COUNTA non-empty cells ginta hai jabki COUNT sirf numbers."
                    },
                    {
                        name: "3. MAX, MIN & LARGE (Highest & Lowest Values)",
                        concept: "Data list me sabse bada number (MAX) ya sabse chhota number (MIN) dhoondhna.",
                        scenario: "Logistics Freight Cost: Maximum Freight Charge kitna gaya aur minimum shipping time kitna laga.",
                        code: "// Maximum Value\\n=MAX(C2:C1000)\\n\\n// Minimum Value\\n=MIN(C2:C1000)\\n\\n// 2nd Highest Sales Amount\\n=LARGE(C2:C1000, 2)",
                        tip: "💡 Pro Tip: `LARGE(range, 2)` se 2nd highest, aur `LARGE(range, 3)` se 3rd highest number nikala ja sakta hai."
                    }
                ]
            },
            logical_text: {
                title: "4. Text, Date & Logic Formulas",
                subCategories: [
                    {
                        name: "1. IF, AND, OR & IFERROR (Decision Logic)",
                        concept: "Conditions check karna. Agar target achive hua to 'Bonus', varna 'No Bonus'. IFERROR se `#N/A` errors chhupaye jate hain.",
                        scenario: "Payroll & Accounts: Overtime Pay Calculate karna aur Reports me Clean Formatting maintain rakhna.",
                        code: "// Single IF Condition\\n=IF(B2 >= 100, \"Target Achieved\", \"Pending\")\\n\\n// AND Condition (Dono Sahi Hone Chahiye)\\n=IF(AND(B2>=100, C2>=90%), \"Promoted\", \"Retain\")\\n\\n// Clean Errors\\n=IFERROR(VLOOKUP(A2, B:C, 2, FALSE), \"Record Not Found\")",
                        tip: "💡 Quality Rule: Professional Analyst messy `#N/A` ya `#DIV/0!` errors dashboard me kabhi nahi chhodte, IFERROR zaroor use karte hain."
                    },
                    {
                        name: "2. CONCAT, TEXTJOIN, TRIM & Text Cleaning",
                        concept: "Kharaab formatting, extra spaces clean karna aur do-teen columns ka text ek sath jodhna.",
                        scenario: "BPO Data Cleaning: First Name aur Last Name ko combine karna, aur system dump se unwanted spaces hatana.",
                        code: "// Combine Text with Space\\n=CONCATENATE(A2, \" \", B2)\\n\\n// Advanced Modern Join (Delimiter के साथ)\\n=TEXTJOIN(\", \", TRUE, A2:D2)\\n\\n// Extra Spaces Clean Karna\\n=TRIM(A2)\\n\\n// Text Case Change\\n=UPPER(A2) | =LOWER(A2) | =PROPER(A2)",
                        tip: "💡 Real Job Scenario: CRM Data me aksar hidden spaces hoti hain. VLOOKUP fail hone par pehle `TRIM` formula use karein."
                    },
                    {
                        name: "3. TODAY, NOW & DATEDIF (Date Analytics)",
                        concept: "System Date, Time, aur Aging (Do dates ke beech kitne din/mahine beet gaye) calculate karna.",
                        scenario: "Accounting Invoice Aging: Invoice Date se aaj tak kitne din overdue huye hain check karna.",
                        code: "// Current Today Date\\n=TODAY()\\n\\n// Days Overdue (Today minus Invoice Date)\\n=TODAY() - A2\\n\\n// Calculate Age in Years\\n=DATEDIF(A2, TODAY(), \"Y\")",
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
                        code: "// VLOOKUP Syntax: (Search Value, Table Range, Column Index, FALSE for Exact Match)\\n=VLOOKUP(A2, MasterData!A:E, 3, FALSE)\\n\\n// HLOOKUP Syntax\\n=HLOOKUP(A2, PricingTable!A1:Z5, 2, FALSE)",
                        tip: "💡 Crucial VLOOKUP Rules:\\n1. Search Key ID table ke 1st column me honi chahiye.\\n2. Last parameter hamesha `FALSE` ya `0` rakhein."
                    },
                    {
                        name: "2. XLOOKUP (Modern Super Lookup Engine)",
                        concept: "VLOOKUP ki sabhi kamzoriyon ko khatam karne wala sabse advance formula. Ye Left, Right, Up, Down kisi bhi side lookup kar sakta hai.",
                        scenario: "Accounting & Payroll: Left-side lookups jahan VLOOKUP fail hota hai, XLOOKUP 1 second me kar deta hai.",
                        code: "// XLOOKUP Syntax: (Search Item, Search Column, Return Column, Not Found Text)\\n=XLOOKUP(A2, Sheet2!B:B, Sheet2!A:A, \"Customer Not Found\")",
                        tip: "💡 Interview Killer Skill: Interviewer ko bataiye ki 'Main VLOOKUP ke saath-saath modern XLOOKUP follow karta hu kyunki ye fast aur left-lookup supportive hai'."
                    },
                    {
                        name: "3. INDEX + MATCH (Dynamic Dynamic Duo)",
                        concept: "Flexibility ka Baap! Column numbers manual count karne ki zaroorat nahi padti, table dynamic rehti hai.",
                        scenario: "Executive Dashboards: Dynamic dropdown selection ke basis par entire row and column metrics pull karna.",
                        code: "// INDEX(Return Column, MATCH(Lookup Value, Lookup Column, 0))\\n=INDEX(C2:C1000, MATCH(A2, A2:A1000, 0))",
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
                        code: "Step 1: Raw Data me kahin bhi click karke `Ctrl + A` dabaayein.\\nStep 2: Press `Alt + N + V + T` (Insert Pivot Table) -> Press Enter.\\nStep 3: Right Panel se 'Region' ko Rows me drag karein, aur 'Revenue' ko Values me drag karein.\\nStep 4: Values पर Right Click -> Show Values As -> % of Grand Total.",
                        tip: "💡 Dashboard Rule: Pivot Table hamesha Clean Tabular Data par banti hai, merged cells me fail ho jaati hai."
                    },
                    {
                        name: "2. Dynamic Slicers, KPI Cards & Visual Charts",
                        concept: "Executive Visual Dashboard banana jisme Top KPI Cards (Total Sales, Orders, CSAT) aur Live Filter Buttons (Slicers) ho.",
                        scenario: "Logistics Executive Meeting: Slicer par 'North Region' click karte hi pure dashboard ki visual charts live update ho jaati hain.",
                        code: "Step 1: Pivot Table par Click -> PivotTable Analyze Tab -> Click 'Insert Slicer'.\\nStep 2: Tick 'Month', 'Region', 'Product Category' -> OK.\\nStep 3: Pivot Chart Insert karein (`Alt + F1`).\\nStep 4: Slicer Right Click -> Report Connections -> Tick ALL Pivot Tables.",
                        tip: "💡 Pro Executive Design Tip: Dark Gridlines remove karein (`Alt + W + V + G`), clean cards banayein aur premium gradients use karein."
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

        document.addEventListener('DOMContentLoaded', function() {
            var submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.addEventListener('click', triggerCloudAuthentication);

            var secretKeyInput = document.getElementById('secretKey');
            if (secretKeyInput) {
                secretKeyInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') triggerCloudAuthentication();
                });
            }

            document.getElementById('p2HomeBtn').addEventListener('click', function() { navigateTo('page1'); });
            document.getElementById('p3BackBtn').addEventListener('click', function() { navigateTo('page2'); });
            document.getElementById('p3HomeBtn').addEventListener('click', function() { navigateTo('page1'); });
            document.getElementById('p4BackBtn').addEventListener('click', function() { navigateTo('page3'); });
            document.getElementById('p4HomeBtn').addEventListener('click', function() { navigateTo('page1'); });
            document.getElementById('adminBackBtn').addEventListener('click', function() { navigateTo('page2'); });
            document.getElementById('adminHomeBtn').addEventListener('click', function() { navigateTo('page1'); });

            var dashGrid = document.getElementById('dashboardGrid');
            if (dashGrid) {
                var buttons = dashGrid.querySelectorAll('.card-btn');
                buttons.forEach(function(btn) {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CareerBoot Application running on port ${PORT}`);
});
