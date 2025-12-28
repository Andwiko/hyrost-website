document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('wikiSearchInput');
    const resultsGrid = document.getElementById('resultsGrid');
    const searchResultsContainer = document.getElementById('searchResults');
    const categoriesSection = document.getElementById('wikiCategories');
    const popularSection = document.getElementById('wikiPopular');

    const articles = [
        { id: 'farming', title: 'Tips Farming Cepat Kaya di Hyrost', category: 'starter' },
        { id: 'jobs', title: 'Penjelasan Job System', category: 'starter' },
        { id: 'report', title: 'Cara Melaporkan Bug atau Player', category: 'rules' },
        { id: 'auction', title: 'Panduan Menggunakan Auction House', category: 'items' },
        { id: 'ranks', title: 'Keuntungan VIP Rank', category: 'ranks' },
        { id: 'crafting', title: 'Resep Crafting Legendaris', category: 'items' },
        { id: 'war', title: 'Jadwal Clan War', category: 'events' },
        { id: 'rules', title: 'Hukum dan Aturan Server', category: 'rules' },
    ];

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            if (query.length > 0) {
                // Hide home sections
                categoriesSection.style.display = 'none';
                popularSection.style.display = 'none';
                searchResultsContainer.style.display = 'block';

                // Filter
                const results = articles.filter(article => 
                    article.title.toLowerCase().includes(query)
                );

                // Render Results
                renderResults(results);
            } else {
                // Show home sections
                categoriesSection.style.display = 'block';
                popularSection.style.display = 'block';
                searchResultsContainer.style.display = 'none';
            }
        });
    }

    function renderResults(results) {
        resultsGrid.innerHTML = '';
        
        if (results.length === 0) {
            resultsGrid.innerHTML = '<p style="color:#888; grid-column: 1/-1; text-align:center;">Tidak ada artikel ditemukan.</p>';
            return;
        }

        results.forEach(article => {
            const card = document.createElement('div');
            card.className = 'category-card'; // Reuse style
            card.innerHTML = `
                <div class="cat-icon"><i class="fas fa-file-alt"></i></div>
                <h4>${article.title}</h4>
                <p>Kategori: ${capitalize(article.category)}</p>
                <button onclick="location.href='wiki-article.html?id=${article.id}'" style="margin-top:10px; background:transparent; color:#e98a22; border:1px solid #e98a22; padding:5px 15px; border-radius:15px; cursor:pointer;">Baca</button>
            `;
            resultsGrid.appendChild(card);
        });
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
});
