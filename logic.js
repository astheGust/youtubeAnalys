const querySearch = document.getElementById("searchForm")
const resultSection = document.getElementById("resultSection")

//criar uma funcao para limpar espacos como a pesquisa e conteudo do resultSection

if (querySearch) {
    querySearch.addEventListener("submit", async (e) => {
        if(resultSection){
            resultSection.innerHTML = ""
        }
        e.preventDefault()
        let formElements = querySearch.elements
        let urlValue = formElements.namedItem("url").value
        if (urlValue != "") {
            let playlistId = urlValue.split("list=")[1]
            try {
                let req = await fetch(`http://127.0.0.1:5000/playlistAnalys?id=${playlistId}`, {
                    method: "GET",
                }
                )
                //tratativas de erro e recepção de dados
                let res = await req.json()
                console.log(res)
                for(const item of res){
                    showContent(item.title,item.channel,item.portrait_url)
                }
            } catch (err) {
                console.log("Erro apresentado:", err)
                return
            }
        }
    })
}

function showContent(title, channel, imgSrc) {
    const cardsSection = document.querySelector(".cards-section")

    const card = document.createElement("div")
    card.className = "card"

    const span = document.createElement("span")
    span.className = "card-thumb"

    const img = document.createElement("img")
    img.src = imgSrc
    img.alt = title
    span.appendChild(img)

    const titleElement = document.createElement("p")
    titleElement.className = "card-title"
    titleElement.textContent = title

    const artistElement = document.createElement("p")
    artistElement.className = "artist-name"
    artistElement.textContent = channel

    card.appendChild(span)
    card.appendChild(titleElement)
    card.appendChild(artistElement)

    cardsSection.appendChild(card)
}