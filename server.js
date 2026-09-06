const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MONGODB CONFIGURATION ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/excel_bootcamp';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas / Local Database'))
  .catch(err => console.error('MongoDB connection error:', err));

const KeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, default: 'Student Key' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const SecretKey = mongoose.model('SecretKey', KeySchema);

async function seedDefaultKey() {
  try {
    const count = await SecretKey.countDocuments();
    if (count === 0) {
      await SecretKey.create({ key: 'EXCEL2026', label: 'Default Mastery Passcode' });
      console.log('Default Secret Key Created: EXCEL2026');
    }
  } catch (e) {
    console.error('Error seeding initial key:', e);
  }
}
seedDefaultKey();

// --- API ENDPOINTS ---
app.post('/api/verify-key', async (req, res) => {
  const { key } = req.body;
  try {
    const foundKey = await SecretKey.findOne({ key, isActive: true });
    if (foundKey) {
      return res.json({ success: true, message: 'Access Granted' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or Inactive Key' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Admin APIs
app.post('/api/admin/keys', async (req, res) => {
  const { adminSecret, key, label } = req.body;
  if (adminSecret !== (process.env.ADMIN_SECRET || 'admin123')) {
    return res.status(403).json({ success: false, message: 'Unauthorized Admin Passcode' });
  }
  try {
    const newKey = await SecretKey.create({ key, label });
    res.json({ success: true, data: newKey });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Key already exists or invalid format' });
  }
});

app.get('/api/admin/keys', async (req, res) => {
  const { adminSecret } = req.query;
  if (adminSecret !== (process.env.ADMIN_SECRET || 'admin123')) {
    return res.status(403).json({ success: false, message: 'Unauthorized Admin Passcode' });
  }
  const keys = await SecretKey.find().sort({ createdAt: -1 });
  res.json({ success: true, data: keys });
});

app.post('/api/admin/keys/toggle', async (req, res) => {
  const { adminSecret, id } = req.body;
  if (adminSecret !== (process.env.ADMIN_SECRET || 'admin123')) {
    return res.status(403).json({ success: false, message: 'Unauthorized Admin Passcode' });
  }
  const keyObj = await SecretKey.findById(id);
  if (keyObj) {
    keyObj.isActive = !keyObj.isActive;
    await keyObj.save();
    return res.json({ success: true, data: keyObj });
  }
  res.status(404).json({ success: false, message: 'Key not found' });
});

// --- SINGLE PAGE APPLICATION FRONTEND ---
app.get('*', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareerBoot - Complete Excel Knowledgebase</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @keyframes cloudTravel {
      0% { transform: translateY(0) scale(0.4); opacity: 0.1; }
      50% { transform: translateY(-130px) scale(1.2); opacity: 1; }
      100% { transform: translateY(-260px) scale(0.7); opacity: 0; }
    }
    @keyframes manWalk {
      0% { transform: translateX(0); }
      50% { transform: translateX(140px); }
      100% { transform: translateX(280px); }
    }
    .cloud-particle { animation: cloudTravel 2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .walking-man { animation: manWalk 8s ease-in-out infinite alternate; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">

  <nav id="topNav" class="hidden bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-50 justify-between items-center px-8">
    <div class="flex items-center space-x-3 cursor-pointer" onclick="navigateTo('dashboard')">
      <svg class="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      <span class="text-xl font-black tracking-wider text-white">Career<span class="text-emerald-400">Boot</span></span>
    </div>
    <div class="flex space-x-3">
      <button onclick="navigateBack()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <button onclick="navigateTo('dashboard')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"><i class="fa-solid fa-house"></i> Home</button>
      <button onclick="toggleAdminPanel()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"><i class="fa-solid fa-user-shield"></i> Admin Keys</button>
      <button onclick="logout()" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"><i class="fa-solid fa-power-off"></i> Exit</button>
    </div>
  </nav>

  <div id="pageLogin" class="min-h-screen flex flex-col justify-between p-6 max-w-6xl mx-auto w-full">
    <div class="h-[35vh] flex flex-col justify-between bg-slate-900/80 rounded-3xl border border-slate-800 p-6 relative overflow-hidden shadow-2xl">
      <div class="flex justify-between items-start">
        <div class="flex items-center space-x-4">
          <svg class="w-14 h-14 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#0F172A"/>
            <path d="M25 75L45 25H55L75 75H62L57 60H43L38 75H25ZM46 50H54L50 36L46 50Z" fill="#10B981"/>
            <circle cx="75" cy="25" r="8" fill="#38BDF8"/>
          </svg>
          <div>
            <h1 class="text-3xl font-black text-white tracking-tight">Career<span class="text-emerald-400">Boot</span></h1>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Enterprise Excel Learning Engine</p>
          </div>
        </div>
        <div class="text-right">
          <h2 class="text-lg font-bold text-slate-100">Full Master Directory</h2>
          <p class="text-xs text-slate-400">Enter your passcode key to unfold all operational layers.</p>
        </div>
      </div>

      <div class="relative w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 mt-2">
        <div class="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
          <span class="text-amber-400 flex items-center gap-1.5"><i class="fa-solid fa-lightbulb"></i> Interest</span>
          <span class="text-blue-400 flex items-center gap-1.5"><i class="fa-solid fa-gears"></i> Skill Building</span>
          <span class="text-emerald-400 flex items-center gap-1.5"><i class="fa-solid fa-trophy"></i> Career Success</span>
        </div>
        <div class="w-full h-2 bg-slate-800 rounded-full relative">
          <div class="absolute top-0 left-0 h-2 bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 rounded-full w-full"></div>
          <div class="walking-man absolute -top-7 left-0">
            <svg class="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="4" r="2"/>
              <path d="M15.8 8.3L12 6 8.2 8.3c-.5.3-.7 1-.4 1.5.3.5 1 .7 1.5.4L11 9.1V14l-2.2 4.4c-.3.5-.1 1.1.4 1.4.5.3 1.1.1 1.4-.4L12 16.5l1.4 2.9c.2.4.7.7 1.2.7.2 0 .4-.1.6-.2.5-.3.7-.9.4-1.4L13 14V9.1l1.7 1.1c.2.1.4.2.6.2.3 0 .7-.1.9-.4.3-.5.1-1.2-.4-1.5z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="h-[15vh] my-4 bg-slate-900/80 rounded-3xl border border-slate-800 flex items-center justify-center p-6 relative shadow-2xl">
      <div class="w-full max-w-xl flex gap-3 relative z-10">
        <input type="password" id="secretKeyInput" placeholder="Enter Secret Key (e.g., EXCEL2026)" class="w-full px-5 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center text-lg">
        <button onclick="submitSecretKey()" class="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg transition flex items-center gap-2 text-sm uppercase tracking-wider">
          <span>Authenticate</span>
          <i class="fa-solid fa-lock-open"></i>
        </button>
      </div>
      <div id="cloudContainer" class="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center"></div>
    </div>

    <div class="flex-1 bg-slate-900/80 rounded-3xl border border-slate-800 p-6 flex flex-col items-center justify-center relative min-h-[30vh] shadow-2xl">
      <div id="statusIndicator" class="mb-4 text-center font-bold text-lg hidden"></div>
      <div class="relative flex items-center justify-center">
        <svg id="manSvg" class="w-72 h-52 transition-all duration-300" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="150" width="260" height="10" fill="#334155" rx="3"/>
          <rect x="140" y="130" width="20" height="20" fill="#475569"/>
          <rect x="120" y="148" width="60" height="4" fill="#475569"/>
          <rect x="80" y="45" width="140" height="88" rx="8" fill="#0F172A" stroke="#475569" stroke-width="4"/>
          <rect id="computerScreen" x="86" y="51" width="128" height="76" rx="4" fill="#1E293B"/>
          <line x1="96" y1="65" x2="160" y2="65" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
          <line x1="96" y1="80" x2="195" y2="80" stroke="#34D399" stroke-width="3" stroke-linecap="round"/>
          <line x1="96" y1="95" x2="145" y2="95" stroke="#F43F5E" stroke-width="3" stroke-linecap="round"/>
          <circle cx="45" cy="98" r="16" fill="#CBD5E1"/>
          <path d="M25 145 C25 120, 35 115, 55 115 C65 115, 75 120, 75 145 Z" fill="#3B82F6"/>
          <circle cx="51" cy="96" r="2" fill="#0F172A"/>
          <path d="M50 125 L80 135 L100 142" stroke="#CBD5E1" stroke-width="5" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
  </div>

  <div id="pageDashboard" class="hidden p-8 flex-1 max-w-7xl mx-auto w-full">
    <div class="mb-8 border-b border-slate-800 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <h2 id="portalTitle" class="text-3xl font-black text-white tracking-wide">Excel Master Directory</h2>
        <p id="portalSubtitle" class="text-slate-400 text-sm mt-1">Select a core domain to access detailed sub-categories and syntax cards.</p>
      </div>
      <div id="breadcrumb" class="text-xs font-mono text-emerald-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
        Root / Dashboard
      </div>
    </div>
    <div id="dynamicContentGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  </div>

  <div id="adminModal" class="fixed inset-0 bg-black/80 backdrop-blur-md hidden z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl">
      <div class="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
        <h3 class="text-xl font-bold text-white flex items-center gap-2"><i class="fa-solid fa-sliders text-indigo-400"></i> Key Manager</h3>
        <button onclick="toggleAdminPanel()" class="text-slate-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="space-y-3 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="password" id="adminMasterSecret" placeholder="Admin Passcode" class="bg-slate-950 border border-slate-700 px-4 py-2.5 rounded-xl text-xs text-white">
          <input type="text" id="newKeyVal" placeholder="New Secret Key" class="bg-slate-950 border border-slate-700 px-4 py-2.5 rounded-xl text-xs text-white">
          <input type="text" id="newKeyLabel" placeholder="User Label" class="bg-slate-950 border border-slate-700 px-4 py-2.5 rounded-xl text-xs text-white">
        </div>
        <button onclick="createNewKey()" class="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition">Generate & Activate Secret Key</button>
      </div>

      <div class="max-h-64 overflow-y-auto border border-slate-800 rounded-2xl">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-950 text-[10px] uppercase text-slate-400 border-b border-slate-800 sticky top-0">
            <tr>
              <th class="p-3">Key Token</th>
              <th class="p-3">Label</th>
              <th class="p-3">Status</th>
              <th class="p-3">Action</th>
            </tr>
          </thead>
          <tbody id="adminKeyTable">
            <tr><td colspan="4" class="p-4 text-center text-slate-500">Enter Admin Passcode & Click Refresh</td></tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 flex justify-between items-center">
        <span class="text-[10px] text-slate-500">Default Admin Secret: admin123</span>
        <button onclick="fetchAdminKeys()" class="px-4 py-2 bg-slate-800 text-xs font-bold rounded-xl hover:bg-slate-700">Refresh List</button>
      </div>
    </div>
  </div>

  <footer class="p-4 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-600">
    CareerBoot &copy; 2026 — Comprehensive Excel Platform | Production Single-File Node.js Engine
  </footer>

  <script>
    const excelDatabase = {
      title: "Excel Master Directory",
      categories: [
        {
          id: "formulas",
          name: "All Formulas",
          icon: "fa-calculator",
          color: "border-emerald-500/30 hover:border-emerald-500",
          desc: "Complete reference for basic math, lookup, dynamic arrays, logical tests, and string operations.",
          subCategories: [
            {
              id: "math_basic",
              name: "Math & Aggregation",
              icon: "fa-plus-minus",
              items: [
                { name: "SUM", formula: "=SUM(number1, [number2], ...)", desc: "Calculates the total of all numeric values within a given range." },
                { name: "AVERAGE", formula: "=AVERAGE(number1, [number2], ...)", desc: "Returns the arithmetic mean of a series of numbers." },
                { name: "COUNT", formula: "=COUNT(value1, [value2], ...)", desc: "Counts cells that contain numbers." },
                { name: "COUNTA", formula: "=COUNTA(value1, [value2], ...)", desc: "Counts non-empty cells including text, numbers, and errors." },
                { name: "COUNTBLANK", formula: "=COUNTBLANK(range)", desc: "Counts empty cells within a specified range." },
                { name: "ROUND / ROUNDUP / ROUNDDOWN", formula: "=ROUND(number, num_digits)", desc: "Rounds a number to a specified number of digits." },
                { name: "SUMPRODUCT", formula: "=SUMPRODUCT(array1, [array2], ...)", desc: "Multiplies corresponding components in given arrays and returns the sum." },
                { name: "MOD", formula: "=MOD(number, divisor)", desc: "Returns the remainder after a number is divided by a divisor." },
                { name: "ABS", formula: "=ABS(number)", desc: "Returns the absolute value of a number, stripping its negative sign." },
                { name: "INT / TRUNC", formula: "=INT(number)", desc: "Rounds a number down to the nearest integer." }
              ]
            },
            {
              id: "lookup_ref",
              name: "Lookup & Reference",
              icon: "fa-magnifying-glass",
              items: [
                { name: "XLOOKUP", formula: "=XLOOKUP(lookup_val, lookup_arr, return_arr, [if_not_found], [match_mode], [search_mode])", desc: "Modern, versatile replacement for VLOOKUP/HLOOKUP. Supports exact/wildcard matches and bi-directional lookups." },
                { name: "INDEX & MATCH", formula: "=INDEX(return_range, MATCH(lookup_val, lookup_range, 0))", desc: "Dynamic matrix search combination. Unaffected by column additions or removals." },
                { name: "VLOOKUP", formula: "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])", desc: "Searches for a value in the first column of a table array and returns a value in the same row from a specified column." },
                { name: "HLOOKUP", formula: "=HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])", desc: "Searches horizontally along the top row of a table array and returns a value from the specified row." },
                { name: "INDIRECT", formula: "=INDIRECT(ref_text, [a1])", desc: "Converts a valid text string into an active cell or range reference." },
                { name: "OFFSET", formula: "=OFFSET(reference, rows, cols, [height], [width])", desc: "Returns a reference offset from a starting cell by a specified number of rows and columns." },
                { name: "CHOOSE", formula: "=CHOOSE(index_num, value1, [value2], ...)", desc: "Selects a value or action from a list based on an index number." },
                { name: "ADDRESS", formula: "=ADDRESS(row_num, column_num, [abs_num], [a1], [sheet_text])", desc: "Creates a cell reference text string based on row and column numbers." }
              ]
            },
            {
              id: "dynamic_arrays",
              name: "Dynamic Arrays",
              icon: "fa-layer-group",
              items: [
                { name: "FILTER", formula: "=FILTER(array, include, [if_empty])", desc: "Filters a dataset based on boolean logical rules and spills matching rows automatically." },
                { name: "UNIQUE", formula: "=UNIQUE(array, [by_col], [exactly_once])", desc: "Returns a list of distinct or unique values from an input range." },
                { name: "SORT & SORTBY", formula: "=SORTBY(array, by_array1, [sort_order1], ...)", desc: "Sorts a range or array based on corresponding values in another range or array." },
                { name: "SEQUENCE", formula: "=SEQUENCE(rows, [columns], [start], [step])", desc: "Generates an array of sequential numbers over designated rows and columns." },
                { name: "RANDARRAY", formula: "=RANDARRAY([rows], [columns], [min], [max], [whole_number])", desc: "Generates an array of random integers or decimals across grid dimensions." },
                { name: "TAKE & DROP", formula: "=TAKE(array, rows, [columns])", desc: "Extracts or removes specified rows or columns from the start or end of an array." },
                { name: "EXPAND", formula: "=EXPAND(array, rows, [columns], [pad_with])", desc: "Expands an array to specified dimensions using a custom padding value." },
                { name: "TOCOL / TOROW", formula: "=TOCOL(array, [ignore], [scan_by_column])", desc: "Transforms a multi-dimensional matrix into a single column or row vector." }
              ]
            },
            {
              id: "logical_cond",
              name: "Logical & Conditional",
              icon: "fa-code-branch",
              items: [
                { name: "IF", formula: "=IF(logical_test, value_if_true, value_if_false)", desc: "Evaluates a condition and returns one value if TRUE, and another if FALSE." },
                { name: "IFS", formula: "=IFS(logical_test1, value_if_true1, ...)", desc: "Evaluates multiple conditions sequentially without requiring nested IF statements." },
                { name: "SWITCH", formula: "=SWITCH(expression, value1, result1, [default])", desc: "Matches an expression against a list of values and returns the matching result." },
                { name: "AND / OR / NOT", formula: "=AND(logical1, [logical2], ...)", desc: "Combines conditions; AND requires all conditions to be TRUE, OR requires at least one." },
                { name: "IFERROR / IFNA", formula: "=IFERROR(value, value_if_error)", desc: "Catches formula errors and displays a user-defined fallback value." },
                { name: "XOR", formula: "=XOR(logical1, [logical2], ...)", desc: "Returns a logical Exclusive OR across all provided arguments." }
              ]
            },
            {
              id: "text_formulas",
              name: "Text Operations",
              icon: "fa-font",
              items: [
                { name: "TEXTSPLIT", formula: "=TEXTSPLIT(text, col_delimiter, [row_delimiter])", desc: "Splits text strings into separate cells using column/row delimiters." },
                { name: "TEXTJOIN", formula: "=TEXTJOIN(delimiter, ignore_empty, text1, ...)", desc: "Concatenates text strings or ranges using a specified delimiter." },
                { name: "LEFT / RIGHT / MID", formula: "=MID(text, start_num, num_chars)", desc: "Extracts a specific number of characters starting from a designated location in text." },
                { name: "LEN", formula: "=LEN(text)", desc: "Returns the total character count of a text string." },
                { name: "TRIM / CLEAN", formula: "=TRIM(text)", desc: "Removes leading, trailing, and extra spaces from text strings." },
                { name: "SUBSTITUTE", formula: "=SUBSTITUTE(text, old_text, new_text, [instance_num])", desc: "Replaces existing text with new text within a string." },
                { name: "SEARCH / FIND", formula: "=SEARCH(find_text, within_text, [start_num])", desc: "Locates the position of a substring within text (SEARCH is case-insensitive)." },
                { name: "UPPER / LOWER / PROPER", formula: "=PROPER(text)", desc: "Converts text strings to uppercase, lowercase, or proper title case." }
              ]
            },
            {
              id: "date_time",
              name: "Date & Time Calculations",
              icon: "fa-calendar-days",
              items: [
                { name: "TODAY & NOW", formula: "=TODAY()", desc: "Returns the current system date or full date-time timestamp." },
                { name: "DATEDIF", formula: "=DATEDIF(start_date, end_date, unit)", desc: "Calculates elapsed time between dates in years ('Y'), months ('M'), or days ('D')." },
                { name: "EDATE / EOMONTH", formula: "=EOMONTH(start_date, months)", desc: "Returns the date for the last day of the month a specified number of months away." },
                { name: "NETWORKDAYS / WORKDAY", formula: "=NETWORKDAYS(start_date, end_date, [holidays])", desc: "Calculates net working days between two dates, excluding weekends and designated holidays." },
                { name: "YEAR / MONTH / DAY", formula: "=YEAR(serial_number)", desc: "Extracts the year component from an Excel date integer." },
                { name: "WEEKDAY", formula: "=WEEKDAY(serial_number, [return_type])", desc: "Returns an integer representing the day of the week for a given date." }
              ]
            }
          ]
        },
        {
          id: "shortcuts",
          name: "All Shortcuts",
          icon: "fa-keyboard",
          color: "border-blue-500/30 hover:border-blue-500",
          desc: "Complete directory of standard navigation, selection, and ALT ribbon accelerators.",
          subCategories: [
            {
              id: "basic_shortcuts",
              name: "Basic & Daily Operations",
              icon: "fa-bolt",
              items: [
                { name: "Copy / Paste", key: "Ctrl + C / Ctrl + V", desc: "Copies selection to clipboard and pastes content." },
                { name: "Undo / Redo", key: "Ctrl + Z / Ctrl + Y", desc: "Reverts or reapplies the previous workbook edit." },
                { name: "Select All", key: "Ctrl + A", desc: "Selects all populated cells in the active region." },
                { name: "Save Workbook", key: "Ctrl + S", desc: "Saves current changes in the active workbook." },
                { name: "Find & Replace", key: "Ctrl + F / Ctrl + H", desc: "Opens the Find or Replace dialog tabs." },
                { name: "Fill Down", key: "Ctrl + D", desc: "Copies the content and format of the top cell in a range down." },
                { name: "Fill Right", key: "Ctrl + R", desc: "Copies content and format from the leftmost cell to adjacent cells." }
              ]
            },
            {
              id: "pro_ribbon",
              name: "Pro Level Ribbon Hacks (ALT Speed)",
              icon: "fa-rocket",
              items: [
                { name: "Conditional Formatting Rules", key: "Alt + H + L", desc: "Opens the Conditional Formatting drop-down menu." },
                { name: "AutoFit Column Width", key: "Alt + H + O + I", desc: "Auto-resizes column width to fit long text contents." },
                { name: "Toggle Gridlines View", key: "Alt + W + V + G", desc: "Toggles worksheet background gridlines visibility." },
                { name: "Paste Values Only", key: "Alt + H + V + V", desc: "Pastes copied content as plain text values." },
                { name: "Paste Column Widths", key: "Alt + H + V + W", desc: "Applies column width dimensions from copied cells." },
                { name: "Remove Duplicates Engine", key: "Alt + A + M", desc: "Opens the Remove Duplicates cleanup tool." },
                { name: "Apply Data Validation", key: "Alt + A + V + V", desc: "Launches the Data Validation setup menu." },
                { name: "Insert PivotTable", key: "Alt + N + V + T", desc: "Opens the Create PivotTable menu." },
                { name: "Trace Precedents", key: "Alt + M + P", desc: "Draws arrows pointing to cells that feed values into the active formula." },
                { name: "Clear Precedent Arrows", key: "Alt + M + A", desc: "Removes all formula audit arrows from the active worksheet." }
              ]
            },
            {
              id: "data_navigation",
              name: "Data Wrangling & Formatting",
              icon: "fa-arrows-to-dot",
              items: [
                { name: "Flash Fill", key: "Ctrl + E", desc: "Automatically detects text patterns and fills adjacent columns." },
                { name: "Create Table", key: "Ctrl + T", desc: "Converts selected range into a formatted Excel Table." },
                { name: "Toggle Formulas View", key: "Ctrl + `", desc: "Switches cell display between computed results and formulas." },
                { name: "Format Cells Menu", key: "Ctrl + 1", desc: "Launches the full Format Cells dialog box." },
                { name: "Currency Format", key: "Ctrl + Shift + $", desc: "Applies Currency format with two decimal places." },
                { name: "Percentage Format", key: "Ctrl + Shift + %", desc: "Applies Percentage format with no decimal places." },
                { name: "General Format", key: "Ctrl + Shift + ~", desc: "Reverts numeric selection back to General format." }
              ]
            }
          ]
        },
        {
          id: "functions",
          name: "All Functions",
          icon: "fa-chart-line",
          color: "border-purple-500/30 hover:border-purple-500",
          desc: "Dedicated suite covering financial modeling, statistical analysis, database logic, and engineering.",
          subCategories: [
            {
              id: "financial_fn",
              name: "Financial & Valuation",
              icon: "fa-coins",
              items: [
                { name: "XNPV", formula: "=XNPV(rate, values, dates)", desc: "Calculates net present value for non-periodic cash flows occurring at specific dates." },
                { name: "XIRR", formula: "=XIRR(values, dates, [guess])", desc: "Computes internal rate of return for non-periodic cash flows." },
                { name: "PMT", formula: "=PMT(rate, nper, pv, [fv], [type])", desc: "Calculates payment amounts for a loan based on constant interest rates." },
                { name: "FV", formula: "=FV(rate, nper, pmt, [pv], [type])", desc: "Returns the future value of an investment based on periodic constant payments." },
                { name: "PV", formula: "=PV(rate, nper, pmt, [fv], [type])", desc: "Calculates present value of an investment based on a series of future payouts." },
                { name: "CUMIPMT", formula: "=CUMIPMT(rate, nper, pv, start_period, end_period, type)", desc: "Calculates cumulative interest paid over a range of loan payment periods." },
                { name: "SLN / DB", formula: "=SLN(cost, salvage, life)", desc: "Returns straight-line or declining balance asset depreciation for a period." }
              ]
            },
            {
              id: "conditional_aggregations",
              name: "Multi-Criteria Aggregation",
              icon: "fa-chart-pie",
              items: [
                { name: "SUMIFS", formula: "=SUMIFS(sum_range, criteria_range1, criteria1, ...)", desc: "Sums values in cells that meet multiple conditional rules." },
                { name: "COUNTIFS", formula: "=COUNTIFS(criteria_range1, criteria1, ...)", desc: "Counts cells that fulfill multiple logical rules across ranges." },
                { name: "AVERAGEIFS", formula: "=AVERAGEIFS(avg_range, criteria_range1, criteria1, ...)", desc: "Calculates the average of cells that meet multiple conditions." },
                { name: "MAXIFS / MINIFS", formula: "=MAXIFS(max_range, criteria_range1, criteria1, ...)", desc: "Returns maximum or minimum value among cells specified by conditions." }
              ]
            },
            {
              id: "engineering_fn",
              name: "Engineering & Conversion",
              icon: "fa-microchip",
              items: [
                { name: "CONVERT", formula: "=CONVERT(number, from_unit, to_unit)", desc: "Converts a number from one measurement system to another." },
                { name: "DEC2BIN / BIN2DEC", formula: "=DEC2BIN(number, [places])", desc: "Converts decimal numbers to binary format and vice-versa." },
                { name: "DELTA", formula: "=DELTA(number1, [number2])", desc: "Tests whether two values are equal; returns 1 if equal, 0 otherwise." }
              ]
            }
          ]
        },
        {
          id: "automation",
          name: "VBA & Power Query",
          icon: "fa-terminal",
          color: "border-amber-500/30 hover:border-amber-500",
          desc: "Automation scripts, macro optimization patterns, and ETL pipeline designs.",
          subCategories: [
            {
              id: "vba_macros",
              name: "Production VBA Scripts",
              icon: "fa-code",
              items: [
                { name: "Execution Optimization Block", formula: "Application.ScreenUpdating = False\nApplication.Calculation = xlCalculationManual\n'Code Execution\nApplication.Calculation = xlCalculationAutomatic\nApplication.ScreenUpdating = True", desc: "Accelerates macro execution speed up to 10x by suppressing screen repaints and automatic recalculations." },
                { name: "Dynamic Last Row Detection", formula: "Dim lastRow As Long\nlastRow = Cells(Rows.Count, \"A\").End(xlUp).Row", desc: "Identifies the final populated row in a target column dynamically." },
                { name: "Loop Cells Range", formula: "Dim cell As Range\nFor Each cell In Range(\"A1:A100\")\n  If cell.Value < 0 Then cell.Interior.Color = RGB(255, 0, 0)\nNext cell", desc: "Iterates through each cell in a target range to apply conditional logic." },
                { name: "Auto Export Sheet to PDF", formula: "ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, Filename:=\"C:\\Report.pdf\"", desc: "Exports active sheet to a PDF document programmatically." }
              ]
            },
            {
              id: "power_query_etl",
              name: "Power Query M-Code & ETL",
              icon: "fa-filter-circle-dollar",
              items: [
                { name: "Unpivot Columns", formula: "Table.UnpivotOtherColumns(Source, {\"ID\"}, \"Attribute\", \"Value\")", desc: "Transforms wide pivot tables into normalized columnar data structures." },
                { name: "Group By Aggregation", formula: "Table.Group(Source, {\"Region\"}, {{\"Total Sales\", each List.Sum([Amount]), type number}})", desc: "Groups datasets and calculates aggregated metrics across unique fields." },
                { name: "Merge Queries (Join)", formula: "Table.NestedJoin(Table1, {\"ID\"}, Table2, {\"ID\"}, \"JoinedTable\", JoinKind.LeftOuter)", desc: "Combines two separate queries based on matching column keys." }
              ]
            }
          ]
        }
      ]
    };

    let navigationHistory = [];

    async function submitSecretKey() {
      const keyInput = document.getElementById('secretKeyInput');
      const val = keyInput.value.trim();
      if (!val) return;

      const cloudContainer = document.getElementById('cloudContainer');
      const screen = document.getElementById('computerScreen');
      const status = document.getElementById('statusIndicator');

      cloudContainer.innerHTML = \`
        <div class="cloud-particle flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-5 py-2.5 rounded-full border border-emerald-500/40 shadow-xl">
          <i class="fa-solid fa-cloud"></i>
          <span class="font-mono text-sm font-bold">\${val}</span>
        </div>
      \`;

      status.classList.remove('hidden');
      status.className = "mb-4 text-center font-bold text-sm text-amber-400 animate-pulse flex items-center justify-center gap-2";
      status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating Key via Cloud Layer...';

      setTimeout(async () => {
        try {
          const res = await fetch('/api/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: val })
          });
          const data = await res.json();

          if (data.success) {
            screen.setAttribute('fill', '#10B981');
            status.className = "mb-4 text-center font-bold text-sm text-emerald-400 flex items-center justify-center gap-2";
            status.innerHTML = '<i class="fa-solid fa-circle-check"></i> Access Granted! Launching Directory...';
            
            setTimeout(() => {
              document.getElementById('pageLogin').classList.add('hidden');
              document.getElementById('topNav').classList.remove('hidden');
              document.getElementById('topNav').classList.add('flex');
              document.getElementById('pageDashboard').classList.remove('hidden');
              navigateTo('dashboard');
            }, 1000);
          } else {
            screen.setAttribute('fill', '#EF4444');
            status.className = "mb-4 text-center font-bold text-sm text-rose-500 flex items-center justify-center gap-2";
            status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Access Denied! Invalid Key.';
          }
        } catch(err) {
          status.className = "mb-4 text-center font-bold text-sm text-rose-500";
          status.innerText = "Server error verifying key.";
        }
      }, 2000);
    }

    function navigateTo(target, data = null) {
      const grid = document.getElementById('dynamicContentGrid');
      const title = document.getElementById('portalTitle');
      const subtitle = document.getElementById('portalSubtitle');
      const breadcrumb = document.getElementById('breadcrumb');

      navigationHistory.push({ target, data });

      if (target === 'dashboard') {
        title.innerText = "Excel Master Directory";
        subtitle.innerText = "Select a core domain to access detailed sub-categories and syntax cards.";
        breadcrumb.innerText = "Root / Dashboard";

        grid.innerHTML = excelDatabase.categories.map(cat => `
          <div onclick="navigateTo('category', '${cat.id}')" class="bg-slate-900/80 border ${cat.color} p-6 rounded-3xl cursor-pointer hover:scale-[1.02] transition shadow-2xl group relative overflow-hidden">
            <div class="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400 text-xl mb-4 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
              <i class="fa-solid ${cat.icon}"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">${cat.name}</h3>
            <p class="text-slate-400 text-xs mb-6 leading-relaxed">${cat.desc}</p>
            <div class="text-xs text-emerald-400 font-bold flex items-center gap-2">
              <span>Explore Domain</span>
              <i class="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition"></i>
            </div>
          </div>
        `).join('');
      } 
      else if (target === 'category') {
        const category = excelDatabase.categories.find(c => c.id === data);
        title.innerText = category.name;
        subtitle.innerText = "Select a specialized module within this category.";
        breadcrumb.innerText = \`Root / \${category.name}\`;

        grid.innerHTML = category.subCategories.map(sub => `
          <div onclick="navigateTo('items', { catId: '${category.id}', subId: '${sub.id}' })" class="bg-slate-900/80 border border-slate-800 hover:border-indigo-500 p-6 rounded-3xl cursor-pointer hover:scale-[1.02] transition shadow-2xl group">
            <div class="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-400 text-xl mb-4 group-hover:bg-indigo-500 group-hover:text-white transition">
              <i class="fa-solid ${sub.icon}"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">${sub.name}</h3>
            <p class="text-xs text-slate-400 font-mono mb-6">${sub.items.length} Reference Cards</p>
            <div class="text-xs text-indigo-400 font-bold flex items-center gap-2">
              <span>Open Reference Cards</span>
              <i class="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition"></i>
            </div>
          </div>
        `).join('');
      } 
      else if (target === 'items') {
        const category = excelDatabase.categories.find(c => c.id === data.catId);
        const sub = category.subCategories.find(s => s.id === data.subId);

        title.innerText = sub.name;
        subtitle.innerText = "Detailed reference cards with syntax and application descriptions.";
        breadcrumb.innerText = \`Root / \${category.name} / \${sub.name}\`;

        grid.innerHTML = sub.items.map(item => `
          <div class="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-3">
                <h4 class="text-base font-bold text-white">${item.name}</h4>
                ${item.key ? `<span class="bg-indigo-950 text-indigo-300 text-[10px] font-mono px-2.5 py-1 rounded-lg border border-indigo-800/60 whitespace-nowrap">${item.key}</span>` : ''}
              </div>
              ${item.formula ? `<div class="bg-slate-950 border border-slate-800/80 p-3 rounded-xl text-emerald-400 font-mono text-xs mb-3 whitespace-pre-wrap break-all">${item.formula}</div>` : ''}
              <p class="text-slate-400 text-xs leading-relaxed">${item.desc}</p>
            </div>
          </div>
        `).join('');
      }
    }

    function navigateBack() {
      if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const previous = navigationHistory.pop();
        navigateTo(previous.target, previous.data);
      }
    }

    function logout() {
      navigationHistory = [];
      document.getElementById('pageDashboard').classList.add('hidden');
      document.getElementById('topNav').classList.add('hidden');
      document.getElementById('pageLogin').classList.remove('hidden');
      document.getElementById('computerScreen').setAttribute('fill', '#1E293B');
      document.getElementById('statusIndicator').classList.add('hidden');
    }

    function toggleAdminPanel() {
      document.getElementById('adminModal').classList.toggle('hidden');
    }

    async function fetchAdminKeys() {
      const secret = document.getElementById('adminMasterSecret').value;
      if (!secret) return alert('Enter Admin Passcode');

      const res = await fetch(\`/api/admin/keys?adminSecret=\${encodeURIComponent(secret)}\`);
      const data = await res.json();

      if (data.success) {
        const tbody = document.getElementById('adminKeyTable');
        tbody.innerHTML = data.data.map(k => `
          <tr class="border-b border-slate-800/60">
            <td class="p-3 font-mono font-bold text-emerald-400">${k.key}</td>
            <td class="p-3 text-slate-300">${k.label}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${k.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}">
                ${k.isActive ? 'Active' : 'Disabled'}
              </span>
            </td>
            <td class="p-3">
              <button onclick="toggleKeyStatus('${k._id}')" class="text-[10px] bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition font-bold">Toggle</button>
            </td>
          </tr>
        `).join('');
      } else {
        alert(data.message);
      }
    }

    async function createNewKey() {
      const adminSecret = document.getElementById('adminMasterSecret').value;
      const key = document.getElementById('newKeyVal').value.trim();
      const label = document.getElementById('newKeyLabel').value.trim();

      if (!adminSecret || !key) return alert('Fill in Admin Passcode and New Key');

      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret, key, label })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('newKeyVal').value = '';
        document.getElementById('newKeyLabel').value = '';
        fetchAdminKeys();
      } else {
        alert(data.message);
      }
    }

    async function toggleKeyStatus(id) {
      const adminSecret = document.getElementById('adminMasterSecret').value;
      await fetch('/api/admin/keys/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret, id })
      });
      fetchAdminKeys();
    }
  </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
