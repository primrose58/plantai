
export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=" + GEMINI_API_KEY;

        // Forward the body from the frontend to Google
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // Return the Google response back to frontend
        res.status(200).json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
