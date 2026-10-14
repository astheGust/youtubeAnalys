const querySearch = document.getElementById("searchForm")
const resultSection = document.getElementById("results")
const analyzedUrl = document.getElementById("analyzedUrl")
const listSortBar = document.querySelector(".sort-bar")
const cardsList = document.querySelector(".cards-list")
const loading = document.getElementById("loading")
const sortToggle = document.getElementById("sortToggle")
const sortToggleText = document.getElementById("sortToggleText")
const sortMenu = document.getElementById("sortMenu")
const carouselTrack = document.getElementById("carouselTrack")
const carouselIndicators = document.querySelector(".carousel-indicators")
const genreSummaryPanel = document.querySelector(".genre-summary")
const genreSummaryLoader = document.getElementById("genreSummaryLoader")
const genreSummary = document.getElementById("genreSummary")
const genreSummaryNote = document.getElementById("genreSummaryNote")
const chartModeSwitch = document.querySelector(".chart-mode-switch")

let playlistData = []
let chartInstances = []
let activeSlide = 0
let artistGraphicData = null
let selectedGraphicMode = "less"

if (querySearch) {
    querySearch.addEventListener("submit", async (e) => {
        e.preventDefault()
        const urlValue = querySearch.elements.namedItem("url").value.trim()
        clearContent()
        analyzedUrl.querySelector("a").href = urlValue
        const playlistId = new URL(urlValue).searchParams.get("list")
        if (!playlistId) {
            showAnalysisError("A URL não contém o identificador de uma playlist.")
            return
        }

        loading.style.display = "block"
        let isGenreLoading = false
        try {
            const playlistResponse = await fetch(`http://127.0.0.1:5000/playlistAnalys?id=${encodeURIComponent(playlistId)}`)
            const playlistResult = await playlistResponse.json()
            if (!playlistResponse.ok) {
                throw new Error(playlistResult.err || "Não foi possível analisar a playlist.")
            }
            playlistData = Array.isArray(playlistResult.listOfDices) ? playlistResult.listOfDices : []
            playlistData.forEach((item) => showContent(item.title, item.channel, item.portrait_url))
            resetSortState()
            const totalViews = playlistData.reduce((highest, item) => Math.max(highest, Number(item.viewsCount) || 0), 0)
            const playlistTitle = document.getElementById("playlistTitle")
            const songCount = document.getElementById("songCount")
            const viewsCount = document.getElementById("viewsCount")
            if (playlistTitle) playlistTitle.textContent = playlistResult.ytbPlaylistTitle || "Playlist analisada"
            if (songCount) songCount.textContent = playlistData.length
            if (viewsCount) viewsCount.textContent = new Intl.NumberFormat("pt-BR").format(totalViews)
            renderCarousel(playlistResult.graphicDices, playlistData)
            if (playlistResult.privateContent) {
                showWarning(`Sua playlist possui ${playlistResult.privateContent} música(s) indisponível`)
            }
            listSortBar.querySelector(".sort-bar__countLabel").textContent = `${playlistData.length} Itens`
            analyzedUrl.querySelector("a").textContent = "Link para playlist"
            querySearch.elements.namedItem("url").value = ""
            resultSection.classList.add("is-visible")
            analyzedUrl.classList.add("is-visible")
            genreSummaryLoader.hidden = false
            genreSummary.hidden = true
            genreSummaryNote.hidden = true
            genreSummaryPanel.setAttribute("aria-busy", "true")
            isGenreLoading = true
            loading.style.display = "none"

            const genreResponse = await fetch("/genreDices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    playlistData.map(({ channel, title }) => ({ channel, title }))
                )
            })
            const genreResult = await genreResponse.json()
            if (!genreResponse.ok) {
                throw new Error(genreResult.err || "Não foi possível analisar os gêneros.")
            }
            const genreDescription = typeof genreResult === "string"
                ? genreResult
                : genreResult?.response || genreResult?.text || genreResult?.output_text || "Não foi possível obter o resumo do estilo."
            genreSummary.textContent = genreDescription
            genreSummary.hidden = false
            genreSummaryLoader.hidden = true
            genreSummaryNote.hidden = false
            genreSummaryPanel.setAttribute("aria-busy", "false")
            isGenreLoading = false

        } catch (err) {
            if (isGenreLoading) {
                genreSummary.textContent = err.message || "Não foi possível obter o resumo do estilo."
                genreSummary.hidden = false
                genreSummaryLoader.hidden = true
                genreSummaryNote.hidden = true
                genreSummaryPanel.setAttribute("aria-busy", "false")
            } else {
                showAnalysisError(err.message || "Ocorreu um erro ao analisar a playlist.")
            }
        } finally {
            loading.style.display = "none"
        }
    })
}

