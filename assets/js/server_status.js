document.addEventListener('DOMContentLoaded', () => {
    const playerCountElement = document.getElementById('onlinePlayers');
    const statusIndicator = document.querySelector('.status-dot');
    
    // Simulate initial fetch
    updatePlayerCount();

    // Update every 5 seconds
    setInterval(updatePlayerCount, 5000);

    function updatePlayerCount() {
        if (!playerCountElement) return;

        // Simulate fluctuation around 1,200 players
        const base = 1200;
        const variance = Math.floor(Math.random() * 50) - 25; // +/- 25
        const count = base + variance;
        
        playerCountElement.textContent = count.toLocaleString();
        
        // Ensure status is online
        if (statusIndicator) {
            statusIndicator.classList.add('online');
        }
    }
});
