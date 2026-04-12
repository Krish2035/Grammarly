require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Groq = require('groq-sdk');

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 2. CONFIGURATION & AI SETUP
const MONGO_URI = process.env.MONGO_URI;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize Groq Client
const groq = new Groq({ apiKey: GROQ_API_KEY });

// 3. DATABASE CONNECTION (Optimized for Serverless)
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB Atlas");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
    }
};

// 4. SCHEMA & MODEL
const CorrectionSchema = new mongoose.Schema({
    originalText: { type: String, required: true },
    correctedText: { type: String, required: true },
    tone: { type: String, default: 'professional' },
    createdAt: { type: Date, default: Date.now }
});

// Avoid re-compiling the model if it already exists
const Correction = mongoose.models.Correction || mongoose.model('Correction', CorrectionSchema);

// 5. ROUTES

/**
 * Root Route (Prevents 404 on home page)
 */
app.get('/', (req, res) => {
    res.json({ status: "API is operational", service: "Grammarly Clone" });
});

/**
 * AI Correction Route
 */
app.post('/api/correct', async (req, res) => {
    await connectDB(); // Ensure DB is connected
    const { sentence, tone = 'professional' } = req.body;
    
    if (!sentence) return res.status(400).json({ error: "No sentence provided" });
    if (!GROQ_API_KEY) return res.status(500).json({ error: "Groq API Key missing on server" });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: `You are a professional editor. 1. Correct all grammar/spelling in the text. 2. Use a ${tone} tone. 3. Return ONLY the corrected version without any extra text, explanations, or quotes. Text: "${sentence}"`,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3, 
        });

        const correctedText = chatCompletion.choices[0]?.message?.content?.trim() || "";

        const newEntry = new Correction({ 
            originalText: sentence, 
            correctedText, 
            tone 
        });
        
        await newEntry.save();
        res.json(newEntry);
    } catch (error) {
        console.error("Groq AI Error:", error.message);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

/**
 * Fetch History Route
 */
app.get('/api/history', async (req, res) => {
    await connectDB();
    try {
        const history = await Correction.find().sort({ createdAt: -1 }).limit(15);
        res.json(history);
    } catch (error) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

/**
 * Clear History Route
 */
app.delete('/api/history', async (req, res) => {
    await connectDB();
    try {
        const result = await Correction.deleteMany({});
        res.status(200).json({ 
            message: "History cleared successfully", 
            count: result.deletedCount 
        });
    } catch (error) {
        console.error("❌ Clear failed:", error.message);
        res.status(500).json({ error: 'Database clear failed' });
    }
});

// 6. EXPORT FOR VERCEL / LOCAL START
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Local server active at http://localhost:${PORT}`);
    });
}

module.exports = app;