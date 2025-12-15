
const fs = require('fs');
const apiKey = "AIzaSyCzizi8MLB5sZDRU4oYwzNFj7BBFNByjQU";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        fs.writeFileSync('models.json', JSON.stringify(data, null, 2));
        console.log("Written to models.json");
    } catch (e) {
        console.error("Exception:", e);
    }
}

listModels();
