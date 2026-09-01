const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini API (Free Tier Key)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const authClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Storage for File Uploads
const upload = multer({ storage: multer.memoryStorage() });

// Real Google Token Verification Endpoint
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await authClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    res.json({ success: true, user: { name: payload.name, email: payload.email, picture: payload.picture } });
  } catch (error) {
    res.status(401).json({ success: false, error: "Invalid Google Token" });
  }
});

// Gemini Vision API for Text, Screenshot & File Queries
app.post('/api/excel/solve', upload.single('file'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let contents = [
      "You are CareerBoot AI Excel Trainer. Provide precise Excel formulas, VBA code, or fix errors instantly."
    ];

    if (prompt) contents.push(prompt);

    if (req.file) {
      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      };
      contents.push(imagePart);
    }

    const result = await model.generateContent(contents);
    const response = await result.response;
    res.json({ success: true, answer: response.text() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => console.log('CareerBoot Server running on port 5000'));
