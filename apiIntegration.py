from flask import Flask,jsonify,render_template,request
from flask_cors import CORS
import requests
import pandas as pd
from dotenv import load_dotenv
import os
load_dotenv()

youtubeKey = os.getenv("API_KEY")
app = Flask(__name__)
CORS(app)

ytbUrl = "https://www.googleapis.com/youtube/v3/playlistItems"

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
                res = req.json()
                items = res.get("items",[])
                for info in items:
                    dices = info.get('snippet',{})
                    title = dices.get('title',"")
                    portrait = dices.get('thumbnails',{}).get('medium',{})
                    channel = dices.get('videoOwnerChannelTitle',"")
                    musicInfo.append({"title":title,"portrait":portrait,"channel":channel})
                nextPage = res.get("nextPageToken","")
                if not nextPage or nextPage == "":
                    break  
                nextPageToken = nextPage
            df = pd.DataFrame(musicInfo)
            df['channel'] = df['channel'].str.replace(' - Topic','',regex = False)
            df['portrait_url'] = df['portrait'].apply(lambda x: x.get('url'))
            df = df.drop(columns=['portrait'])
            cleanDices = df.to_dict(orient="records") 
            return jsonify(cleanDices),200
        except requests.exceptions.HTTPError as err:
            print(err)
        except requests.RequestException as err:
            print("Erro de requisição:",err)
            return jsonify({"err":"Erro ao se conectar a api"}),500
        
if __name__ == '__main__':
    app.run(debug=True)
