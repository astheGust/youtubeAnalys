import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client()

def analisar_estilo_playlist(lista_musicas):
    if not lista_musicas:
        return "A lista de músicas está vazia."

    texto_playlist = ""
    for item in lista_musicas:
        titulo = item.get("title", "Desconhecido")
        artista = item.get("artist") or item.get("channel") or "Desconhecido"
        texto_playlist += f"- Artista: {artista} | Título: {titulo}\n"

    prompt = f"""
    Analise a seguinte lista de músicas:
    
    {texto_playlist}
    
    Me retorne apenas uma frase direta (máximo de 3 linhas) resumindo o estilo musical geral da playlist. 
    Use palavras pouco complexas e siga estritamente este formato de exemplo: 
    "[estilo principal], com forte presença de [estilos secundários ou características]."
    
    Não inclua saudações, explicações ou aspas na sua resposta.
    """

    try:
        interaction = client.interactions.create(
            model="gemini-3.5-flash-lite",
            input=prompt
        )
        
        return interaction.output_text.strip()
        
    except Exception as e:
        print(f"Erro ao processar a lista com o Gemini: {e}")
        return "Erro ao analisar o estilo da playlist."
