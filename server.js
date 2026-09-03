import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Environment Variables
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "ADMIN123KEY";
const JWT_SECRET = process.env.JWT_SECRET || "CAREERBOOT_PROD_SECURE_KEY_2026";

// Database Connection
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

// ==========================================
// COMPLETE LOCAL EXCEL KNOWLEDGE BASE ENGINE
// ==========================================

const EXCEL_SHORTCUTS = [
    { key: "Ctrl + A", desc: "Selects the entire worksheet or active table region." },
    { key: "Ctrl + B", desc: "Applies or removes bold formatting." },
    { key: "Ctrl + C", desc: "Copies selected cells." },
    { key: "Ctrl + D", desc: "Fill Down: Copies content and format of top cell into selected cells below." },
    { key: "Ctrl + E", desc: "Flash Fill: Automatically recognizes patterns and fills data." },
    { key: "Ctrl + F", desc: "Opens Find dialog box." },
    { key: "Ctrl + G", desc: "Opens Go To dialog box." },
    { key: "Ctrl + H", desc: "Opens Find and Replace dialog box." },
    { key: "Ctrl + I", desc: "Applies or removes italic formatting." },
    { key: "Ctrl + K", desc: "Inserts a hyperlink." },
    { key: "Ctrl + N", desc: "Creates a new blank workbook." },
    { key: "Ctrl + O", desc: "Opens an existing workbook." },
    { key: "Ctrl + P", desc: "Opens Print preview/settings." },
    { key: "Ctrl + R", desc: "Fill Right: Copies left cell content to selected right cells." },
    { key: "Ctrl + S", desc: "Saves active workbook." },
    { key: "Ctrl + T", desc: "Converts selected range into an official Excel Table." },
    { key: "Ctrl + U", desc: "Applies or removes underline." },
    { key: "Ctrl + V", desc: "Pastes copied content." },
    { key: "Ctrl + W", desc: "Closes active workbook." },
    { key: "Ctrl + X", desc: "Cuts selected cells." },
    { key: "Ctrl + Y", desc: "Redoes last action." },
    { key: "Ctrl + Z", desc: "Undoes last action." },
    { key: "Ctrl + 1", desc: "Opens Format Cells dialog box." },
    { key: "Ctrl + 5", desc: "Applies or removes strikethrough." },
    { key: "Ctrl + 9", desc: "Hides selected rows." },
    { key: "Ctrl + 0", desc: "Hides selected columns." },
    { key: "Ctrl + Shift + (", desc: "Unhides selected rows." },
    { key: "Ctrl + Shift + )", desc: "Unhides selected columns." },
    { key: "Ctrl + Shift + L", desc: "Toggles AutoFilter on or off." },
    { key: "Ctrl + Shift + $", desc: "Applies Currency format ($)." },
    { key: "Ctrl + Shift + %", desc: "Applies Percentage format (%)." },
    { key: "Ctrl + Shift + #", desc: "Applies Date format (DD-MMM-YY)." },
    { key: "Ctrl + Shift + @", desc: "Applies Time format." },
    { key: "Ctrl + Shift + !", desc: "Applies Number format with commas." },
    { key: "Ctrl + Shift + &", desc: "Applies outline border to selected cells." },
    { key: "Ctrl + Shift + _", desc: "Removes outline border." },
    { key: "Ctrl + Shift + Plus (+)", desc: "Inserts new blank cells/rows/columns." },
    { key: "Ctrl + Minus (-)", desc: "Deletes selected cells/rows/columns." },
    { key: "Ctrl + Space", desc: "Selects entire column." },
    { key: "Shift + Space", desc: "Selects entire row." },
    { key: "Alt + =", desc: "AutoSum: Automatically inserts SUM formula for adjacent cells." },
    { key: "Alt + Enter", desc: "Starts a new line inside the same cell." },
    { key: "Alt + F1", desc: "Creates an embedded chart from selected data." },
    { key: "Alt + F8", desc: "Opens Macro dialog box." },
    { key: "Alt + F11", desc: "Opens Visual Basic Editor (VBA)." },
    { key: "F2", desc: "Edits active cell and places cursor at the end." },
    { key: "F4", desc: "Repeats last action OR toggles absolute cell reference ($A$1)." },
    { key: "F7", desc: "Runs Spelling check." },
    { key: "F9", desc: "Calculates all formulas in all open workbooks." },
    { key: "F12", desc: "Opens Save As dialog box." }
];

