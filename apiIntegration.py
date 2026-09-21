from flask import Flask,jsonify,send_from_directory,render_template,request
from flask_cors import CORS
import requests
import pandas as pd
from dotenv import load_dotenv
import os
from geminiIntegration import musicsByGenre,asyncProcessInfo
load_dotenv()
youtubeKey = os.getenv("API_KEY")
app = Flask(__name__)
CORS(app)

ytbUrl = "https://www.googleapis.com/youtube/v3/playlistItems"

@app.route("/styles.css")
def styles():
    return send_from_directory(os.path.join(app.root_path, "."), "styles.css")

@app.route("/logic.js")
def logic():
    return send_from_directory(os.path.join(app.root_path, "."), "logic.js")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/playlistAnalys",methods=["GET"])
def getDices():
    listId = request.args.get('id',"")
    if listId != "":
        try:
            musicInfo = []
            nextPageToken = ""
            while True: #executa no mínimo uma vez
                parameters = {
                    "part":"snippet","playlistId":listId,"key":youtubeKey,"maxResults":50
                }
                if nextPageToken!="":
                    parameters["pageToken"] = nextPageToken
                req = requests.get(ytbUrl,params=parameters)
                req.raise_for_status()
                res = req.json()
                items = res.get("items",[])
                privateCount = 0
                for info in items:
                    dices = info.get('snippet',"")
                    title = dices.get('title',"")
                    portrait = dices.get('thumbnails',"").get('medium',"")
                    if(isinstance(portrait,str) or not portrait):
                        privateCount+= 1
                        continue
                    channel = dices.get('videoOwnerChannelTitle',"")
                    musicInfo.append({"title":title,"portrait":portrait,"channel":channel})
                nextPage = res.get("nextPageToken","")
                if not nextPage or nextPage == "":
                    break  
                nextPageToken = nextPage
            #limpa de dados
            df = pd.DataFrame(musicInfo)
            df['channel'] = df['channel'].str.replace(' - Topic','',regex = False)
            df['portrait_url'] = df['portrait'].apply(lambda x: x.get('url'))
            df = df.drop(columns=['portrait'])
            listedDices = df.to_dict(orient="records")             
            channelValues = df["channel"].value_counts()         
            artists = channelValues.index.tolist()
            musicCount = channelValues.values.tolist()
            dices = {
                "listOfDices": listedDices,
                "PrivateContent":privateCount,
                "graphicDices":
                    {
                        "labels":artists,
                        "data":musicCount
                    }
            }
            return jsonify(dices),200
        except requests.exceptions.HTTPError as err:
            status = err.response.status_code
            if(status == 403):
                return jsonify({"err":"Acesso não autorizado ou quota excedida"}),403
            elif(status == 400):
                return jsonify({"err":"Valor de parametro inválido"}),400
            else:
                return jsonify({"err":"Erro inesperado"}),status
        except requests.RequestException as err:
            print("Erro de requisição:",err)
            return jsonify({"err":"Erro ao se conectar a api"}),500

@app.route("/genreDices",methods=["POST"])
def genreDices():
    genAi = request.json
    if(genAi != ""):
        try:
            genreDict = asyncProcessInfo(genAi)
            genPd = pd.Series(list(genreDict.values()))
            count = genPd.value_counts()
            labels = count.index.tolist()
            quantity = count.values.tolist()
            dices = {
                "labels":labels,
                "data":quantity}
            return jsonify(dices)
        except requests.RequestException as err:
            print("Erro de requisição:",err)
            return jsonify({"err":"Erro ao se conectar a api"}),500        

if __name__ == '__main__':
    app.run(debug=True)
