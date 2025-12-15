// API Key and Base URL are now handled in the backend (api/analyze.js)
// to prevent exposing the key in the browser.

/**
 * Analyzes plant images with optional user context.
 * @param {string|string[]} imageData - Base64 string or array of strings
 * @param {string} lang - 'tr' or 'en'
 * @param {string} plantType - User provided plant text (optional)
 */
export async function analyzePlantImage(imageData, lang = 'tr', plantType = null) {
    const images = Array.isArray(imageData) ? imageData : [imageData];

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
        "disease_name": "Disease Name",
        "latin_name": "Latin Name",
        "confidence": 90,
        "urgency": 50,
        "spread_risk": 40,
        "description": "Short description (max 2 sentences).",
        "treatment_steps": ["Step 1", "Step 2", "Step 3"]
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
        // Call our own backend (Vercel Serverless Function)
        // This hides the API key from the browser
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || "API Connection Error");
        }

        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("No response from AI.");
        }

        const text = data.candidates[0].content.parts[0].text;
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error:", text);
            throw new Error("Invalid response format from AI");
        }

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw error;
    }
}