const EXCEL_FORMULAS = [
    { category: "Lookup & Reference", name: "VLOOKUP", syntax: "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])", desc: "Searches vertically down the first column of a table and returns a value in the same row from a specified column." },
    { category: "Lookup & Reference", name: "HLOOKUP", syntax: "=HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])", desc: "Searches horizontally across the top row of a table and returns a value in the same column." },
    { category: "Lookup & Reference", name: "XLOOKUP", syntax: "=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode])", desc: "Modern replacement for VLOOKUP/HLOOKUP. Can search in any direction and defaults to exact match." },
    { category: "Lookup & Reference", name: "INDEX", syntax: "=INDEX(array, row_num, [column_num])", desc: "Returns a value or reference to a value from within a table or range." },
    { category: "Lookup & Reference", name: "MATCH", syntax: "=MATCH(lookup_value, lookup_array, [match_type])", desc: "Searches for a specified item in a range and returns its relative position." },
    { category: "Lookup & Reference", name: "INDIRECT", syntax: "=INDIRECT(ref_text, [a1])", desc: "Returns the reference specified by a text string." },
    { category: "Lookup & Reference", name: "OFFSET", syntax: "=OFFSET(reference, rows, cols, [height], [width])", desc: "Returns a reference to a range that is a specified number of rows and columns from a cell or range." },

    { category: "Math & Math Logic", name: "SUM", syntax: "=SUM(number1, [number2], ...)", desc: "Adds all the numbers in a range of cells." },
    { category: "Math & Math Logic", name: "SUMIF", syntax: "=SUMIF(range, criteria, [sum_range])", desc: "Adds the cells specified by a given condition or criteria." },
    { category: "Math & Math Logic", name: "SUMIFS", syntax: "=SUMIFS(sum_range, criteria_range1, criteria1, ...)", desc: "Adds cells specified by multiple conditions or criteria." },
    { category: "Math & Math Logic", name: "PRODUCT", syntax: "=PRODUCT(number1, [number2], ...)", desc: "Multiplies all numbers given as arguments." },
    { category: "Math & Math Logic", name: "SUBTOTAL", syntax: "=SUBTOTAL(function_num, ref1, ...)", desc: "Returns a subtotal in a list or database, ignoring hidden rows when needed." },
    { category: "Math & Math Logic", name: "ROUND", syntax: "=ROUND(number, num_digits)", desc: "Rounds a number to a specified number of digits." },
    { category: "Math & Math Logic", name: "ROUNDUP", syntax: "=ROUNDUP(number, num_digits)", desc: "Rounds a number up, away from zero." },
    { category: "Math & Math Logic", name: "ROUNDDOWN", syntax: "=ROUNDDOWN(number, num_digits)", desc: "Rounds a number down, toward zero." },
    { category: "Math & Math Logic", name: "ABS", syntax: "=ABS(number)", desc: "Returns the absolute value of a number (converts negative to positive)." },
    { category: "Math & Math Logic", name: "MOD", syntax: "=MOD(number, divisor)", desc: "Returns the remainder after a number is divided by a divisor." },

    { category: "Statistical", name: "AVERAGE", syntax: "=AVERAGE(number1, [number2], ...)", desc: "Calculates arithmetic mean of selected numbers." },
    { category: "Statistical", name: "AVERAGEIF", syntax: "=AVERAGEIF(range, criteria, [average_range])", desc: "Calculates average for cells that meet a given criteria." },
    { category: "Statistical", name: "COUNT", syntax: "=COUNT(value1, [value2], ...)", desc: "Counts how many cells contain numbers." },
    { category: "Statistical", name: "COUNTA", syntax: "=COUNTA(value1, [value2], ...)", desc: "Counts how many cells are not empty (numbers + text)." },
    { category: "Statistical", name: "COUNTBLANK", syntax: "=COUNTBLANK(range)", desc: "Counts empty cells in a specified range." },
    { category: "Statistical", name: "COUNTIF", syntax: "=COUNTIF(range, criteria)", desc: "Counts the number of cells that meet a condition." },
    { category: "Statistical", name: "COUNTIFS", syntax: "=COUNTIFS(criteria_range1, criteria1, ...)", desc: "Counts cells that meet multiple criteria." },
    { category: "Statistical", name: "MAX", syntax: "=MAX(number1, [number2], ...)", desc: "Returns largest value in a set of values." },
    { category: "Statistical", name: "MIN", syntax: "=MIN(number1, [number2], ...)", desc: "Returns smallest value in a set of values." },
    { category: "Statistical", name: "LARGE", syntax: "=LARGE(array, k)", desc: "Returns the k-th largest value in a dataset." },
    { category: "Statistical", name: "SMALL", syntax: "=SMALL(array, k)", desc: "Returns the k-th smallest value in a dataset." },

    { category: "Logical", name: "IF", syntax: "=IF(logical_test, value_if_true, [value_if_false])", desc: "Checks whether a condition is met, returning one value if True, another if False." },
    { category: "Logical", name: "AND", syntax: "=AND(logical1, [logical2], ...)", desc: "Returns TRUE if all arguments evaluate to TRUE." },
    { category: "Logical", name: "OR", syntax: "=OR(logical1, [logical2], ...)", desc: "Returns TRUE if any argument evaluates to TRUE." },
    { category: "Logical", name: "NOT", syntax: "=NOT(logical)", desc: "Reverses the logical value of its argument." },
    { category: "Logical", name: "IFERROR", syntax: "=IFERROR(value, value_if_error)", desc: "Returns specified value if formula evaluates to error (#N/A, #VALUE!), otherwise returns result." },
    { category: "Logical", name: "IFS", syntax: "=IFS(logical_test1, value_if_true1, ...)", desc: "Checks multiple conditions and returns a value corresponding to the first TRUE condition." },

    { category: "Text Functions", name: "CONCATENATE / CONCAT", syntax: "=CONCAT(text1, [text2], ...)", desc: "Joins two or more text strings into one string." },
    { category: "Text Functions", name: "TEXTJOIN", syntax: "=TEXTJOIN(delimiter, ignore_empty, text1, ...)", desc: "Combines text from multiple ranges with a specified delimiter." },
    { category: "Text Functions", name: "LEFT", syntax: "=LEFT(text, [num_chars])", desc: "Extracts specified number of characters from the left side of text." },
    { category: "Text Functions", name: "RIGHT", syntax: "=RIGHT(text, [num_chars])", desc: "Extracts specified number of characters from the right side of text." },
    { category: "Text Functions", name: "MID", syntax: "=MID(text, start_num, num_chars)", desc: "Extracts characters from middle of text string given starting position." },
    { category: "Text Functions", name: "LEN", syntax: "=LEN(text)", desc: "Returns total character count of a text string." },
    { category: "Text Functions", name: "TRIM", syntax: "=TRIM(text)", desc: "Removes all leading, trailing, and extra space from text except single spaces." },
    { category: "Text Functions", name: "PROPER", syntax: "=PROPER(text)", desc: "Capitalizes the first letter of each word in a text string." },
    { category: "Text Functions", name: "UPPER", syntax: "=UPPER(text)", desc: "Converts text to all uppercase letters." },
    { category: "Text Functions", name: "LOWER", syntax: "=LOWER(text)", desc: "Converts text to all lowercase letters." },
    { category: "Text Functions", name: "TEXT", syntax: "=TEXT(value, format_text)", desc: "Converts a number to text in a specified number format." },
    { category: "Text Functions", name: "SUBSTITUTE", syntax: "=SUBSTITUTE(text, old_text, new_text, [instance_num])", desc: "Replaces existing text with new text in a text string." },

    { category: "Date & Time", name: "TODAY", syntax: "=TODAY()", desc: "Returns current date." },
    { category: "Date & Time", name: "NOW", syntax: "=NOW()", desc: "Returns current date and exact system time." },
    { category: "Date & Time", name: "DATEDIF", syntax: "=DATEDIF(start_date, end_date, unit)", desc: "Calculates difference between two dates in Years ('Y'), Months ('M'), or Days ('D')." },
    { category: "Date & Time", name: "EDATE", syntax: "=EDATE(start_date, months)", desc: "Returns date that is specified number of months before or after start date." },
    { category: "Date & Time", name: "EOMONTH", syntax: "=EOMONTH(start_date, months)", desc: "Returns date of last day of the month before or after specified months." },
    { category: "Date & Time", name: "NETWORKDAYS", syntax: "=NETWORKDAYS(start_date, end_date, [holidays])", desc: "Returns total working days between two dates excluding weekends and holidays." }
];

