import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image, language, promptType } = req.body;

        if (!process.env.VITE_GEMINI_API_KEY) {
            console.error("Server API Key missing");
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use efficient model

        // Prompts based on language
        const prompts = {
            en: `Analyze this plant image. 
                1. Identify the plant name.
                2. Identify if it has any disease or is healthy.
                3. If diseased, provide the disease name.
                4. Provide a description of the problem.
                5. Provide treatment advice.
                6. Estimate a confidence score (0-100).
                
                Return ONLY valid JSON in this format:
                {
                    "plant_name": "...",
                    "is_healthy": true/false,
                    "disease_name": "...", (or "None" if healthy)
                    "description": "...",
                    "treatment": "...",
                    "confidence": 95,
                    "status": "success" (or "needs_details" if unclear)
                }`,
            tr: `Bu bitki fotoğrafını analiz et.
                1. Bitki adını tanımla.
                2. Hastalıklı mı yoksa sağlıklı mı olduğunu belirle.
                3. Hastalıklıysa, hastalık adını yaz.
                4. Sorunun açıklamasını yaz.
                5. Tedavi tavsiyesi ver.
                6. Güven skoru tahmin et (0-100).
                
                SADECE şu formatta geçerli JSON döndür:
                {
                    "plant_name": "...",
                    "is_healthy": true/false,
                    "disease_name": "...", (veya sağlıklıysa "Yok")
                    "description": "...",
                    "treatment": "...",
                    "confidence": 95,
                    "status": "success" (veya belirsizse "needs_details")
                }`
        };

        const prompt = prompts[language] || prompts['en'];
        const additionalPrompt = promptType === 'macro' ? (language === 'tr' ? " Bu yakından çekilmiş bir makro yaprak fotoğrafı, detaylara odaklan." : " This is a macro shot, focus on leaf details.") : "";

        // Prepare Image Part
        const imageParts = [
            {
                inlineData: {
                    data: image.split(',')[1], // Remove 'data:image/jpeg;base64,' prefix
                    mimeType: "image/jpeg",
                },
            },
        ];

        const result = await model.generateContent([prompt + additionalPrompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        // Clean JSON
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        res.status(200).json(data);
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message || 'Analysis failed' });
    }
}
