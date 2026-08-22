/* Consolidated Marketplace Logic */

document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabs = document.querySelectorAll('.market-tab');
    const contents = document.querySelectorAll('.market-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.style.display = 'none');

            // Add active class
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            document.getElementById(targetId).style.display = 'block';
            
            // Trigger specific loaders if needed
            if(targetId === 'tab-role' && typeof loadShopRoles === 'function') loadShopRoles();
            if(targetId === 'tab-badge' && typeof loadBadges === 'function') loadBadges();
        });
    });

    // Initial Load
    // Check URL hash for direct linking (e.g. #auction)
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const targetTab = document.querySelector(`.market-tab[data-target="tab-${hash}"]`);
        if (targetTab) targetTab.click();
    } else {
        // Default to Items
        document.querySelector('.market-tab[data-target="tab-items"]').click();
    }
});

// Mock Data Loaders (Replace with actual API calls later)
async function loadRoles() {
    const grid = document.getElementById('roleShopGrid');
    if (!grid || grid.innerHTML.length > 200) return; // Prevent reload if populated
    
    // ... Logic from role_shop.js adapted ...
    // For now we assume role_shop.js functions are globally available or we migrate them here.
    // Ideally, we move the fetch logic here.
}

async function loadBadges() {
     const grid = document.getElementById('badgeShopGrid');
     if (!grid) return;
     
     // Allow market.js to populate this via initShop(). 
     // Do not overwrite with 'Coming Soon' text if data might be present.
     if(grid.children.length === 0) {
        // Optional: show loader or empty state only if genuinely empty
        // grid.innerHTML = '<div class="loader"></div>';
     }
}