function generateLocalAnswer(userText) {
    const query = userText.toLowerCase().trim();

    // 1. ALL SHORTCUT KEYS MATCHING ENGINE
    if (query.includes("shortcut") || query === "all shortcut keys" || query === "all shortcuts") {
        let res = `### ⌨️ Comprehensive MS Excel Keyboard Shortcuts\n\n`;
        res += `| Shortcut Key | Function & Usage |\n| :--- | :--- |\n`;
        EXCEL_SHORTCUTS.forEach(s => {
            res += `| **${s.key}** | ${s.desc} |\n`;
        });
        return res;
    }

    // 2. ALL FORMULAS MATCHING ENGINE
    if (query.includes("formula") || query === "all formulas list" || query === "all formulas") {
        let res = `### 📐 Complete MS Excel Formulas Master Guide\n\n`;
        let currentCat = "";
        EXCEL_FORMULAS.forEach(f => {
            if (f.category !== currentCat) {
                currentCat = f.category;
                res += `\n#### 📌 ${currentCat}\n`;
            }
            res += `* **\`${f.name}\`**: ${f.desc}\n  * *Syntax*: \`${f.syntax}\`\n`;
        });
        return res;
    }

    // 3. SPECIFIC FORMULA SEARCH
    const matchedFormula = EXCEL_FORMULAS.find(f => query.includes(f.name.toLowerCase()));
    if (matchedFormula) {
        return `### 🔍 Formula Details: \`${matchedFormula.name}\`\n\n` +
               `* **Category:** ${matchedFormula.category}\n` +
               `* **Syntax:** \`${matchedFormula.syntax}\`\n` +
               `* **Description:** ${matchedFormula.desc}\n\n` +
               `**Usage Example:**\nTo use \`${matchedFormula.name}\`, type \`${matchedFormula.syntax}\` into your formula bar and replace arguments with your actual cell references (e.g., A1:A10).`;
    }

    // 4. SPECIFIC SHORTCUT SEARCH
    const matchedShortcut = EXCEL_SHORTCUTS.find(s => query.includes(s.key.toLowerCase().replace("ctrl + ", "").replace("alt + ", "")));
    if (matchedShortcut) {
        return `### ⌨️ Shortcut Key Found\n\n` +
               `* **Shortcut:** **${matchedShortcut.key}**\n` +
               `* **Action:** ${matchedShortcut.desc}`;
    }

    // 5. PIVOT TABLE HELP
    if (query.includes("pivot")) {
        return `### 📊 How to Create a Pivot Table in MS Excel\n\n` +
               `1. **Select Data:** Click on any cell within your data range.\n` +
               `2. **Insert:** Go to **Insert** tab > Click **PivotTable**.\n` +
               `3. **Location:** Choose *New Worksheet* or *Existing Worksheet* and click **OK**.\n` +
               `4. **Arrange Fields:** Drag columns to **Rows**, **Columns**, **Values**, or **Filters** in the right pane.\n` +
               `5. **Shortcut:** Press **Alt + N + V + T** to open Pivot Table wizard instantly.`;
    }

    // DEFAULT GUIDANCE RESPONSE
    return `### 💡 CareerBoot Excel Assistant\n\n` +
           `I can answer all your Excel queries instantly for free! Here are things you can ask:\n\n` +
           `* Type **"all shortcuts"** or click button below to view the FULL list of Excel shortcuts.\n` +
           `* Type **"all formulas"** or click button below to see ALL formulas organized by category.\n` +
           `* Type any specific formula name like **"VLOOKUP"**, **"XLOOKUP"**, **"INDEX MATCH"**, or **"SUMIFS"**.\n` +
           `* Ask about **"Pivot Table"**, **"Flash Fill"**, or **"Data Validation"**.`;
}