function showAnalysisError(message) {
    const error = document.createElement("p")
    error.className = "analysis-error"
    error.textContent = message
    document.querySelector(".graphic-data-content").appendChild(error)
    resultSection.classList.add("is-visible")
}

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

function applySort(sortKey = "default") {
    const list = playlistData
    if (list.length === 0) return

    const sorted = [...list]
    if (sortKey === "artist") {
        sorted.sort((a, b) =>
            String(a.channel).localeCompare(String(b.channel), "pt-BR", {
                sensitivity: "base",
                numeric: true,
            })
        )
    } else if (sortKey === "music") {
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
    closeSortMenu()
    if (!sortMenu) return
    const defaultBtn = sortMenu.querySelector('.sort-menu__item[data-sort="default"]')
    sortMenu.querySelectorAll(".sort-menu__item").forEach((btn) => btn.classList.remove("is-active"))
    if (defaultBtn) defaultBtn.classList.add("is-active")
    if (sortToggleText) sortToggleText.textContent = "Padrão"
}

setupSorting()

function getRandomColor() {
    const letters = "0123456789ABCDEF"
    let color = "#"
    for (let index = 0; index < 6; index++) {
        color += letters[Math.floor(Math.random() * 16)]
    }
    return color
}

function clearContent() {
    resetWarning()
    resultSection.classList.remove("is-visible")
    analyzedUrl.classList.remove("is-visible")
    analyzedUrl.querySelector("a").textContent = ""
    if (cardsList) {
        cardsList.querySelectorAll(".card").forEach((c) => c.remove())
    }
    playlistData = []
    artistGraphicData = null
    chartInstances.forEach((chart) => chart.destroy())
    chartInstances = []
    document.getElementById("artistLegend").replaceChildren()
    genreSummaryLoader.hidden = true
    genreSummary.textContent = ""
    genreSummary.hidden = true
    genreSummaryNote.hidden = true
    genreSummaryPanel.setAttribute("aria-busy", "false")
    document.querySelector(".graphic-data-content").querySelectorAll(".analysis-error").forEach((error) => error.remove())
    document.getElementById("durationExtremes").replaceChildren()
    document.getElementById("viewsExtremes").replaceChildren()
    updateCarousel(0)
}

function showContent(title, channel, imgSrc) {
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

function lessDataGraphic(canvasId, legendId, graphicData) {
    const labels = Array.isArray(graphicData?.labels) ? graphicData.labels : []
    const values = Array.isArray(graphicData?.data) ? graphicData.data : []
    const colors = labels.map(() => getRandomColor())
    const canvas = document.getElementById(canvasId)
    const legend = document.getElementById(legendId)

    if (labels.length && canvas && window.Chart) {
        chartInstances.push(new Chart(canvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors, hoverOffset: 4, borderWidth: 2 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: { legend: { display: false } },
            },
        }))
    }

    legend.replaceChildren()
    labels.forEach((label, index) => {
        const item = document.createElement("div")
        item.className = "legend-item"
        const swatch = document.createElement("span")
        swatch.className = "legend-swatch"
        swatch.style.backgroundColor = colors[index]
        const text = document.createElement("span")
        text.textContent = `${label} (${values[index] ?? 0})`
        item.append(swatch, text)
        legend.appendChild(item)
    })
}

