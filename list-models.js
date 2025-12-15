
const apiKey = "AIzaSyCzizi8MLB5sZDRU4oYwzNFj7BBFNByjQU";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log("Available Models:");
            if (data.models) {
                data.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`- ${m.name}`);
                    }
                });
            } else {
                console.log("No models found in response:", data);
            }
        } else {
            console.log("Error:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

listModels();
