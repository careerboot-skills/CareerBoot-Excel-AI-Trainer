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
// 4. FULL FRONTEND APPLICATION
// ==========================================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CareerBoot - Ultimate Premium Excel Academy</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        :root {
            --bg-main: #020617;
            --card-bg: rgba(15, 23, 42, 0.9);
            --card-border: rgba(255, 255, 255, 0.1);
            --accent-green: #10b981;
            --accent-blue: #3b82f6;
            --accent-purple: #8b5cf6;
            --accent-gold: #f59e0b;
            --accent-red: #ef4444;
            --text-muted: #94a3b8;
        }
        html, body { width: 100%; min-height: 100vh; background-color: var(--bg-main); color: #f8fafc; overflow-x: hidden; }

        .page { display: none !important; width: 100%; min-height: 100vh; position: relative; }
        .page.active { display: flex !important; flex-direction: column; }

        /* ================= PAGE 1: ANIMATED LOGIN ================= */
        #page1 { height: 100vh; max-height: 100vh; overflow: hidden; background: #020617; position: relative; }

        /* 35% TOP SECTION */
        .sec-35 { height: 35vh; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--card-border); background: linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 0.9) 100%); }
        .logo-brand { display: flex; align-items: center; gap: 10px; font-size: 1.8rem; font-weight: 800; background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #60a5fa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .welcome-note { color: var(--text-muted); font-size: 0.82rem; font-weight: 600; text-align: center; }

        /* Walking Man Track */
        .walk-track-container { width: 100%; max-width: 480px; position: relative; padding: 8px 0; }
        .walk-labels { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 4px; }
        .walk-labels .interest { color: #f59e0b; }
        .walk-labels .success { color: #10b981; }
        .walk-line { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; position: relative; overflow: hidden; }
        .walk-progress { height: 100%; width: 100%; background: linear-gradient(90deg, #f59e0b, #10b981); animation: lineGlow 3s infinite linear; }

        /* SVG Walking Man */
        .walking-man-svg { position: absolute; top: -22px; left: 0; width: 30px; height: 30px; animation: walkAnim 6s infinite linear; }

        @keyframes walkAnim {
            0% { left: 0%; transform: scaleX(1); }
            48% { left: 88%; transform: scaleX(1); }
            50% { left: 88%; transform: scaleX(-1); }
            98% { left: 0%; transform: scaleX(-1); }
            100% { left: 0%; transform: scaleX(1); }
        }

        /* 15% MIDDLE SECTION */
        .sec-15 { height: 15vh; background: #090d16; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--card-border); position: relative; z-index: 10; }
        .input-box { padding: 14px 18px; font-size: 0.95rem; font-weight: 700; border-radius: 14px; border: 2px solid #1e293b; background: #0f172a; color: #ffffff; outline: none; width: 55%; max-width: 240px; text-align: center; letter-spacing: 2px; }
        .input-box:focus { border-color: var(--accent-green); box-shadow: 0 0 25px rgba(16, 185, 129, 0.35); }
        .btn-unlock { padding: 14px 22px; font-size: 0.95rem; font-weight: 800; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; border: none; border-radius: 14px; cursor: pointer; }

        /* 50% BOTTOM SECTION */
        .sec-50 { height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 60%, #0f172a 0%, #020617 100%); position: relative; overflow: hidden; }
        
        /* Floating Cloud Key Animation */
        .cloud-key { position: absolute; top: -40px; opacity: 0; background: rgba(59, 130, 246, 0.9); color: #fff; padding: 8px 16px; border-radius: 20px; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.85rem; box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); pointer-events: none; z-index: 50; transition: transform 2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease; }

        /* Desk & Computer Man SVG Graphics */
        .desk-scene { width: 220px; height: 180px; position: relative; }
        .computer-screen { fill: #1e293b; stroke: #3b82f6; stroke-width: 3; transition: all 0.5s ease; }
        .man-head { fill: #f59e0b; transition: fill 0.3s ease; }
        .status-bubble { opacity: 0; transition: opacity 0.3s ease; font-weight: 800; font-size: 12px; }

        /* State Animations */
        .scene-success .computer-screen { fill: rgba(16, 185, 129, 0.2); stroke: #10b981; filter: drop-shadow(0 0 15px #10b981); }
        .scene-success .man-head { fill: #10b981; }
        .scene-error .computer-screen { fill: rgba(239, 68, 68, 0.2); stroke: #ef4444; filter: drop-shadow(0 0 15px #ef4444); }
        .scene-error .man-head { fill: #ef4444; }

        /* ================= NAVIGATION & APP SHELL ================= */
        .app-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--card-border); position: sticky; top: 0; z-index: 100; }
        .nav-controls { display: flex; gap: 8px; }
        .nav-btn { padding: 8px 14px; background: rgba(30, 41, 59, 0.8); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.82rem; }
        .nav-btn-home { background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: rgba(16, 185, 129, 0.4); }
        .container { padding: 24px 20px; max-width: 1000px; margin: 0 auto; width: 100%; }

        /* GRID BUTTON LAYOUT */
        .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; margin-top: 20px; }
        .hub-btn { background: var(--card-bg); border: 1px solid var(--card-border); padding: 22px 18px; border-radius: 18px; color: #ffffff; text-align: left; cursor: pointer; transition: all 0.25s ease; display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; }
        .hub-btn:hover { transform: translateY(-4px); border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .hub-icon { font-size: 2rem; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); border-radius: 12px; }
        .hub-title { font-size: 1.05rem; font-weight: 800; color: #f8fafc; }
        .hub-sub { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }

        .topic-list { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
        .topic-btn { background: var(--card-bg); border: 1px solid var(--card-border); padding: 18px 20px; border-radius: 14px; color: #f8fafc; font-size: 0.95rem; font-weight: 700; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease; }
        .topic-btn:hover { border-color: var(--accent-green); background: rgba(15, 23, 42, 0.95); }
        .arrow-badge { width: 30px; height: 30px; background: rgba(16, 185, 129, 0.1); color: var(--accent-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; }

        /* LESSON CARDS */
        .lesson-card { background: var(--card-bg); border-radius: 20px; padding: 26px; border: 1px solid var(--card-border); }
        .lesson-header { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--card-border); }
        .section-label { font-size: 0.8rem; color: #60a5fa; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 20px; margin-bottom: 8px; }
        .explanation-text { color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; }
        .code-block { background: #020617; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; font-family: 'JetBrains Mono', monospace; color: #34d399; margin: 10px 0; font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; }

        .shortcut-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.88rem; }
        .shortcut-table th, .shortcut-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .shortcut-table th { background: rgba(30, 41, 59, 0.8); color: #60a5fa; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; }
        .key-combo { background: #1e293b; color: #f3f4f6; padding: 3px 7px; border-radius: 6px; border: 1px solid #475569; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.8rem; display: inline-block; }
    </style>
</head>
<body>

    <!-- ================= PAGE 1: LOGIN PORTAL ================= -->
    <div id="page1" class="page active">
        <!-- 35% TOP AREA -->
        <div class="sec-35">
            <div class="logo-brand">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                <span>CareerBoot</span>
            </div>
            <p class="welcome-note">Welcome to the Complete Enterprise Excel & Dashboard Master Academy</p>
            
            <div class="walk-track-container">
                <div class="walk-labels">
                    <span class="interest">💡 Interest</span>
                    <span class="success">🚀 Success</span>
                </div>
                <div class="walk-line">
                    <div class="walk-progress"></div>
                </div>
                <!-- Animated Walking Man SVG -->
                <svg class="walking-man-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="20" r="12" fill="#f59e0b" />
                    <path d="M50 32 L50 65 M50 42 L30 55 M50 42 L70 55 M50 65 L35 90 M50 65 L65 90" stroke="#f59e0b" stroke-width="8" stroke-linecap="round" />
                </svg>
            </div>
        </div>

        <!-- 15% MIDDLE AREA -->
        <div class="sec-15">
            <input type="password" id="secretKey" class="input-box" placeholder="Secret Key" autocomplete="off">
            <button class="btn-unlock" onclick="startAuthenticationSequence()">Unlock</button>
        </div>

        <!-- 50% BOTTOM AREA -->
        <div class="sec-50" id="sceneContainer">
            <!-- Floating Flying Cloud Key -->
            <div id="cloudKey" class="cloud-key">☁️ <span id="cloudText">KEY</span></div>

            <!-- Man at Computer SVG Scene -->
            <svg class="desk-scene" viewBox="0 0 200 160">
                <!-- Desk -->
                <rect x="20" y="120" width="160" height="10" rx="3" fill="#334155" />
                <rect x="35" y="130" width="10" height="30" fill="#1e293b" />
                <rect x="155" y="130" width="10" height="30" fill="#1e293b" />
                
                <!-- Computer Monitor -->
                <rect id="compScreen" class="computer-screen" x="110" y="50" width="65" height="50" rx="5" />
                <rect x="137" y="100" width="10" height="20" fill="#475569" />
                <rect x="125" y="118" width="34" height="4" fill="#475569" />

                <!-- Man Sitting -->
                <circle id="manHead" class="man-head" cx="60" cy="65" r="14" />
                <!-- Torso -->
                <path d="M40 120 C 40 90, 80 90, 80 120" fill="#3b82f6" />
                <!-- Arms to Keyboard -->
                <path d="M65 95 L 105 112" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" />

                <!-- Status Feedback Speech Bubble -->
                <g id="statusBubble" class="status-bubble">
                    <rect x="90" y="15" width="100" height="28" rx="8" fill="#1e293b" stroke="#60a5fa" stroke-width="1.5" />
                    <text id="statusText" x="140" y="33" fill="#ffffff" text-anchor="middle">Verifying...</text>
                </g>
            </svg>
        </div>
    </div>

    <!-- ================= PAGE 2: MAIN CATEGORIES HUB ================= -->
    <div id="page2" class="page">
        <header class="app-header">
            <div>
                <h3 style="font-weight: 800; font-size: 1.1rem;">Excel Master Academy</h3>
                <p style="font-size: 0.75rem; color: var(--text-muted);">Comprehensive Onion-Layer Syllabus</p>
            </div>
            <div class="nav-controls">
                <button class="nav-btn nav-btn-home" onclick="goHome()">Home (Page 1)</button>
            </div>
        </header>
        <div class="container">
            <div class="grid-layout" id="mainCategoryGrid"></div>
        </div>
    </div>

    <!-- ================= PAGE 3: SUB-CATEGORY TOPICS ================= -->
    <div id="page3" class="page">
        <header class="app-header">
            <h3 id="page3Title" style="font-weight: 800; font-size: 1.1rem;">Category Topics</h3>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page2')">Back</button>
                <button class="nav-btn nav-btn-home" onclick="goHome()">Home</button>
            </div>
        </header>
        <div class="container">
            <div id="subTopicList" class="topic-list"></div>
        </div>
    </div>

    <!-- ================= PAGE 4: DEEP LESSON VIEW ================= -->
    <div id="page4" class="page">
        <header class="app-header">
            <h3 id="page4Title" style="font-weight: 800; font-size: 1.1rem;">Lesson</h3>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page3')">Back</button>
                <button class="nav-btn nav-btn-home" onclick="goHome()">Home</button>
            </div>
        </header>
        <div class="container">
            <div class="lesson-card">
                <h2 id="lessonTitle" style="color: #f8fafc; font-size: 1.3rem; font-weight: 800;">Topic</h2>
                
                <div class="section-label">📌 Concept & Real-World Application</div>
                <div id="lessonConcept" class="explanation-text"></div>

                <div id="lessonCodeSection">
                    <div class="section-label">⚡ Syntax / Step-by-Step Execution</div>
                    <div id="lessonCode" class="code-block"></div>
                </div>

                <div id="lessonTableContainer"></div>
            </div>
        </div>
    </div>

    <script>
        var historyStack = [];

        function navigateTo(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            window.scrollTo(0, 0);
        }

        function goHome() {
            navigateTo('page1');
            resetLoginScene();
        }

        function resetLoginScene() {
            document.getElementById('secretKey').value = '';
            document.getElementById('sceneContainer').className = 'sec-50';
            document.getElementById('statusBubble').style.opacity = '0';
            var cloud = document.getElementById('cloudKey');
            cloud.style.opacity = '0';
            cloud.style.transform = 'translate(0, 0)';
        }

        /* 2-SECOND CLOUD TRAVEL AUTHENTICATION ANIMATION */
        async function startAuthenticationSequence() {
            var keyInput = document.getElementById('secretKey').value.trim();
            if (!keyInput) return;

            var cloud = document.getElementById('cloudKey');
            var cloudText = document.getElementById('cloudText');
            var scene = document.getElementById('sceneContainer');
            var statusBubble = document.getElementById('statusBubble');
            var statusText = document.getElementById('statusText');

            cloudText.innerText = keyInput;
            cloud.style.opacity = '1';
            cloud.style.transform = 'translate(0, 0)';
            
            // Trigger 2-second flight animation down to the computer
            setTimeout(() => {
                cloud.style.transform = 'translate(0px, 180px) scale(0.6)';
            }, 50);

            // Wait 2 seconds for travel duration
            await new Promise(r => setTimeout(r, 2000));

            cloud.style.opacity = '0';
            statusBubble.style.opacity = '1';
            statusText.innerText = "Checking...";

            try {
                const res = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passcode: keyInput })
                });
                const data = await res.json();

                if (data.success) {
                    scene.className = 'sec-50 scene-success';
                    statusText.innerText = "Access Granted! 🎉";
                    setTimeout(() => {
                        renderMainPage();
                        navigateTo('page2');
                    }, 1000);
                } else {
                    scene.className = 'sec-50 scene-error';
                    statusText.innerText = "Invalid Key! ❌";
                }
            } catch (err) {
                scene.className = 'sec-50 scene-error';
                statusText.innerText = "Server Error!";
            }
        }

        /* COMPREHENSIVE ONION-LAYER SYLLABUS DATA COVERING EVERYTHING EXCEL */
        var excelMasterTree = {
            formulas: {
                title: "📐 All Formulas Engine",
                desc: "Math, Logic, Text, Lookup, Dynamic Arrays & Financial Math",
                subCategories: [
                    {
                        name: "Math & Statistical Formulas",
                        concept: "Core numerical computing used in finance, accounting, and operational reports.",
                        code: "=SUM(A1:A50)\n=AVERAGE(B1:B20)\n=COUNTIF(C1:C100, \">1000\")\n=SUMIFS(D1:D100, A1:A100, \"North\", B1:B100, \"Completed\")"
                    },
                    {
                        name: "Lookup & Matching Engines",
                        concept: "Pulling matching records across multiple sheets and databases dynamically.",
                        code: "// Standard VLOOKUP\n=VLOOKUP(A2, Data!A:E, 3, FALSE)\n\n// Modern XLOOKUP (Supports Left-Lookups & Custom Error text)\n=XLOOKUP(A2, Data!B:B, Data!A:A, \"Not Found\")\n\n// Flexible INDEX-MATCH\n=INDEX(Data!C:C, MATCH(A2, Data!A:A, 0))"
                    },
                    {
                        name: "Dynamic Array Formulas (Modern Excel 365)",
                        concept: "Formulas that automatically spill multiple results into adjacent cells without manual dragging.",
                        code: "// Filter Data Dynamically\n=FILTER(A2:D100, C2:C100=\"Delivered\")\n\n// Sort Unique Records\n=SORT(UNIQUE(B2:B500))"
                    }
                ]
            },
            shortcuts: {
                title: "⚡ All Shortcut Keys (Basic to Pro)",
                desc: "Ribbon Hotkeys, Formatting, Navigation & Power Hacks",
                subCategories: [
                    {
                        name: "Pro-Level Alt Hotkey Shortcuts",
                        concept: "Execute complex ribbon operations completely bypassing the mouse.",
                        table: [
                            { key: "Alt + H + L", desc: "Open Conditional Formatting Menu" },
                            { key: "Alt + H + O + I", desc: "Auto-Fit Column Width instantly" },
                            { key: "Alt + A + T", desc: "Toggle Auto-Filter On / Off" },
                            { key: "Alt + N + V + T", desc: "Insert Pivot Table" },
                            { key: "Alt + E + S + V + Enter", desc: "Paste Values Only (Remove Formulas)" }
                        ]
                    },
                    {
                        name: "Fast Data Navigation & Selection Keys",
                        concept: "Jump through thousands of rows in milliseconds.",
                        table: [
                            { key: "Ctrl + Shift + Down", desc: "Select down to the last continuous data cell" },
                            { key: "Ctrl + Arrow Keys", desc: "Jump to the edge of the data region" },
                            { key: "Ctrl + Backspace", desc: "Scroll view back to active cell" }
                        ]
                    }
                ]
            },
            dashboards: {
                title: "📊 Complete Dashboard Architecture",
                desc: "Pivot Tables, Dynamic Slicers, KPI Cards & Interactive Charts",
                subCategories: [
                    {
                        name: "Pivot Tables & Dynamic Slicers",
                        concept: "Transform unstructured raw data into dynamic executive summaries with interactive buttons.",
                        code: "1. Press Alt + N + V + T to generate Pivot Table.\n2. Drag metrics to Rows and Values.\n3. Click PivotTable Analyze -> Insert Slicer.\n4. Connect Slicers across all pivot tables via Report Connections."
                    }
                ]
            },
            power_query: {
                title: "🔄 Power Query & Data Cleanup",
                desc: "ETL Engine, Unpivoting, Merging & Automated Data Transformations",
                subCategories: [
                    {
                        name: "Automated Data Cleaning",
                        concept: "Import messy CSV/Excel files and clean them automatically with repeatable steps.",
                        code: "1. Data Tab -> Get Data -> From File / Folder.\n2. Remove Blank Rows & Trim Extra Spaces.\n3. Split Column by Delimiter (Comma/Space).\n4. Unpivot Columns for Clean Database Structure."
                    }
                ]
            },
            vba_macros: {
                title: "🤖 VBA & Automation Macros",
                desc: "Automating Daily Tasks, Custom UserForms & Loop Scripts",
                subCategories: [
                    {
                        name: "Basic Task Automation Macro",
                        concept: "Write scripts to execute repetitive reporting workflows in 1 click.",
                        code: "Sub ExportReportPDF()\n    ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, _\n    Filename:=\"C:\\Reports\\DailyReport.pdf\"\n    MsgBox \"Report Saved Successfully!\", vbInformation\nEnd Sub"
                    }
                ]
            }
        };

        function renderMainPage() {
            var grid = document.getElementById('mainCategoryGrid');
            grid.innerHTML = '';

            Object.keys(excelMasterTree).forEach(key => {
                var item = excelMasterTree[key];
                var btn = document.createElement('button');
                btn.className = 'hub-btn';
                btn.onclick = () => openSubTopics(item);
                btn.innerHTML = \`
                    <div class="hub-title">\${item.title}</div>
                    <div class="hub-sub">\${item.desc}</div>
                \`;
                grid.appendChild(btn);
            });
        }

        function openSubTopics(category) {
            document.getElementById('page3Title').innerText = category.title;
            var list = document.getElementById('subTopicList');
            list.innerHTML = '';

            category.subCategories.forEach(sub => {
                var btn = document.createElement('button');
                btn.className = 'topic-btn';
                btn.onclick = () => openLesson(category.title, sub);
                btn.innerHTML = \`<span>\${sub.name}</span><div class="arrow-badge">→</div>\`;
                list.appendChild(btn);
            });

            navigateTo('page3');
        }

        function openLesson(parentTitle, sub) {
            document.getElementById('page4Title').innerText = parentTitle;
            document.getElementById('lessonTitle').innerText = sub.name;
            document.getElementById('lessonConcept').innerText = sub.concept || "Concept overview.";

            var codeSec = document.getElementById('lessonCodeSection');
            if (sub.code) {
                codeSec.style.display = 'block';
                document.getElementById('lessonCode').innerText = sub.code;
            } else {
                codeSec.style.display = 'none';
            }

            var tblContainer = document.getElementById('lessonTableContainer');
            if (sub.table && sub.table.length > 0) {
                var html = '<table class="shortcut-table"><thead><tr><th>Shortcut Key</th><th>Function / Action</th></tr></thead><tbody>';
                sub.table.forEach(r => {
                    html += \`<tr><td><span class="key-combo">\${r.key}</span></td><td style="color:#cbd5e1;">\${r.desc}</td></tr>\`;
                });
                html += '</tbody></table>';
                tblContainer.innerHTML = html;
            } else {
                tblContainer.innerHTML = '';
            }

            navigateTo('page4');
        }
    </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CareerBoot Application running on port ${PORT}`);
});