function moreDataGraphic(canvasId, legendId, graphicData) {
    const labels = Array.isArray(graphicData?.labels) ? graphicData.labels : []
    const values = Array.isArray(graphicData?.data) ? graphicData.data : (Array.isArray(graphicData?.values) ? graphicData.values : [])
    const colors = labels.map(() => getRandomColor())
    const canvas = document.getElementById(canvasId)
    const legend = document.getElementById(legendId)

    if (labels.length && canvas && window.Chart) {
        chartInstances.push(new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        type: "line",
                        label: "Tendência",
                        data: values,
                        borderColor: "#ff6384",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    },
                    {
                        type: "bar",
                        label: "Quantidade",
                        data: values,
                        backgroundColor: "rgba(54, 162, 235, 0.8)",
                        barPercentage: 1.0,
                        categoryPercentage: 1.0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { autoSkip: true, maxTicksLimit: 5, maxRotation: 0 }
                    },
                    y: { beginAtZero: true }
                }
            }
        }))
    }

    if (legend) {
        legend.replaceChildren()
        labels.forEach((label, index) => {
            const item = document.createElement("div")
            item.className = "legend-item"
            const swatch = document.createElement("span")
            swatch.className = "legend-swatch"
            swatch.style.backgroundColor = colors[index]
            const text = document.createElement("span")
            text.textContent = `${label} (${values[index] ?? 0})`
            item.append(swatch, text)
            legend.appendChild(item)
        })
    }
}

