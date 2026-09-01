require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// --- 1. MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Atlas Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Error:", err));
} else {
  console.warn("WARNING: MONGO_URI environment variable missing.");
}

const chatSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});
const Chat = mongoose.model('Chat', chatSchema);

// --- 2. AUTH & AI CONFIGURATION ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "720197932809-gg6bia1caq1pcqjsb2cil4vc6hm2r2aj.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });

// --- 3. API ENDPOINTS ---
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    res.json({ 
      success: true, 
      user: { name: payload.name, email: payload.email, picture: payload.picture } 
    });
  } catch (error) {
    res.status(401).json({ success: false, error: "Google verification failed." });
  }
});

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { userEmail, text } = req.body;
    if (!userEmail) return res.status(401).json({ success: false, error: "Unauthorized access" });

    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userEmail, message: text || '[File/Image Attached]', sender: 'user' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let promptContents = [
      "You are CareerBoot AI Excel Trainer. Provide exact MS Excel formulas, VBA macros, or step-by-step error solutions (#REF!, #N/A, VLOOKUP, XLOOKUP)."
    ];

    if (text) promptContents.push(text);

    if (req.file) {
      promptContents.push({
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      });
    }

    const aiResult = await model.generateContent(promptContents);
    const botAnswer = aiResult.response.text();

    if (mongoose.connection.readyState === 1) {
      await Chat.create({ userEmail, message: botAnswer, sender: 'bot' });
    }

    res.json({ success: true, answer: botAnswer });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ success: false, error: "AI Engine processing error." });
  }
});

