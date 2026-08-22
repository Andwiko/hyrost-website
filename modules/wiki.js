// Dynamic Wiki — loads articles from API
const API_URL = '/api';
let WIKI_ARTICLES = {};

function slugify(text) {
  return String(text || 'article')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'article';
}

function mapArticle(row) {
  const id = row.slug || slugify(row.title) + '-' + row.id;
  const updated = row.created_at
    ? new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  return {
    id,
    dbId: row.id,
    title: row.title,
    category: (row.category || 'guide').toLowerCase(),
    author: 'Hyrost Staff',
    updated,
    readTime: '3 mnt baca',
    icon: row.icon || 'fa-book',
    badge: row.category || 'Guide',
    summary: (row.content || '').replace(/<[^>]+>/g, '').slice(0, 120) + '...',
    content: row.content || '<p>Konten artikel belum tersedia.</p>',
  };
}

async function loadWikiArticles() {
  try {
    const res = await fetch(`${API_URL}/wiki/articles`);
    if (!res.ok) return;
    const data = await res.json();
    const rows = data.articles || data;
    if (!Array.isArray(rows)) return;
    WIKI_ARTICLES = {};
    rows.forEach((row) => {
      const article = mapArticle(row);
      WIKI_ARTICLES[article.id] = article;
      WIKI_ARTICLES[String(row.id)] = article;
    });
  } catch (e) {
    console.warn('Wiki API unavailable:', e.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadWikiArticles();

  const searchInput = document.getElementById('wikiSearchInput');
  const resultsGrid = document.getElementById('resultsGrid');
  const searchResultsContainer = document.getElementById('searchResults');
  const categoriesSection = document.getElementById('wikiCategories');
  const popularSection = document.getElementById('wikiPopular');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (query.length > 0) {
        if (categoriesSection) categoriesSection.style.display = 'none';
        if (popularSection) popularSection.style.display = 'none';
        if (searchResultsContainer) searchResultsContainer.style.display = 'block';

        const results = Object.values(WIKI_ARTICLES).filter(
          (article, idx, arr) =>
            arr.findIndex((a) => a.id === article.id) === idx &&
            (article.title.toLowerCase().includes(query) || article.summary.toLowerCase().includes(query))
        );

        renderResults(results);
      } else {
        if (categoriesSection) categoriesSection.style.display = 'block';
        if (popularSection) popularSection.style.display = 'block';
        if (searchResultsContainer) searchResultsContainer.style.display = 'none';
      }
    });
  }

  function renderResults(results) {
    if (!resultsGrid) return;
    resultsGrid.innerHTML = '';

    if (results.length === 0) {
      resultsGrid.innerHTML =
        '<p style="color:#9ca3af; grid-column: 1/-1; text-align:center; padding:30px;">Tidak ada artikel wiki yang sesuai dengan pencarian Anda.</p>';
      return;
    }

    results.forEach((article) => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
                <div class="cat-icon"><i class="fas ${article.icon || 'fa-file-alt'}"></i></div>
                <h4>${article.title}</h4>
                <p style="color:#9ca3af; font-size:0.85rem; margin-bottom:12px;">${article.summary}</p>
                <button onclick="location.href='wiki-article.html?id=${article.id}'" class="btn-action-outline" style="padding:6px 14px; font-size:0.8rem; border-color:#6366f1; color:#6366f1;">
                    <i class="fas fa-book-open"></i> Baca Artikel
                </button>
            `;
      resultsGrid.appendChild(card);
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  const articleTitleEl = document.querySelector('.article-content h1');

  if (articleTitleEl && articleId) {
    const article = WIKI_ARTICLES[articleId];
    if (!article) {
      articleTitleEl.textContent = 'Artikel tidak ditemukan';
      return;
    }

    document.title = `${article.title} - Hyrost Wiki`;
    articleTitleEl.textContent = article.title;

    const metaEl = document.querySelector('.article-meta');
    if (metaEl) {
      metaEl.innerHTML = `
                <span><i class="far fa-clock"></i> Diperbarui: ${article.updated}</span> | 
                <span><i class="far fa-user"></i> Oleh: ${article.author}</span> | 
                <span><i class="fas fa-stopwatch"></i> ${article.readTime}</span>
            `;
    }

    const contentBox = document.querySelector('.article-content');
    if (contentBox) {
      contentBox.innerHTML = `
                <h1>${article.title}</h1>
                <div class="article-meta" style="color:#9ca3af; font-size:0.85rem; margin-bottom:20px;">
                    <span><i class="far fa-clock"></i> Diperbarui: ${article.updated}</span> • 
                    <span><i class="far fa-user"></i> ${article.author}</span> • 
                    <span><i class="fas fa-hourglass-half"></i> ${article.readTime}</span>
                </div>
                ${article.content}
                
                <div style="margin-top:40px; padding:20px; background:rgba(18,24,38,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:16px; text-align:center;">
                    <h4 style="color:#fff; margin:0 0 10px;">Apakah artikel wiki ini membantu Anda?</h4>
                    <button onclick="voteArticleHelpful(true)" class="btn-action-outline" style="padding:6px 16px; color:#10b981; border-color:#10b981; margin-right:8px;"><i class="fas fa-thumbs-up"></i> Ya, Membantu</button>
                    <button onclick="voteArticleHelpful(false)" class="btn-action-outline" style="padding:6px 16px; color:#ef4444; border-color:#ef4444;"><i class="fas fa-thumbs-down"></i> Kurang Jelas</button>
                </div>
            `;
    }
  }
});

function copyCommandSnippet(cmd) {
  navigator.clipboard.writeText(cmd).then(() => {
    if (typeof showToast === 'function') showToast(`Perintah '${cmd}' disalin ke clipboard!`, 'success');
    else alert(`Perintah '${cmd}' berhasil disalin!`);
  });
}

function voteArticleHelpful(isHelpful) {
  alert(
    isHelpful
      ? 'Terima kasih atas umpan balik Anda! 👍'
      : 'Terima kasih atas masukan Anda. Tim Hyrost akan memperbarui panduan ini.'
  );
}

window.copyCommandSnippet = copyCommandSnippet;
window.voteArticleHelpful = voteArticleHelpful;