// --- ROUTES ---

app.post('/api/login', async (req, res) => {
    try {
        const { key, deviceSignature } = req.body;
        if (!key || !deviceSignature) return res.status(400).json({ success: false, message: "Key required" });

        if (key === ADMIN_SECRET) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
            return res.json({ success: true, role: 'admin', token });
        }

        const keyDoc = await Key.findOne({ key });
        if (!keyDoc) return res.status(401).json({ success: false, message: "Invalid Access Key" });

        if (!keyDoc.deviceId) {
            keyDoc.deviceId = deviceSignature;
            keyDoc.boundAt = new Date();
            await keyDoc.save();
        } else if (keyDoc.deviceId !== deviceSignature) {
            return res.status(403).json({ success: false, message: "Key registered to another device!" });
        }

        const token = jwt.sign({ key: keyDoc.key, deviceId: deviceSignature, role: 'user' }, JWT_SECRET, { expiresIn: '60d' });
        return res.json({ success: true, role: 'user', token });
    } catch (err) {
        res.status(500).json({ success: false, message: "Auth error" });
    }
});

app.post('/api/admin/create-key', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    try {
        await Key.create({ key: req.body.newKey.trim() });
        res.json({ success: true, message: "Key Created!" });
    } catch (err) {
        res.status(400).json({ success: false, message: "Key already exists" });
    }
});

