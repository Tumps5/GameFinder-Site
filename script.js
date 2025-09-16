// Client script (restored and cleaned)
const backendURL = "http://localhost:3001";
const placeholder = "https://upload.wikimedia.org/wikipedia/commons/8/8c/No_image_available.svg";

// Estado da aplicação
const appState = {
  isLoading: false,
  lastSearch: '',
  currentView: 'home'
};

// Elementos DOM frequentemente usados
const elements = {
  searchInput: document.getElementById("search"),
  searchButton: document.getElementById("btnSearch"),
  gamesContainer: document.getElementById("gamesContainer"),
  releasesContainer: document.getElementById("releasesContainer"),
  popularGamesContainer: document.getElementById("popularGamesContainer")
};

function safeGet(obj, prop, fallback) {
  return obj && obj[prop] !== undefined ? obj[prop] : fallback;
}

function formatImageUrl(cover) {
  if (!cover) return placeholder;
  return cover.includes('https://images.igdb.com') ? cover : `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.split('/').pop()}`;
}

function createGameCard(jogo, cardType = 'gameCard') {
  const name = safeGet(jogo, 'name', 'Jogo desconhecido');
  const cover = safeGet(jogo.cover, 'url', placeholder);
  const rating = safeGet(jogo, 'rating', 'N/A');
  const releaseDate = safeGet(jogo, 'first_release_date', null);

  const div = document.createElement('div');
  div.classList.add(cardType);
  div.classList.add('card-enter');

  let releaseDateFormatted = '';
  if (releaseDate) {
    const d = new Date(releaseDate * 1000);
    releaseDateFormatted = `<p>Lançamento: ${d.toLocaleDateString('pt-BR')}</p>`;
  }

  div.innerHTML = `
    <div class="card-image">
      <img src="${formatImageUrl(cover)}" alt="${name}" loading="lazy">
      ${rating !== 'N/A' ? `<div class="rating">${rating.toFixed(1)}</div>` : ''}
    </div>
    <div class="card-content">
      <h3 title="${name}">${name}</h3>
      ${rating !== 'N/A' ? `<p>Nota: ${rating.toFixed(1)}/100</p>` : '<p>Nota: N/A</p>'}
      ${releaseDateFormatted}
    </div>
  `;

  div.addEventListener('click', () => showGameDetails(jogo));
  setTimeout(() => div.classList.remove('card-enter'), 500);
  return div;
}

function showGameDetails(jogo) {
  if (!jogo || !jogo.id) return console.error('Jogo inválido ou sem ID');
  window.location.href = `game-details.html?id=${jogo.id}`;
}

function setLoading(isLoading) {
  appState.isLoading = isLoading;
  if (elements.searchButton) {
    elements.searchButton.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-search"></i>';
    elements.searchButton.disabled = !!isLoading;
  }
}

async function buscarJogos(nome, container = elements.gamesContainer) {
  if (!nome) return;
  appState.lastSearch = nome;
  appState.currentView = 'search';
  const sr = document.querySelector('.search-results-section'); if (sr) sr.style.display = 'block';
  try {
    setLoading(true);
    const res = await fetch(`${backendURL}/games?search=${encodeURIComponent(nome)}`);
    const jogos = await res.json();
    if (container) container.innerHTML = '';
    if (!jogos || jogos.length === 0) {
      if (container) container.innerHTML = `<div class="no-results"><i class="fas fa-search fa-3x"></i><p>Nenhum resultado encontrado para "${nome}"</p></div>`;
      return;
    }
    jogos.forEach((jogo, index) => setTimeout(() => { if (container) container.appendChild(createGameCard(jogo)); }, index * 50));
  } catch (err) {
    console.error('Erro ao buscar jogos:', err);
    if (container) container.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle fa-3x"></i><p>Ocorreu um erro ao buscar os jogos. Tente novamente.</p></div>`;
  } finally { setLoading(false); }
}

async function principaisLancamentos() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const threeMonthsAgo = now - 90 * 24 * 60 * 60;
    const query = `fields name, cover.url, rating, first_release_date, summary; where first_release_date >= ${threeMonthsAgo} & first_release_date <= ${now}; sort rating desc; limit 12;`;
    const res = await fetch(`${backendURL}/games/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const jogos = await res.json();
    if (elements.releasesContainer) elements.releasesContainer.innerHTML = '';
    if (Array.isArray(jogos)) jogos.forEach((jogo, index) => setTimeout(() => { if (elements.releasesContainer) elements.releasesContainer.appendChild(createGameCard(jogo, 'releaseCard')); }, index * 100));
  } catch (err) { console.error('Erro ao buscar lançamentos:', err); if (elements.releasesContainer) elements.releasesContainer.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Não foi possível carregar os lançamentos recentes.</p></div>`; }
}

