from google import genai

client = genai.Client(api_key="AQ.Ab8RN6IaEsQpe6eKZhRktB4YqrrqsqIyHVuHV7IWA4nwPlZ1YA")

print("List of models that support generateContent:\n")
for m in client.models.list():
    for action in m.supported_actions:
        if action == "generateContent":
            print(m.name)