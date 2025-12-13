
import urllib.request
import json
import ssl

API_KEY = "AIzaSyBZsgE07GnD6GGpOdeHCFbSQs8tT7Gnd20"
URL = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

try:
    context = ssl.create_default_context()
    with urllib.request.urlopen(URL, context=context) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("--- AVAILABLE MODELS ---")
        found = False
        for model in data.get('models', []):
            if 'generateContent' in model.get('supportedGenerationMethods', []):
                print(f"Name: {model['name']} | Base: {model.get('baseModelId', 'N/A')}")
                found = True
        if not found:
            print("No models support generateContent method.")
except Exception as e:
    print(f"ERROR: {e}")