function durationToSeconds(duration) {
    if (typeof duration !== "string") return NaN
    const normalizedDuration = duration.trim()
    const isoParts = normalizedDuration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
    if (isoParts) {
        const [, hours, minutes, seconds] = isoParts
        return parseInt(hours || "0", 10) * 3600 + parseInt(minutes || "0", 10) * 60 + parseInt(seconds || "0", 10)
    }
    const parts = normalizedDuration.split(":")
    if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return NaN
    const numbers = parts.map((part) => parseInt(part, 10))
    if (parts.length === 3) return numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
    return numbers[0] * 60 + numbers[1]
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}` : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}

function renderExtremes(containerId, items, valueKey, valueLabel, formatter) {
    const validItems = items
        .map((item) => ({ item, value: formatter.parse(item[valueKey]) }))
        .filter(({ value }) => Number.isFinite(value))
    const container = document.getElementById(containerId)
    container.replaceChildren()

    if (!validItems.length) {
        const emptyState = document.createElement("p")
        emptyState.className = "empty-state"
        emptyState.textContent = `Não há dados de ${valueLabel.toLowerCase()} disponíveis.`
        container.appendChild(emptyState)
        return
    }

    const shortest = validItems.reduce((minimum, current) => current.value < minimum.value ? current : minimum)
    const longest = validItems.reduce((maximum, current) => current.value > maximum.value ? current : maximum)
        ;[["Maior", longest], ["Menor", shortest]].forEach(([heading, entry]) => {
            const card = document.createElement("article")
            card.className = "extreme-item"
            card.classList.add(heading === "Maior" ? "extreme-item--maximum" : "extreme-item--minimum")
            const label = document.createElement("span")
            label.className = "extreme-label"
            label.textContent = heading
            const title = document.createElement("h3")
            title.textContent = entry.item.title || "Música sem título"
            const artist = document.createElement("p")
            artist.textContent = entry.item.channel || "Artista desconhecido"
            const value = document.createElement("strong")
            value.textContent = formatter.display(entry.value)

            const details = document.createElement("div")
            details.className = "extreme-item__details"
            details.append(label, title, artist, value)

            const portraitUrl = entry.item.portrait_url
            if (portraitUrl) {
                const portrait = document.createElement("img")
                portrait.className = "extreme-item__portrait"
                portrait.src = portraitUrl
                portrait.alt = `Imagem de ${entry.item.title || "música sem título"}`
                portrait.loading = "lazy"
                if (heading === "Maior") card.append(portrait, details)
                else card.append(details, portrait)
            } else {
                card.append(details)
            }
            container.appendChild(card)
        })
}

function renderCarousel(artistData, items) {
    artistGraphicData = artistData
    selectedGraphicMode = items.length > 150 ? "more" : "less"
    renderArtistGraphic()
    renderExtremes("durationExtremes", items, "duration", "duração", {
        parse: durationToSeconds,
        display: formatDuration,
    })
    renderExtremes("viewsExtremes", items, "viewsCount", "visualizações", {
        parse: (value) => typeof value === "string" || typeof value === "number" ? parseInt(value, 10) : NaN,
        display: (value) => new Intl.NumberFormat("pt-BR").format(value),
    })
    updateCarousel(0)
}

function renderArtistGraphic() {
    chartInstances.forEach((chart) => chart.destroy())
    chartInstances = []
    const renderGraphic = selectedGraphicMode === "more" ? moreDataGraphic : lessDataGraphic
    renderGraphic("artistChart", "artistLegend", artistGraphicData)
    chartModeSwitch.querySelectorAll("[data-chart-mode]").forEach((button) => {
        const isSelected = button.dataset.chartMode === selectedGraphicMode
        button.classList.toggle("is-active", isSelected)
        button.setAttribute("aria-pressed", String(isSelected))
    })
}

chartModeSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-chart-mode]")
    if (!button || button.dataset.chartMode === selectedGraphicMode) return
    selectedGraphicMode = button.dataset.chartMode
    renderArtistGraphic()
})

function updateCarousel(index) {
    if (!carouselTrack) return
    const slides = carouselTrack.querySelectorAll(".carousel-slide")
    activeSlide = Math.max(0, Math.min(index, slides.length - 1))
    carouselTrack.style.transform = `translateX(-${activeSlide * 100}%)`
    slides.forEach((slide, slideIndex) => slide.setAttribute("aria-hidden", String(slideIndex !== activeSlide)))
    carouselIndicators.querySelectorAll("[data-slide-index]").forEach((indicator, indicatorIndex) => {
        const isActive = indicatorIndex === activeSlide
        indicator.classList.toggle("is-active", isActive)
        if (isActive) indicator.setAttribute("aria-current", "step")
        else indicator.removeAttribute("aria-current")
    })
}

carouselIndicators.addEventListener("click", (event) => {
    const indicator = event.target.closest("[data-slide-index]")
    if (indicator) updateCarousel(Number(indicator.dataset.slideIndex))
})

const divWarning = document.getElementById("excludedWarning")
const divText = document.getElementById("excludedCount")
const exclamationIcon = document.getElementById("exclamIcon")
const WARNING_HIDE_DELAY = 1000
let warningHideTimer

function cancelWarningHide() {
    clearTimeout(warningHideTimer)
}

function isWarningOpen() {
    return divWarning.classList.contains("is-open")
}

function setWarningOpen(isOpen) {
    cancelWarningHide()
    divWarning.classList.toggle("is-open", isOpen)
    exclamationIcon.setAttribute("aria-expanded", String(isOpen))
    divText.setAttribute("aria-hidden", String(!isOpen))
}

function resetWarning() {
    setWarningOpen(false)
    divWarning.classList.remove("is-visible")
}

function showWarning(message) {
    resetWarning()
    divText.innerText = message
    divWarning.classList.add("is-visible")
}

function scheduleWarningHide() {
    cancelWarningHide()
    if (isWarningOpen()) {
        warningHideTimer = setTimeout(() => setWarningOpen(false), WARNING_HIDE_DELAY)
    }
}

if (exclamationIcon && divWarning && divText) {
    exclamationIcon.addEventListener("click", () => {
        if (isWarningOpen()) {
            setWarningOpen(false)
        } else {
            setWarningOpen(true)
        }
    })
    divWarning.addEventListener("mouseenter", cancelWarningHide)
    divWarning.addEventListener("mouseleave", scheduleWarningHide)
}

const THEME_KEY = "playlist-theme"
const themeToggle = document.getElementById("themeToggle")
const themeToggleIcon = document.getElementById("themeToggleIcon")

function updateThemeButton(theme) {
    const isDark = theme === "dark"
    if (themeToggleIcon) {
        themeToggleIcon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon"
    }
    if (themeToggle) {
        themeToggle.setAttribute("aria-pressed", String(isDark))
        themeToggle.title = isDark ? "Ativar modo claro" : "Ativar modo noturno"
        themeToggle.setAttribute("aria-label", themeToggle.title)
    }
}

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"
        document.documentElement.dataset.theme = nextTheme
        localStorage.setItem(THEME_KEY, nextTheme)
        updateThemeButton(nextTheme)
    })
}

updateThemeButton(document.documentElement.dataset.theme || "light")
