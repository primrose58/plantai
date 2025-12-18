// API Key and Base URL are now handled in the backend (api/analyze.js)
// to prevent exposing the key in the browser.
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Analyzes plant images with optional user context.
 * @param {string|string[]} imageData - Base64 string or array of strings
 * @param {string} lang - 'tr' or 'en'
 * @param {string} plantType - User provided plant text (optional)
 */
export async function analyzePlantImage(imageData, lang = 'tr', plantType = null) {
    const images = Array.isArray(imageData) ? imageData : [imageData];

    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`Attempt ${attempt + 1} of ${MAX_RETRIES + 1}...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }

            return await executeAnalysis(images, lang, plantType);
        } catch (error) {
            lastError = error;
            // Only retry on 503 (Overloaded) or 429 (Too Many Requests) or Server Errors
            const isRetryable = error.message.includes('503') ||
                error.message.includes('429') ||
                error.message.includes('overloaded') ||
                error.message.includes('Server Error');

            if (!isRetryable) {
                throw error; // Don't retry logic errors or non-transient issues
            }
            console.warn(`Analysis attempt ${attempt + 1} failed:`, error.message);
        }
    }

    throw lastError;
}

// Internal function containing the core analysis logic
async function executeAnalysis(images, lang, plantType) {
    let promptContext = "";
    if (plantType && plantType.trim().length > 0) {
        promptContext = `The user identifies this plant as "${plantType}". Use this as context but verify visually.`;
    }

    const promptText = `
    You are an expert Phytopathologist. Analyze the provided plant image(s).
    ${promptContext}
    OUTPUT MUST BE IN ${lang === 'en' ? 'ENGLISH' : 'TURKISH'}.

    PROTOCOL:
    1. If the image is not a plant, return {"status": "error", "error": "NOT_PLANT"}
    2. If the ailment is unclear, the image is blurry, or you need a closer look (macro shot) to be at least 70% confident, return:
       {"status": "needs_details", "message": "Please take a closer photo of the affected leaf or area."}
    3. If confident, return a valid JSON object:
    {
        "status": "success",
        "plant_name": "Common Plant Name (e.g. Tomato, Rose)",
        "plant_latin_name": "Latin Name of the Plant (e.g. Solanum lycopersicum)",
        "disease_name": "Disease Name",
        "disease_latin_name": "Latin Name of the Disease/Pathogen (if applicable)",
        "confidence": 90,
        "urgency": 50,
        "spread_risk": 40,
        "is_treatable": true, // false if plant is dead, rotten beyond saving, or abiotic stress that cannot be reversed
        "description": "Short description (max 2 sentences).",
        "treatment_steps": ["Step 1", "Step 2", "Step 3"], // Only if is_treatable is true
        "preventive_measures": ["Tip 1", "Tip 2"] // If not treatable or general advice
    }
    
    Return ONLY valid raw JSON (no markdown, no backticks).
  `;

    const parts = [{ text: promptText }];

    // Attach all images
    images.forEach(img => {
        if (!img) return; // Skip null images
        // Handle cases where base64 might not have prefix, though usually it does from FileReader
        const base64Data = img.includes(',') ? img.split(',')[1] : img;
        parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Data } });
    });

    const payload = {
        contents: [{ parts: parts }],
        safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
    };

    try {
        // Attempt to call the Vercel Serverless Function
        // Note: This requires the Vercel environment or local proxy to be set up correctly.
        // If running purely client-side locally without 'vercel dev', this route (/api/analyze) might return 404 (HTML).

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 1. Check if response is OK (200-299)
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Backend Error Response:", errorText);

            // If it's HTML (likely 404 or 500 from Vite/Vercel generic page), throw specific error
            if (errorText.trim().startsWith('<') || errorText.includes('A server error')) {
                throw new Error("Backend function not available. Please verify server status.");
            }

            throw new Error(`Server Error: ${response.status} ${response.statusText}`);
        }

        // 2. Parse JSON safely
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || "API Connection Error");
        }

        // Direct return if the backend already parsed it (it should have)
        // Adjust based on api/analyze.js response structure
        // The backend returns the final JSON object directly, no 'candidates' wrapper usually.
        // Let's check the structure.

        if (data.plant_name || data.status) {
            return data;
        }

        // Fallback for raw Gemini response structure if backend passed it through
        if (data.candidates && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        }

        throw new Error("Invalid response structure from AI");

    } catch (error) {
        console.warn("Backend analysis failed, attempting client-side fallback...", error);

        // FALLBACK: Client-Side Direct Call
        // This is crucial for local development or if the serverless function is down.
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("AI Service Unavailable (API Key Missing).");
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // Updated to Gemini 2.5 as per user request (2025 API)
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Prepare parts for SDK
            const userPrompt = promptText;
            const sdkParts = [userPrompt];

            // Convert base64 images to SDK format
            images.forEach(img => {
                if (!img) return;
                const base64Data = img.includes(',') ? img.split(',')[1] : img;
                sdkParts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                });
            });

            const result = await model.generateContent(sdkParts);
            const response = await result.response;
            const text = response.text();

            // Clean json
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
            throw new Error(fallbackError.message || "AI Diagnosis completely failed.");
        }
    }
}

/**
 * Generates a random daily plant/pest/disease fact.
 * @param {string} lang - 'tr' or 'en'
 */
export async function generateDailyPlantFact(lang = 'tr') {
    const topics = [
        "A common garden pest (e.g., aphids, spider mites)",
        "A fascinating fungal disease (e.g., powdery mildew)",
        "An interesting beneficial insect (e.g., ladybugs)",
        "A weird or cool plant adaptation",
        "A tip for organic gardening"
    ];
    // Randomly select a topic to ensure variety
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    const promptText = `
    Generate a short, engaging "Daily Plant Fact" for a community of gardeners.
    Topic: ${randomTopic}
    Language: ${lang === 'en' ? 'ENGLISH' : 'TURKISH'}

    The tone should be fun, educational, and slightly informal (like a friendly bot).
    
    Return a VALID JSON object with this structure:
    {
        "title": "Catchy Title",
        "content": "One or two short paragraphs of interesting info. No markdown.",
        "imageKeyword": "A precise English keyword to search for an image (e.g. 'ladybug leaf', 'powdery mildew rose')",
        "type": "tip" | "pest" | "disease" | "fun_fact"
    }
    
    Ensure the content is accurate but simple to read.
    Return ONLY valid raw JSON (no markdown block).
    `;

    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(promptText);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Daily fact generation failed:", error);
        // Fallback static data in case of error
        return {
            title: lang === 'tr' ? "Bitki Dostu İpucu" : "Plant Friendly Tip",
            content: lang === 'tr' ?
                "Bitkilerinizi sabah erken saatlerde sulamak, suyun buharlaşmadan köklere ulaşmasını sağlar." :
                "Watering your plants early in the morning ensures water reaches the roots before evaporating.",
            imageKeyword: "watering plants",
            type: "tip"
        };
    }
}