// --- 4. FRONTEND UI EMBEDDED ---
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareerBoot AI - Complete Excel Mastery Hub</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <!-- Luckysheet CDN -->
  <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/pluginsCss.css' />
  <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/plugins.css' />
  <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css' />
  <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/assets/iconfont/iconfont.css' />
  <script src="https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/plugin.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js"></script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #070d19; color: #fff; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

    #login-overlay {
      position: fixed; inset: 0; background: #070d19; z-index: 99999;
      display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px;
    }
    .login-card {
      background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.8);
    }
    
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

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 15px; }
    .card { background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 18px; }
    .card h3 { color: #38bdf8; margin-bottom: 8px; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .card code { background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 12px; }

    table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #0f172a; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    th { background: #1e293b; color: #38bdf8; }

    pre { background: #070d19; padding: 12px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2); font-size: 12px; color: #38bdf8; overflow-x: auto; margin-top: 8px; }

    .chat-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .msg { max-width: 80%; padding: 14px 18px; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    .msg.bot { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.2); align-self: flex-start; }
    .msg.user { background: #0284c7; align-self: flex-end; }
    .controls { padding: 16px; background: #0f172a; border-top: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; gap: 10px; }
    input[type="text"] { flex: 1; background: #070d19; border: 1px solid rgba(56, 189, 248, 0.3); color: #fff; padding: 12px; border-radius: 8px; outline: none; }
    button { background: #0284c7; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .file-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #fff; }
  </style>
</head>
<body>

  <div id="login-overlay">
    <div class="login-card">
      <h2 style="margin-bottom: 15px; color: #38bdf8;">CAREERBOOT EXCEL HUB</h2>
      <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">Verification required to access Excel Platform.</p>
      
      <div id="g_id_onload"
           data-client_id="${GOOGLE_CLIENT_ID}"
           data-callback="handleCredentialResponse"
           data-auto_select="false"
           data-itp_support="true">
      </div>
      <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="filled_blue" data-size="large"></div>
    </div>
  </div>

  <div id="app-container">
    <sidebar>
      <div class="sidebar-header"><i class="fa-solid fa-file-excel"></i> Excel Mastery Hub</div>
      <ul class="nav-links">
        <li class="nav-item active" onclick="switchTab('ai-trainer')"><i class="fa-solid fa-robot"></i> AI Excel Trainer</li>
        <li class="nav-item" onclick="switchTab('live-excel')"><i class="fa-solid fa-table"></i> Live Practice Screen</li>
        <li class="nav-item" onclick="switchTab('shortcuts')"><i class="fa-solid fa-keyboard"></i> Shortcuts (All Categories)</li>
        <li class="nav-item" onclick="switchTab('formulas')"><i class="fa-solid fa-calculator"></i> All Formulas & Functions</li>
        <li class="nav-item" onclick="switchTab('dashboard-tutorials')"><i class="fa-solid fa-chart-pie"></i> Dashboard Tutorials</li>
        <li class="nav-item" onclick="switchTab('pivot-powerquery')"><i class="fa-solid fa-database"></i> Pivot & Power Query</li>
        <li class="nav-item" onclick="switchTab('vba-macros')"><i class="fa-solid fa-code"></i> VBA Macros & Automation</li>
        <li class="nav-item" onclick="switchTab('charts-viz')"><i class="fa-solid fa-chart-column"></i> Charts & Visualization</li>
        <li class="nav-item" onclick="switchTab('error-solving')"><i class="fa-solid fa-triangle-exclamation"></i> Error Troubleshooting</li>
      </ul>
    </sidebar>

    <main>
      <header>
        <strong id="active-tab-title" style="color: #38bdf8;">AI Excel Trainer</strong>
        <span style="font-size: 11px; color: #10b981;"><i class="fa-solid fa-database"></i> 24h Auto-Purge Active</span>
      </header>

      <!-- 1. AI CHAT -->
      <div id="ai-trainer" class="tab-content active">
        <div class="chat-area" id="chat">
          <div class="msg bot">Welcome! Type queries, upload Excel/image files, or use voice input to solve complex errors, VBA, or formulas.</div>
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
            <input type="text" id="userInput" placeholder="Ask Excel formula, VBA macro, or error query..." onkeypress="handleKeyPress(event)">
            <button onclick="sendQuery()">Send</button>
          </div>
        </div>
      </div>

      <!-- 2. LIVE EXCEL PRACTICE SCREEN -->
      <div id="live-excel" class="tab-content" style="padding: 0; position: relative;">
        <div id="luckysheet" style="margin:0px;padding:0px;position:absolute;width:100%;height:100%;left:0px;top:0px;"></div>
      </div>

      <!-- 3. ALL SHORTCUT KEYS -->
      <div id="shortcuts" class="tab-content">
        <h2 style="color: #38bdf8;">Complete Excel Keyboard Shortcuts Reference</h2>
        <table>
          <thead>
            <tr><th>Category</th><th>Shortcut Key</th><th>Function / Action</th></tr>
          </thead>
          <tbody>
            <tr><td>Editing</td><td><b>Ctrl + C / Ctrl + V</b></td><td>Copy & Paste Data</td></tr>
            <tr><td>Editing</td><td><b>Ctrl + Alt + V</b></td><td>Paste Special (Values, Formats, Formulas)</td></tr>
            <tr><td>Editing</td><td><b>Ctrl + Z / Ctrl + Y</b></td><td>Undo / Redo Last Action</td></tr>
            <tr><td>Formulas</td><td><b>Alt + =</b></td><td>AutoSUM Selected Column/Row</td></tr>
            <tr><td>Formulas</td><td><b>F4</b></td><td>Lock Cell Reference Toggle ($A$1 Absolute Mode)</td></tr>
            <tr><td>Formulas</td><td><b>Ctrl + Shift + Enter</b></td><td>Legacy Array Formula Execution</td></tr>
            <tr><td>Formatting</td><td><b>Ctrl + 1</b></td><td>Format Cells Dialog Box</td></tr>
            <tr><td>Formatting</td><td><b>Ctrl + Shift + !</b></td><td>Apply Number Format (2 decimal places)</td></tr>
            <tr><td>Formatting</td><td><b>Ctrl + Shift + $</b></td><td>Apply Currency Format</td></tr>
            <tr><td>Formatting</td><td><b>Ctrl + Shift + %</b></td><td>Apply Percentage Format</td></tr>
            <tr><td>Data/Filter</td><td><b>Ctrl + Shift + L</b></td><td>Apply or Remove AutoFilter</td></tr>
            <tr><td>Data/Filter</td><td><b>Alt + A + T</b></td><td>Toggle Filters</td></tr>
            <tr><td>Table</td><td><b>Ctrl + T</b></td><td>Convert Data Range to Dynamic Excel Table</td></tr>
            <tr><td>Navigation</td><td><b>Ctrl + Arrow Keys</b></td><td>Jump to Extreme Edge of Data Region</td></tr>
            <tr><td>Navigation</td><td><b>Ctrl + Home / End</b></td><td>Jump to Beginning / Last Cell of Worksheet</td></tr>
            <tr><td>Selection</td><td><b>Ctrl + Shift + Arrow</b></td><td>Select All Data to Edge of Region</td></tr>
            <tr><td>Selection</td><td><b>Ctrl + Space</b></td><td>Select Entire Column</td></tr>
            <tr><td>Selection</td><td><b>Shift + Space</b></td><td>Select Entire Row</td></tr>
          </tbody>
        </table>
      </div>

      <!-- 4. ALL FORMULAS & FUNCTIONS -->
      <div id="formulas" class="tab-content">
        <h2 style="color: #38bdf8;">Comprehensive Excel Formulas & Functions Catalog</h2>
        <div class="grid">
          <div class="card">
            <h3><i class="fa-solid fa-search"></i> Lookup & Reference</h3>
            <p><b>XLOOKUP:</b> <code>=XLOOKUP(lookup_val, lookup_arr, return_arr, [if_not_found])</code></p>
            <p style="margin-top:4px; font-size:12px; color:#94a3b8;">Replaces VLOOKUP & INDEX/MATCH. Performs bi-directional lookup effortlessly.</p>
            <p style="margin-top:8px;"><b>VLOOKUP:</b> <code>=VLOOKUP(val, table, col_index, [range_lookup])</code></p>
            <p style="margin-top:8px;"><b>INDEX & MATCH:</b> <code>=INDEX(return_range, MATCH(val, lookup_range, 0))</code></p>
          </div>
          <div class="card">
            <h3><i class="fa-solid fa-filter"></i> Aggregation & Math</h3>
            <p><b>SUMIFS:</b> <code>=SUMIFS(sum_range, criteria_range1, criteria1, ...)</code></p>
            <p style="margin-top:4px; font-size:12px; color:#94a3b8;">Sums values matching multiple conditions.</p>
            <p style="margin-top:8px;"><b>COUNTIFS:</b> <code>=COUNTIFS(criteria_range1, criteria1, ...)</code></p>
            <p style="margin-top:8px;"><b>AVERAGEIFS:</b> <code>=AVERAGEIFS(avg_range, criteria_range1, criteria1)</code></p>
          </div>
          <div class="card">
            <h3><i class="fa-solid fa-code-branch"></i> Logical Functions</h3>
            <p><b>IFS:</b> <code>=IFS(cond1, val1, cond2, val2, [TRUE, default_val])</code></p>
            <p style="margin-top:4px; font-size:12px; color:#94a3b8;">Eliminates nested IF statements.</p>
            <p style="margin-top:8px;"><b>AND / OR:</b> <code>=IF(AND(A2>50, B2<100), "Pass", "Fail")</code></p>
            <p style="margin-top:8px;"><b>SWITCH:</b> <code>=SWITCH(expression, val1, result1, val2, result2)</code></p>
          </div>
          <div class="card">
            <h3><i class="fa-solid fa-font"></i> Text Manipulation</h3>
            <p><b>TEXTJOIN:</b> <code>=TEXTJOIN(delimiter, ignore_empty, text1, text2)</code></p>
            <p style="margin-top:8px;"><b>CONCAT / TRIM:</b> <code>=TRIM(CLEAN(text))</code> removes extra whitespace.</p>
            <p style="margin-top:8px;"><b>LEFT / RIGHT / MID:</b> Extracts exact substring characters.</p>
          </div>
          <div class="card">
            <h3><i class="fa-solid fa-calendar"></i> Date & Time</h3>
            <p><b>DATEDIF:</b> <code>=DATEDIF(start_date, end_date, "Y")</code> calculates age/tenure.</p>
            <p style="margin-top:8px;"><b>WORKDAY:</b> <code>=WORKDAY(start_date, days, [holidays])</code></p>
            <p style="margin-top:8px;"><b>EOMONTH:</b> Returns last day of month before or after specified months.</p>
          </div>
          <div class="card">
            <h3><i class="fa-solid fa-coins"></i> Financial Functions</h3>
            <p><b>PMT:</b> <code>=PMT(rate/12, nper, pv)</code> calculates loan EMI payments.</p>
            <p style="margin-top:8px;"><b>NPV:</b> <code>=NPV(rate, val1, val2, ...)</code> Net Present Value.</p>
            <p style="margin-top:8px;"><b>IRR:</b> Returns Internal Rate of Return for periodic cash flows.</p>
          </div>
        </div>
      </div>

      <!-- 5. DASHBOARD TUTORIALS -->
      <div id="dashboard-tutorials" class="tab-content">
        <h2 style="color: #38bdf8;">Interactive Dashboard Building Guide</h2>
        <div class="grid">
          <div class="card">
            <h3>1. Structuring Raw Data</h3>
            <p>Format raw data as an official Excel Table (<code>Ctrl + T</code>). Ensure unique column headers, no merged cells, and no blank rows.</p>
          </div>
          <div class="card">
            <h3>2. Pivot Tables & Slicers</h3>
            <p>Create separate Pivot Tables for each KPI metric. Insert Timeline & Slicers, then right-click -> <b>Report Connections</b> to link all pivots together.</p>
          </div>
          <div class="card">
            <h3>3. Visual Layout & Theme</h3>
            <p>Hide gridlines (View -> uncheck Gridlines). Use dark themes, uniform card padding, dynamic Pivot Charts, and clean alignment.</p>
          </div>
        </div>
      </div>

      <!-- 6. PIVOT TABLES & POWER QUERY -->
      <div id="pivot-powerquery" class="tab-content">
        <h2 style="color: #38bdf8;">Pivot Tables & Power Query Data Transformation</h2>
        <div class="grid">
          <div class="card">
            <h3>Pivot Table Calculated Fields</h3>
            <p>In Pivot Table Analyze tab -> Fields, Items & Sets -> <b>Calculated Field</b>. Write custom dynamic math like <code>='Sales' * 0.10</code>.</p>
          </div>
          <div class="card">
            <h3>Power Query Data Unpivoting</h3>
            <p>Data -> Get Data -> From File/Table. In Query Editor, select columns -> <b>Unpivot Columns</b> to transform cross-tabulated data into normalized rows.</p>
          </div>
          <div class="card">
            <h3>Merging & Appending Queries</h3>
            <p>Combine multiple worksheets or monthly files instantly using Power Query <b>Append Queries</b> without writing VBA.</p>
          </div>
        </div>
      </div>

      <!-- 7. VBA MACROS & AUTOMATION -->
      <div id="vba-macros" class="tab-content">
        <h2 style="color: #38bdf8;">VBA Macros & Workflow Automation</h2>
        <div class="card">
          <h3>Automated Sheet Save to PDF (VBA Code)</h3>
          <p>Press <code>Alt + F11</code>, Insert -> Module, and paste the code below:</p>
          <pre>
Sub SaveSheetToPDF()
    Dim pdfPath As String
    pdfPath = Application.ActiveWorkbook.Path & "\Report_" & Format(Now(), "YYYYMMDD") & ".pdf"
    ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, Filename:=pdfPath
    MsgBox "PDF Exported Successfully!", vbInformation
End Sub
          </pre>
        </div>
        <div class="card" style="margin-top:15px;">
          <h3>Auto Highlight Active Row</h3>
          <pre>
Private Sub Worksheet_SelectionChange(ByVal Target As Range)
    Cells.Interior.ColorIndex = xlNone
    Target.EntireRow.Interior.Color = RGB(15, 23, 42)
End Sub
          </pre>
        </div>
      </div>

      <!-- 8. CHARTS & VISUALIZATION -->
      <div id="charts-viz" class="tab-content">
        <h2 style="color: #38bdf8;">Data Visualization & Advanced Charts</h2>
        <div class="grid">
          <div class="card">
            <h3>Waterfall Charts</h3>
            <p>Ideal for visualizing financial statements, revenue gains, and expense deductions incrementally.</p>
          </div>
          <div class="card">
            <h3>Pareto Charts (80/20 Rule)</h3>
            <p>Combines bar charts and line graphs to highlight top contributors causing 80% of business results or defects.</p>
          </div>
          <div class="card">
            <h3>Gantt Project Charts</h3>
            <p>Built using Stacked Bar Charts with transparent base series to track project start dates and task durations.</p>
          </div>
        </div>
      </div>

      <!-- 9. ERROR TROUBLESHOOTING -->
      <div id="error-solving" class="tab-content">
        <h2 style="color: #38bdf8;">Excel Error Troubleshooting Guide</h2>
        <table>
          <thead>
            <tr><th>Error Type</th><th>Common Cause</th><th>How to Fix</th></tr>
          </thead>
          <tbody>
            <tr><td><b>#N/A</b></td><td>Value not found in lookup table</td><td>Wrap formula in <code>IFERROR(VLOOKUP(...), "Not Found")</code></td></tr>
            <tr><td><b>#REF!</b></td><td>Referenced cell was deleted or overwritten</td><td>Undo deletion or update cell address in formula</td></tr>
            <tr><td><b>#VALUE!</b></td><td>Wrong data type (e.g., multiplying text by number)</td><td>Use <code>VALUE()</code> or clean text characters with <code>TRIM()</code></td></tr>
            <tr><td><b>#DIV/0!</b></td><td>Formula attempts division by zero or empty cell</td><td>Use <code>IF(B2=0, 0, A2/B2)</code></td></tr>
            <tr><td><b>#SPILL!</b></td><td>Dynamic array formula range is blocked by data</td><td>Clear all contents in cells below/around the formula</td></tr>
          </tbody>
        </table>
      </div>

    </main>
  </div>

  <script>
    let authenticatedUser = null;
    let luckysheetInitialized = false;

    function handleCredentialResponse(response) {
      if(!response || !response.credential) {
        alert("Google Verification Failed.");
        return;
      }
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          authenticatedUser = data.user;
          document.getElementById('login-overlay').style.display = 'none';
          document.getElementById('app-container').style.display = 'flex';
        } else {
          alert("Authentication Error: " + (data.error || "Verification failed"));
        }
      })
      .catch(err => alert("Network Connection Error"));
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      
      document.getElementById(tabId).classList.add('active');
      
      if(event && event.currentTarget) {
        event.currentTarget.classList.add('active');
      }

      const titles = {
        'ai-trainer': 'AI Excel Trainer Engine',
        'live-excel': 'Live Excel Practice Sandbox (Full Spreadsheet Canvas)',
        'shortcuts': 'Complete Keyboard Shortcuts Directory',
        'formulas': 'All Excel Formulas & Functions Catalog',
        'dashboard-tutorials': 'Interactive Dashboard Building Guide',
        'pivot-powerquery': 'Pivot Tables & Power Query Transformation',
        'vba-macros': 'VBA Automation & Macro Scripts',
        'charts-viz': 'Data Visualization & Advanced Charts',
        'error-solving': 'Excel Error Solutions & Troubleshooting'
      };
      document.getElementById('active-tab-title').innerText = titles[tabId];

      if (tabId === 'live-excel' && !luckysheetInitialized) {
        setTimeout(() => {
          luckysheet.create({
            container: 'luckysheet',
            title: 'Live Excel Sandbox',
            lang: 'en'
          });
          luckysheetInitialized = true;
        }, 100);
      }
    }

    function showFileName(input) {
      if (input.files[0]) {
        document.getElementById('fileNameDisplay').innerText = input.files[0].name;
      }
    }

    function toggleVoice() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice recognition not supported in browser.");
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.start();
      recognition.onresult = function(event) {
        document.getElementById('userInput').value = event.results[0][0].transcript;
      };
    }

    function handleKeyPress(e) {
      if (e.key === 'Enter') sendQuery();
    }

    async function sendQuery() {
      const input = document.getElementById('userInput');
      const fileInput = document.getElementById('fileInput');
      const text = input.value.trim();

      if (!text && !fileInput.files[0]) return;

      appendMsg(text + (fileInput.files[0] ? ` [File: ${fileInput.files[0].name}]` : ''), 'user');

      const formData = new FormData();
      formData.append('userEmail', authenticatedUser.email);
      formData.append('text', text);
      if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

      input.value = '';
      document.getElementById('fileNameDisplay').innerText = '';
      appendMsg("Analyzing query...", 'bot');

      try {
        const res = await fetch('/api/chat', { method: 'POST', body: formData });
        const data = await res.json();
        
        const chat = document.getElementById('chat');
        chat.removeChild(chat.lastChild);

        if (data.success) {
          appendMsg(data.answer, 'bot');
        } else {
          appendMsg("Error: " + data.error, 'bot');
        }
      } catch (err) {
        appendMsg("Connection error to server.", 'bot');
      }

      fileInput.value = '';
    }

    function appendMsg(msg, sender) {
      const chat = document.getElementById('chat');
      const div = document.createElement('div');
      div.className = `msg ${sender}`;
      div.innerText = msg;
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