app.post('/api/admin/delete-key', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    await Key.deleteOne({ key: req.body.key });
    res.json({ success: true, message: "Key Deleted!" });
});

app.post('/api/admin/upload-sheet', authMiddleware, upload.single('sheet'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

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
    if (!sheet) return res.status(404).send("No sheet available.");
    res.setHeader('Content-Type', sheet.contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="' + sheet.filename + '"');
    res.send(sheet.data);
});

app.get('/api/chat-history', authMiddleware, async (req, res) => {
    const history = await Chat.find({ deviceId: req.user.deviceId }).sort({ createdAt: 1 });
    res.json({ success: true, history });
});

// CHAT ROUTE - 100% FREE LOCAL KNOWLEDGE ENGINE
app.post('/api/chat', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        const deviceId = req.user.deviceId;

        if (!message) {
            return res.status(400).json({ success: false, reply: "Please enter a question." });
        }

        // Generate response using local knowledge base
        const reply = generateLocalAnswer(message);

        await Chat.create({ deviceId, role: 'user', message });
        await Chat.create({ deviceId, role: 'model', message: reply });

        return res.json({ success: true, reply });
    } catch (err) {
        res.status(500).json({ success: false, reply: "Engine processing error." });
    }
});

// FRONTEND INTERFACE
app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CareerBoot Excel AI Trainer</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        :root { --primary: #10b981; --bg-dark: #0f172a; --card-dark: #1e293b; --text-main: #f8fafc; --text-muted: #94a3b8; --user-msg: #2563eb; }
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
        .chat-bubble.model h3, .chat-bubble.model h4 { color: var(--primary); margin-top: 10px; margin-bottom: 6px; }
        .chat-bubble.model p { margin-bottom: 8px; }
        .chat-bubble.model ul { margin-left: 20px; margin-bottom: 8px; }
        .chat-bubble.model code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #38bdf8; }
        .chat-bubble.model table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 13px; }
        .chat-bubble.model th, .chat-bubble.model td { border: 1px solid #334155; padding: 6px 10px; text-align: left; }
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
            <div class="chat-bubble model">Welcome! Ask any MS Excel query. Click <b>"All Shortcut Keys"</b> or <b>"All Formulas List"</b> below for full guides.</div>
        </div>
        <div class="pinned-bar">
            <button class="chip-btn" onclick="sendQuickQuery('all shortcuts')">All Shortcut Keys</button>
            <button class="chip-btn" onclick="sendQuickQuery('all formulas')">All Formulas List</button>
            <button class="chip-btn" onclick="sendQuickQuery('VLOOKUP')">VLOOKUP Guide</button>
            <button class="chip-btn" onclick="sendQuickQuery('Pivot Table')">Pivot Table</button>
        </div>
        <div class="chat-input-container">
            <input type="text" id="userInput" class="chat-input" placeholder="Ask Excel formula or key..." onkeypress="if(event.key==='Enter') processUserQuery()">
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

        function formatMessage(content) {
            return typeof marked !== 'undefined' ? marked.parse(content) : content;
        }

        window.addEventListener('load', function() {
            setTimeout(function() {
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
                    body: JSON.stringify({ key: key, deviceSignature: getDeviceSignature() })
                });

                const data = await res.json();

                setTimeout(function() {
                    lottieContainer.style.display = 'none';
                    statusBadge.style.display = 'block';

                    if(data.success) {
                        statusBadge.innerText = '👍🏻';
                        jwtToken = data.token;
                        userRole = data.role;
                        localStorage.setItem('jwt_token', jwtToken);
                        localStorage.setItem('user_role', userRole);

                        setTimeout(function() {
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
                        setTimeout(function() { showModal(data.message); }, 500);
                    }
                }, 2000);

            } catch (err) {
                showModal("Connection Error");
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
                modelDiv.innerHTML = formatMessage(data.reply);
                chatBody.appendChild(modelDiv);
                
                chatBody.scrollTop = chatBody.scrollHeight;
            } catch (err) {
                const errDiv = document.createElement('div');
                errDiv.className = 'chat-bubble model';
                errDiv.textContent = "Error fetching answer.";
                chatBody.appendChild(errDiv);
            }
        }

        function sendQuickQuery(text) { 
            document.getElementById('userInput').value = text; 
            processUserQuery(); 
        }

        function startVoiceRecognition() {
            if(!('webkitSpeechRecognition' in window)) return showModal("Speech recognition not supported");
            const recognition = new webkitSpeechRecognition();
            recognition.onresult = function(e) { 
                document.getElementById('userInput').value = e.results[0][0].transcript; 
                processUserQuery();
            };
            recognition.start();
        }

        function openDrawer() { document.getElementById('drawerOverlay').style.display = 'block'; document.getElementById('drawerMenu').classList.add('open'); }
        function closeDrawer() { document.getElementById('drawerOverlay').style.display = 'none'; document.getElementById('drawerMenu').classList.remove('open'); }

        function downloadPracticeSheet() { window.open('/api/download-sheet?token=' + jwtToken, '_blank'); }

        function logout() { localStorage.clear(); location.reload(); }

        async function fetchHistory() {
            try {
                const res = await fetch('/api/chat-history', {
                    headers: { 'Authorization': 'Bearer ' + jwtToken }
                });
                const data = await res.json();
                if(data.success && data.history.length > 0) {
                    const chatBody = document.getElementById('chatBody');
                    chatBody.innerHTML = '';
                    data.history.forEach(function(item) {
                        const msgDiv = document.createElement('div');
                        msgDiv.className = 'chat-bubble ' + item.role;
                        if(item.role === 'model') {
                            msgDiv.innerHTML = formatMessage(item.message);
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
                body: JSON.stringify({ newKey: newKey })
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
                body: JSON.stringify({ key: key })
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
</html>`);
});

// Server Listen
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

export default app;
