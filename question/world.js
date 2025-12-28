
// Base API URL
const API_URL = '/api';

// DOM Elements
const currencyCard = document.querySelector('#card-currency');
const throneCard = document.querySelector('#card-throne');
const mysteryCard = document.querySelector('#card-mystery');

const throneModal = document.getElementById('throneModal');
const mysteryModal = document.getElementById('mysteryModal');

const closeThroneBtn = document.getElementById('closeThrone');
const closeMysteryBtn = document.getElementById('closeMystery');

const leaderboardList = document.getElementById('leaderboardList');
const btnOpenBox = document.getElementById('btnOpenBox');
const mysteryResult = document.getElementById('mysteryResult');

// Token
const token = localStorage.getItem('hyrostToken');

// Headers
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        console.warn("No token found, redirecting...");
        window.location.href = '../index.html'; 
        return;
    }

    // Attach Event Listeners
    if (throneCard) throneCard.addEventListener('click', openThroneModal);
    if (mysteryCard) mysteryCard.addEventListener('click', openMysteryModal);
    
    if (closeThroneBtn) closeThroneBtn.addEventListener('click', () => throneModal.style.display = 'none');
    if (closeMysteryBtn) closeMysteryBtn.addEventListener('click', () => mysteryModal.style.display = 'none');
    
    if (btnOpenBox) btnOpenBox.addEventListener('click', openBox);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === throneModal) throneModal.style.display = 'none';
        if (e.target === mysteryModal) mysteryModal.style.display = 'none';
    });

    // Initial Load
    fetchUserData(); 
});

// --- FUNCTIONS ---

// 1. Fetch User Data (For Currency)
async function fetchUserData() {
    try {
        const res = await fetch(`${API_URL}/users/me`, { headers });
        const data = await res.json();
        
        if (res.ok) {
            updateCurrencyUI(data.coins);
        }
    } catch (err) {
        console.error("Failed to load user data:", err);
    }
}

// 2. Update Currency Card UI
function updateCurrencyUI(coins) {
    if (!currencyCard) return;

    currencyCard.innerHTML = `
        <div class="currency-status">
            <div class="c-item"><i class="fas fa-circle" style="color: #cd7f32;"></i> ${coins.bronze || 0}</div>
            <div class="c-item"><i class="fas fa-circle" style="color: #c0c0c0;"></i> ${coins.silver || 0}</div>
            <div class="c-item"><i class="fas fa-circle" style="color: #ffd700;"></i> ${coins.gold || 0}</div>
        </div>
        <p style="margin-top:10px; font-size:0.8rem; color:#888;">Klik untuk Exchange</p>
    `;
}

// 3. Leaderboard (Tahta)
async function openThroneModal() {
    throneModal.style.display = 'block';
    leaderboardList.innerHTML = '<div class="loading-spinner">Mencari Penguasa...</div>';

    try {
        const res = await fetch(`${API_URL}/world/leaderboard`);
        const leaders = await res.json();

        if (!res.ok) throw new Error("Gagal memuat tahta");

        renderLeaderboard(leaders);
    } catch (err) {
        leaderboardList.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function renderLeaderboard(leaders) {
    leaderboardList.innerHTML = '';
    
    leaders.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'quest-item'; // Reusing quest-item style for consistency
        item.style.borderLeft = index < 3 ? '4px solid #ffd700' : '4px solid #444';
        
        const rankLabel = index === 0 ? '👑' : `#${index + 1}`;
        const avatar = player.avatar_url || 'https://cravatar.eu/avatar/Steve/64.png';

        item.innerHTML = `
            <div class="q-rank" style="font-size: 1.2rem; width: 40px;">${rankLabel}</div>
            <div class="user-info-display" style="flex: 1; display:flex; align-items:center; gap:15px; background:transparent;">
                <img src="${avatar}" style="width:40px; height:40px; border-radius:4px;">
                <div class="user-details">
                    <span class="user-name" style="font-weight:bold; color:white;">${player.username}</span>
                    <span class="user-role" style="font-size:0.75rem;">${player.role}</span>
                </div>
            </div>
            <div class="q-rewards" style="text-align:right;">
                <div style="color: #ffd700;"><i class="fas fa-coins"></i> ${player.total_score.toLocaleString()}</div>
            </div>
        `;
        leaderboardList.appendChild(item);
    });
}

// 4. Mystery Box (Gacha)
function openMysteryModal() {
    mysteryModal.style.display = 'block';
    mysteryResult.innerHTML = '';
    btnOpenBox.disabled = false;
    btnOpenBox.innerHTML = 'BUKA SEKARANG';
}

async function openBox() {
    btnOpenBox.disabled = true;
    btnOpenBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuka...';
    mysteryResult.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/world/mystery-box/open`, {
            method: 'POST',
            headers
        });
        const data = await res.json();

        if (res.ok) {
            // Success animation/display
            const r = data.reward;
            const color = r.type === 'gold' ? '#ffd700' : (r.type === 'silver' ? '#c0c0c0' : '#cd7f32');
            
            mysteryResult.innerHTML = `
                <div style="font-size: 1.2rem; animation: zoomIn 0.5s;">
                    Selamat! Kamu mendapatkan:<br>
                    <span style="font-weight:bold; color:${color}; font-size:1.5rem;">
                        ${r.amount} ${r.type.toUpperCase()}
                    </span>
                </div>
            `;
            
            // Refresh coins
            fetchUserData();
        } else {
            alert(data.message || "Gagal membuka kotak");
            btnOpenBox.disabled = false;
            btnOpenBox.innerHTML = 'BUKA SEKARANG';
        }
    } catch (err) {
        alert("Kesalahan koneksi");
        btnOpenBox.disabled = false;
        btnOpenBox.innerHTML = 'BUKA SEKARANG';
    }
}
