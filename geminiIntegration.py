import os,json,time
import concurrent.futures
from google import genai
from google.genai import types
from dotenv import load_dotenv
load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def asyncProcessInfo(allInfo):
    infoLength = 50
    infoContainer = [allInfo[i:i + infoLength] for i in range(0,len(allInfo),infoLength)]
    
    finalResults = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futureLoad = []
        
        for info in infoContainer:
            receipt = executor.submit(musicsByGenre, info)
            futureLoad.append(receipt)
        for future in concurrent.futures.as_completed(futureLoad):
            try:
                infoResult = future.result()
                finalResults.update(infoResult)
            except Exception as erro:
                print(f"Falha ao processar um dos lotes: {erro}")
    return finalResults

def musicsByGenre(listOf,maxTry = 3):    
    prompt = str(listOf)
    lateTime = 2
    for chance in range(1,maxTry+1):
        try:
            res = client.models.generate_content(
                model = "gemini-3.5-flash-lite",
                contents= prompt,
                config = types.GenerateContentConfig(
                    system_instruction = """Categorize as músicas fornecidas baseando-se no título e no artista. 
                        Retorne ESTRITAMENTE um objeto JSON onde a chave é o título da música e o valor é o gênero musical.
                        
                        Regras estritas:
                        - Não retorne sub-estilos musicais geográficos (como J-Pop ou J-Rock). Simplifique para "Pop" ou "Rock".
                        - Mantenha categorias de mídia como "Game OST" ou "Anime OST" se for a origem principal.
                        
                        Exemplo de Entrada:
                        [
                            {"title": "Saudade", "artist": "Marzuku"},
                            {"title": "RabitGray", "artist": "Eve Mv"},
                            {"title": "WindScene", "artist": "Yasunori Mitsuda"}
                        ] 
                        Exemplo de Saída esperada:
                        {
                            "Saudade": "Orchestral",
                            "RabitGray": "Rock",
                            "WindScene": "Game OST"
                        }
                            
                        Faça exatamente o mesmo com estes dados: """,
                    response_mime_type="application/json"
                )
            )
            pythonDict = json.loads(res.text)
            return pythonDict
        except Exception as e:
            error = str(e).lower()
            if "overloaded" in error or "503" in error or "resourceexhausted" in error:
                if chance < maxTry:
                    time.sleep(lateTime)
                    lateTime *=2
                    continue
            raise e
    raise Exception("Api ainda sobrecarregada, erro no sistema")


