import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv
load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def musicsByGenre(listOf):    
    prompt = f"""
    Categorize as músicas fornecidas baseando-se no título e no artista. 
    Retorne ESTRITAMENTE um objeto JSON onde a chave é o título da música e o valor é o gênero musical.
    
    Regras estritas:
    - Não retorne sub-estilos musicais geográficos (como J-Pop ou J-Rock). Simplifique para "Pop" ou "Rock".
    - Mantenha categorias de mídia como "Game OST" ou "Anime OST" se for a origem principal.
    
    Exemplo de Entrada:
    [
        {{"title": "Saudade", "artist": "Marzuku"}},
        {{"title": "RabitGray", "artist": "Eve Mv"}},
        {{"title": "WindScene", "artist": "Yasunori Mitsuda"}}
    ]
    
    Exemplo de Saída esperada:
    {{
        "Saudade": "Orchestral",
        "RabitGray": "Rock",
        "WindScene": "Game OST"
    }}
        
    Faça exatamente o mesmo com estes dados: 
    {listOf}
    """
    
    res = client.models.generate_content(
        model = "gemini-3.5-flash-lite",
        contents= prompt,
        config = types.GenerateContentConfig(
            system_instruction = "Você é um especialista em trilhas sonoras e música no geral",
            response_mime_type="application/json"
        )
    )
    pythonDict = json.loads(res.text)
    return pythonDict