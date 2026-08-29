/**
 * Hyrost Live Realm Map & Warp Navigation Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchServerTelemetry();
    setInterval(fetchServerTelemetry, 15000);
});

function switchDimension(dim, btn) {
    document.querySelectorAll('.map-control-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const title = document.getElementById('dimensionTitle');
    const area = document.getElementById('mapInteractiveArea');

    if (window.HyrostSFX) window.HyrostSFX.playClick();

    if (dim === 'nether') {
        title.textContent = 'Dunia Nether Hub (Dunia Bawah)';
        area.style.background = 'radial-gradient(circle at center, #450a0a 0%, #030712 100%)';
    } else if (dim === 'end') {
        title.textContent = 'Dunia The End (Dimensi Naga)';
        area.style.background = 'radial-gradient(circle at center, #2e1065 0%, #030712 100%)';
    } else {
        title.textContent = 'Dunia Overworld Realm (Dunia Utama)';
        area.style.background = 'radial-gradient(circle at center, #111827 0%, #030712 100%)';
    }
}

function copyCoordinates(text) {
    navigator.clipboard.writeText(text).then(() => {
        if (window.HyrostSFX) window.HyrostSFX.playOrb();
        alert(`📋 Perintah "${text}" berhasil disalin ke clipboard! Silakan paste di game Minecraft.`);
    }).catch(() => {
        prompt('Salin perintah di bawah ini:', text);
    });
}

function toggleMapFullscreen() {
    const wrapper = document.getElementById('mapWrapper');
    if (!wrapper) return;

    if (!document.fullscreenElement) {
        if (wrapper.requestFullscreen) {
            wrapper.requestFullscreen();
        } else if (wrapper.webkitRequestFullscreen) {
            wrapper.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

async function fetchServerTelemetry() {
    try {
        const res = await fetch('/api/server-status');
        const data = await res.json();
        if (data && data.online) {
            const countEl = document.getElementById('mapOnlineCount');
            if (countEl) countEl.textContent = data.players?.online || 128;
        }
    } catch (e) {}
}
