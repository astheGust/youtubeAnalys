from flask import Flask,jsonify,send_from_directory,render_template,request
from flask_cors import CORS
import requests,re
import pandas as pd
from dotenv import load_dotenv
import os
from geminiIntegration import processInfo
load_dotenv()
youtubeKey = os.getenv("API_KEY")
app = Flask(__name__)
CORS(app)

ytbPlaylistInfo = "https://www.googleapis.com/youtube/v3/playlists"
ytbPlaylistItems = "https://www.googleapis.com/youtube/v3/playlistItems"
ytbVideosInfo = "https://www.googleapis.com/youtube/v3/videos:batchGetStats"

def format_duration(duration):
    numbers = duration.split("s")[0]
    if(numbers):
        tupleNumbers = divmod(int(numbers),60)
    else:
        return {"00:00"}
    return f"{tupleNumbers[0]}:{tupleNumbers[1]:02d}"

@app.route("/styles.css")
def styles():
    return send_from_directory(os.path.join(app.root_path, "."), "styles.css")

@app.route("/logic.js")
def logic():
    return send_from_directory(os.path.join(app.root_path, "."), "logic.js")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/playlistAnalys", methods=["GET"])
def getDices():
    listId = request.args.get('id', "")
    if listId != "":
        try:
            musicInfo = []
            privateCount = 0
            nextPageToken = ""
            reqPlaylistInfo = requests.get(ytbPlaylistInfo,params={
                "part": "snippet", "key": youtubeKey, "id": listId
            });
            if(not reqPlaylistInfo.ok):
                return {"errorInfo":reqPlaylistInfo.status_code}
            resPlaylistInfo = reqPlaylistInfo.json()
            contentInfo = resPlaylistInfo.get("items",[])
            if contentInfo: playlistTitle = contentInfo[0].get("snippet",[]).get("title","")
            while True:

                parameters = {
                    "part": "snippet", "playlistId": listId, "key": youtubeKey, "maxResults": 50
                }
                if nextPageToken != "":
                    parameters["pageToken"] = nextPageToken
                req = requests.get(ytbPlaylistItems, params=parameters)
                req.raise_for_status()
                res = req.json()
                items = res.get("items", [])

                musicsIds = []
                page_dict = {}
                
                for info in items:
                    dices = info.get('snippet', "")
                    title = dices.get('title', "")
                    portrait = dices.get('thumbnails', "").get('medium', "")
                    if isinstance(portrait, str) or not portrait:
                        privateCount += 1
                        continue
                    vdId = dices.get('resourceId', "").get('videoId')
                    musicsIds.append(vdId)
                    channel = dices.get('videoOwnerChannelTitle', "")
                    
                    page_dict[vdId] = {
                        "title": title,
                        "portrait": portrait,
                        "channel": channel
                    }
                
                if musicsIds:
                    oneStringvdId = ','.join(musicsIds)
                    req_stats = requests.get(ytbVideosInfo, params={
                        "part": "statistics,contentDetails", "key": youtubeKey, "id": oneStringvdId
                    })
                    req_stats.raise_for_status()
                    res_stats = req_stats.json()
                    stats_items = res_stats.get("items", [])
                    
                    for item in stats_items:
                        vdId = item.get("id")
                        views = item.get("statistics", "").get("viewCount")
                        durationStr = item.get("contentDetails", "").get("duration", "")
                        duration = format_duration(durationStr)
                        if vdId in page_dict:
                            page_dict[vdId]["viewsCount"] = views
                            page_dict[vdId]["duration"] = duration             
                    musicInfo.extend(page_dict.values())
                nextPage = res.get("nextPageToken", "")
                if not nextPage or nextPage == "":
                    break  
                nextPageToken = nextPage
                
            df = pd.DataFrame(musicInfo)
            df['channel'] = df['channel'].str.replace(' - Topic', '', regex=False).str.replace(' Topic', '', regex=False)
            df['portrait_url'] = df['portrait'].apply(lambda x: x.get('url') if isinstance(x, dict) else "")
            df = df.drop(columns=['portrait'])
            
            listedDices = df.to_dict(orient="records")
            channelValues = df["channel"].value_counts()
            artists = channelValues.index.tolist()
            musicCount = channelValues.values.tolist()
            
            dices = {
                "ytbPlaylistTitle":playlistTitle,
                "listOfDices": listedDices,
                "privateContent": privateCount,
                "graphicDices": {
                    "labels": artists,
                    "data": musicCount
                }
            }
            return jsonify(dices), 200
        except requests.exceptions.HTTPError as err:
            status = err.response.status_code
            if status == 403:
                return jsonify({"err": "Acesso não autorizado ou quota excedida"}), 403
            elif status == 400:
                return jsonify({"err": "Valor de parametro inválido"}), 400
            else:
                return jsonify({"err": "Erro inesperado"}), status
        except requests.RequestException as err:
            print("Erro de requisição:", err)
            return jsonify({"err": "Erro ao se conectar a api"}), 500
    return jsonify({"err": "ID da playlist não fornecido"}), 400

@app.route("/genreDices", methods=["POST"])
def genreDices():
    genAi = request.json
    if genAi != "":
        try:
            genreDict = processInfo(genAi)
            genPd = pd.Series(genreDict.values())
            count = genPd.value_counts()
            labels = count.index.tolist()
            quantity = count.values.tolist()
            dices = {
                "labels":labels,
                "data":quantity}
            return jsonify(dices)
        except Exception as err:
            print("Erro ao processar requisição:", err)
            return jsonify({"err": "Erro ao processar dados da IA"}), 500
if __name__ == '__main__':
    app.run(debug=True)