async function jogosPopulares() {
  try {
    const query = `fields name, cover.url, rating, first_release_date, summary; sort rating desc; limit 12;`;
    const res = await fetch(`${backendURL}/games/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const jogos = await res.json();
    if (elements.popularGamesContainer) elements.popularGamesContainer.innerHTML = '';
    if (Array.isArray(jogos)) jogos.forEach((jogo, index) => setTimeout(() => { if (elements.popularGamesContainer) elements.popularGamesContainer.appendChild(createGameCard(jogo)); }, index * 50));
  } catch (err) { console.error('Erro ao buscar jogos populares:', err); if (elements.popularGamesContainer) elements.popularGamesContainer.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Não foi possível carregar os jogos populares.</p></div>`; }
}

function initApp() {
  const isDetailsPage = document.getElementById('gameDetailsContainer') !== null;
  const isResultsPage = document.getElementById('search-results-grid') !== null;
  if (isDetailsPage) {
    const urlParams = new URLSearchParams(window.location.search); const gameId = urlParams.get('id');
    if (!gameId) return document.getElementById('gameDetailsContainer').innerHTML = '<p>Jogo não encontrado.</p>';
    fetch(`${backendURL}/games/${gameId}`).then(r => r.json()).then(game => {
      const container = document.getElementById('gameDetailsContainer');
      const releaseDate = game.first_release_date ? new Date(game.first_release_date * 1000).toLocaleDateString('pt-BR') : 'Data não disponível';
      const videoId = game.videos && game.videos.length > 0 ? game.videos[0].video_id : null;
      let screenshotUrl = null; if (game.screenshotUrls && game.screenshotUrls.length > 0) screenshotUrl = game.screenshotUrls[0]; else if (game.screenshots && game.screenshots.length > 0 && game.screenshots[0].url) screenshotUrl = game.screenshots[0].url.replace('t_thumb', 't_screenshot_big');
      let coverUrl = game.coverUrl || null; if (!coverUrl && game.cover) { if (typeof game.cover === 'string') coverUrl = game.cover.replace('t_thumb', 't_cover_big'); else if (game.cover.url) coverUrl = game.cover.url.replace('t_thumb', 't_cover_big'); }
      container.innerHTML = `
        <div class="game-header">
          <h1 class="game-title">${game.name}</h1>
          <div class="game-meta">
            <span><i class="fas fa-calendar"></i> ${releaseDate}</span>
            <span><i class="fas fa-star"></i> ${game.rating ? game.rating.toFixed(1) : 'N/A'}/100</span>
          </div>
        </div>
        <div class="game-content">
          <div class="game-left-column">
            <div class="game-video">
              ${videoId ? `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>` : screenshotUrl ? `<img src="${screenshotUrl}" alt="${game.name}" style="width:100%;height:100%;object-fit:cover;">` : coverUrl ? `<img src="${coverUrl}" alt="${game.name}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-image" style="font-size:2rem;color:#666;"></i>'}
            </div>
            <div class="game-price">
              <div class="price-table-container">
                <table class="price-table"><thead><tr><th>Loja</th><th>Preço</th><th>Desconto</th><th>Link</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;padding:1rem;">carregando preços...</td></tr></tbody></table>
              </div>
            </div>
          </div>
          <div class="game-right-column">
            <div class="game-cover">
              ${coverUrl ? `<img src="${coverUrl}" alt="${game.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div style="display:none; text-align:center; padding:2rem; color:#666;"><i class="fas fa-image" style="font-size:3rem;"></i><p>Capa não disponível</p></div>` : `<div style="text-align:center; padding:2rem; color:#666;"><i class="fas fa-image" style="font-size:3rem;"></i><p>Capa não disponível</p></div>`}
            </div>
            <div class="game-info"><div class="game-description">${game.summary || 'Descrição não disponível.'}</div></div>
          </div>
        </div>`;
      fetch(`${backendURL}/price?name=${encodeURIComponent(game.name)}`).then(r => r.json()).then(prices => {
        const tbody = container.querySelector('.price-table tbody'); if (!tbody) return; tbody.innerHTML = '';
        if (prices.unavailable) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1rem;">${prices.message || 'Preços não disponíveis'}</td></tr>`; return; }
        const entries = Object.entries(prices); if (entries.length === 0) { if (game.prices && game.prices.length > 0) { game.prices.forEach(p => { tbody.innerHTML += `<tr><td>${p.store}</td><td>${p.price}</td><td>-</td><td>-</td></tr>`; }); } else { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1rem;">Preços não disponíveis</td></tr>`; } return; }
        entries.forEach(([store, price]) => { tbody.innerHTML += `<tr><td>${store.charAt(0).toUpperCase() + store.slice(1)}</td><td>${price}</td><td>-</td><td>-</td></tr>`; });
      }).catch(err => console.error('Erro ao carregar preços:', err));
    }).catch(err => { console.error('Erro ao carregar detalhes do jogo:', err); document.getElementById('gameDetailsContainer').innerHTML = '<p>Erro ao carregar detalhes do jogo. Tente novamente mais tarde.</p>'; });
  } else if (isResultsPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    // prefer the results page grid, fallback to gamesContainer (if present)
    const resultsContainer = document.getElementById('search-results-grid') || elements.gamesContainer || document.getElementById('gamesContainer');
    const queryDisplay = document.getElementById('search-query-display');
    if (queryDisplay) queryDisplay.textContent = query || '';
    // If header search input exists, populate it with the query (so user can refine)
    const headerSearchInput = document.getElementById('search-input');
    if (headerSearchInput && query) headerSearchInput.value = query;
    if (query && resultsContainer) {
      buscarJogos(query, resultsContainer);
    }
  } else {
    const searchForm = document.getElementById('search-form'); if (searchForm) { searchForm.addEventListener('submit', function(e) { e.preventDefault(); const q = document.getElementById('search-input').value; if (q) window.location.href = `results.html?query=${encodeURIComponent(q)}`; }); }
    principaisLancamentos(); jogosPopulares();
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);