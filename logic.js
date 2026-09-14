const querySearch = document.getElementById("searchForm")
const resultSection = document.getElementById("results")
const cardsList = document.querySelector(".cards-list")
const loading = document.getElementById("loading")
const sortToggle = document.getElementById("sortToggle")
const sortToggleText = document.getElementById("sortToggleText")
const sortMenu = document.getElementById("sortMenu")
let playlistDices = ""
let colorPallete = []
let dices = ""
if (querySearch) {
    querySearch.addEventListener("submit", async (e) => {
        e.preventDefault()
        let formElements = querySearch.elements
        let urlValue = formElements.namedItem("url").value
        clearContent()
        //animacao de carregamento
        if (urlValue != "") {
            loading.style.display = "block"
            console.log(urlValue)
            let playlistId = urlValue.split("list=")[1]
            try {
                let req = await fetch(`http://127.0.0.1:5000/playlistAnalys?id=${playlistId}`, {
                    method: "GET",
                }
                )
                //tratativas de erro e recepção de dados
                let res = await req.json()
                let musicChannel = res.listOfDices
                for (const item of musicChannel) {
                    colorPallete.push(getRandomColor())
                    showContent(item.title, item.channel, item.portrait_url)
                }
                resultSection.style.visibility = (resultSection.style.visibility === "hidden") ? "visible" : "hidden"
                resetSortState()
                mountGraphic(res.graphicDices)
                loading.style.display = "none"
                let genAi = musicChannel.map(({ portrait_url, ...remains }) => remains)
                let req2 = await fetch(`http://127.0.0.1:5000/genreDices`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(genAi)
                })
                let res2 = await req2.json()
                if (res2 == "") {
                    return mscForArt = res.graphicDices
                }
                dices = {
                    list:musicChannel,
                    mscForArt:res.graphicDices,
                    genForArt:res2
                }
                return dices
            } catch (err) {
                console.log("Erro apresentado:", err)
                return
            }
        }
    })
}

const btnArtMsc = document.getElementById("forArt")
const btnGenMsc = document.querySelector("#forGen")

btnArtMsc.addEventListener("click", () => {
    if (btnArtMsc || dices.mscForArt != "") {
        mountGraphic(dices.mscForArt)
    }
})

btnGenMsc.addEventListener("click", () => {
    console.log("apenas cliquei")
    if (btnGenMsc || dices.genForArt != "") {
        console.log("ENTREI AQ")
        console.log(dices)
        mountGraphic(dices.genForArt)
    }
})


function setupSorting() {
    if (!sortToggle || !sortMenu) return

    sortToggle.addEventListener("click", (e) => {
        e.stopPropagation()
        toggleSortMenu()
    })

    sortMenu.addEventListener("click", (e) => {
        const option = e.target.closest(".sort-menu__item")
        if (option) {
            applySort(option.dataset.sort)
            closeSortMenu()
        }
    })

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".sort-menu-wrapper")) {
            closeSortMenu()
        }
    })
}

function toggleSortMenu() {
    const isOpen = sortMenu.classList.toggle("is-open")
    sortToggle.classList.toggle("is-open", isOpen)
    sortToggle.setAttribute("aria-expanded", String(isOpen))
}

function closeSortMenu() {
    if (!sortMenu) return
    sortMenu.classList.remove("is-open")
    sortToggle.classList.remove("is-open")
    sortToggle.setAttribute("aria-expanded", "false")
}

//retorna a lista com os dados das músicas (title) e artistas (channel)
function getListDices() {
    if (dices) {
        return dices.list
    }
    console.log("deu errado")
    return []
}

function applySort(sortKey = "default") {
    currentSort = sortKey
    const list = getListDices()
    if (list.length === 0) return

    const sorted = [...list]
    if (sortKey === "artist") {
        //channel
        sorted.sort((a, b) =>
            String(a.channel).localeCompare(String(b.channel), "pt-BR", {
                sensitivity: "base",
                numeric: true,
            })
        )
    } else if (sortKey === "music") {
        //title
        sorted.sort((a, b) =>
            String(a.title).localeCompare(String(b.title), "pt-BR", {
                sensitivity: "base",
                numeric: true,
            })
        )
    }

    cardsList.querySelectorAll(".card").forEach((card) => card.remove())
    sorted.forEach((item) => showContent(item.title, item.channel, item.portrait_url))

    sortMenu.querySelectorAll(".sort-menu__item").forEach((btn) => {
        const isActive = btn.dataset.sort === sortKey
        btn.classList.toggle("is-active", isActive)
        if (isActive && sortToggleText) {
            const label = btn.querySelector("span")
            sortToggleText.textContent = label ? label.textContent : "Padrão"
        }
    })
}

function resetSortState() {
    currentSort = "default"
    closeSortMenu()
    if (!sortMenu) return
    const defaultBtn = sortMenu.querySelector('.sort-menu__item[data-sort="default"]')
    sortMenu.querySelectorAll(".sort-menu__item").forEach((btn) => btn.classList.remove("is-active"))
    if (defaultBtn) defaultBtn.classList.add("is-active")
    if (sortToggleText) sortToggleText.textContent = "Padrão"
}

//inicializa os eventos da barra de ordenação
setupSorting()

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function clearContent() {
    const resultSection = document.getElementById("results")
    resultSection.style.visibility = (resultSection.style.visibility === "hidden") ? "visible" : "hidden"
    if (cardsList) {
        // remove apenas os cards, preservando o cabeçalho fixo da lista
        cardsList.querySelectorAll(".card").forEach((c) => c.remove())
    }
    let formElements = querySearch.elements
    let urlElement = formElements.namedItem("url")
    if (urlElement || urlElement != "") {
        urlElement.value = ""
    }
}

function showContent(title, channel, imgSrc) {
    const cardsList = document.querySelector(".cards-list")

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

    cardsList.appendChild(card)
}

function mountGraphic(graphicDices) {
    if (graphicDices) {
        let mountGraphic
        const graphicContainer = document.createElement("div")
        graphicContainer.className = "radialGraphicContainer"

        const chartBox = document.createElement("div")
        chartBox.className = "chart-box"

        const canvasElement = document.createElement("canvas")
        canvasElement.className = "radialGraphic"
        chartBox.appendChild(canvasElement)

        const dicesubtitles = document.createElement("div")
        dicesubtitles.className = "graphicSub"

        graphicContainer.appendChild(chartBox)
        graphicContainer.appendChild(dicesubtitles)
        const ctx = canvasElement.getContext("2d")
        if (mountGraphic) {
            mountGraphic.destroy()
        }
        mountGraphic = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: graphicDices.labels,
                datasets: [{
                    data: graphicDices.data,
                    backgroundColor: colorPallete,
                    hoverOffset: 4,
                    borderWidth: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            }
        });

        graphicDices.labels.forEach((channel, index) => {
            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.gap = "6px";

            const quadrado = document.createElement("div");
            quadrado.style.width = "10px";
            quadrado.style.height = "10px";
            quadrado.style.backgroundColor = colorPallete[index];
            quadrado.style.borderRadius = "4px";

            const texto = document.createElement("span");
            texto.textContent = `${channel} (${graphicDices.data[index]})`;

            item.appendChild(quadrado);
            item.appendChild(texto);
            dicesubtitles.appendChild(item);
        })
        document.querySelector(".graphic-data-content").innerHTML = ""
        document.querySelector(".graphic-data-content").appendChild(graphicContainer)
    }
}
