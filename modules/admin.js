const API_URL = "/api";
const token = localStorage.getItem("hyrostToken");
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  console.log("Admin Panel Initializing...");
  await loadRoles();
  // Default tab is already set in HTML, but we can init checks if needed

  // Initial load for the default tab (e.g., roles)
  // The other loads will happen when switchTab is called for their respective tabs.
  // loadUsers(); // Moved to switchTab
  // loadBannedWords(); // Moved to switchTab
  // loadForumMods(); // Moved to switchTab
  // loadSettings(); // Moved to switchTab
  // loadActivityLogs(); // Moved to switchTab

  // The editForm listener is for the old role editor, which is being replaced.
  // const editForm = document.getElementById("roleEditForm");
  // if (editForm) {
  //   editForm.addEventListener("submit", handleUpdateRoleCustomization);
  // }
});

// --- TAB SWITCHING ---
window.switchTab = (tabName) => {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelector(`#tab-${tabName}`).style.display = 'block';

    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');

    // Load data if needed based on tab
    if (tabName === 'users') loadUsers();
    if (tabName === 'settings') { loadBannedWords(); loadSettings(); }
    if (tabName === 'mods') loadForumMods();
    if (tabName === 'logs') loadActivityLogs();
    if (tabName === 'cosmetics') loadCosmetics();
};

let availableRoles = [];

async function loadRoles() {
    const grid = document.getElementById('roleListGrid');
    if (!grid) return;

  grid.innerHTML =
    '<div style="text-align:center; padding:20px; color:#aaa;"><i class="fas fa-spinner fa-spin"></i> Memuat data role...</div>';

  try {
    const res = await fetch(`${API_URL}/admin/roles`, { headers });
    if (res.status === 403) return handleAccessDenied();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        availableRoles = Array.isArray(data) ? data : [];

        grid.innerHTML = '';
        availableRoles.forEach(role => {
            const card = document.createElement('div');
            card.className = 'role-badge-card';
            // Apply font style class
            const fontClass = role.badge_style || 'normal';

            card.innerHTML = `
                <div class="role-preview ` + fontClass + `" style="background:${role.badge_color || '#333'}; color:white;">
                    ${role.badge_text || role.name}
                </div>
                <h3 style="margin:10px 0; color:#fff;">${role.name}</h3>
                <div style="font-size:0.8rem; color:#888; margin-bottom:15px; height:40px; overflow:hidden;">
                    ${role.description || 'Tidak ada deskripsi'}
                </div>
                <button class="btn-action" onclick="openRoleModal('${role.name}')">Konfigurasi</button>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error("Failed to load roles:", err);
    grid.innerHTML = `
            <div style="text-align:center; padding:20px; color:#ff4d4d; background:rgba(255,77,77,0.1); border-radius:10px;">
                <i class="fas fa-exclamation-triangle"></i> Gagal memuat role.
                <br><small>${err.message}</small>
                <div style="margin-top:10px;">
                    <button class="btn-action" onclick="loadRoles()">Coba Lagi</button>
                </div>
            </div>`;
  }
}

// [Deleted legacy renderRoleCards, openRoleEditor, handleUpdateRoleCustomization, confirmDeleteRole]

// [Deleted duplicate showCreateRoleModal]
// --- ROLE MODAL LOGIC ---

window.showCreateRoleModal = () => {
    // Reset inputs
    document.getElementById('roleNameInput').value = '';
    document.getElementById('roleNameInput').readOnly = false; 
    document.getElementById('roleNameInput').style.cursor = 'text';
    document.getElementById('roleNameInput').placeholder = "Masukkan nama role baru...";
    
    document.getElementById('badgeTextInput').value = '';
    document.getElementById('badgeColorInput').value = '#888888';
    document.getElementById('badgeStyleInput').value = 'normal'; // Reset font
    document.getElementById('roleCoinPrice').value = '';
    document.getElementById('roleIdrPrice').value = '';
    document.getElementById('roleDescInput').value = '';

    document.getElementById('createRoleModal').classList.add('active');
    // Change save behavior to CREATE
    window.currentRoleAction = 'create';
};

window.openRoleModal = (roleName) => {
    const role = availableRoles.find(r => r.name === roleName);
    if (!role) return;

    document.getElementById('roleNameInput').value = role.name;
    document.getElementById('roleNameInput').readOnly = true;
    
    document.getElementById('badgeTextInput').value = role.badge_text || '';
    document.getElementById('badgeColorInput').value = role.badge_color || '#888888';
    document.getElementById('badgeStyleInput').value = role.badge_style || 'normal'; // Load font
    document.getElementById('roleCoinPrice').value = role.price_coin || 0;
    document.getElementById('roleIdrPrice').value = role.price_idr || 0;
    document.getElementById('roleDescInput').value = role.description || '';

    document.getElementById('createRoleModal').classList.add('active');
    window.currentRoleAction = 'update';
    window.currentRoleId = role.id;
};

window.closeCreateModal = () => document.getElementById('createRoleModal').classList.remove('active');

window.saveRoleChanges = async () => {
    const name = document.getElementById('roleNameInput').value;
    const badgeText = document.getElementById('badgeTextInput').value;
    const badgeColor = document.getElementById('badgeColorInput').value;
    const badgeStyle = document.getElementById('badgeStyleInput').value; // Get font
    const coinPrice = document.getElementById('roleCoinPrice').value;
    const idrPrice = document.getElementById('roleIdrPrice').value;
    const desc = document.getElementById('roleDescInput').value;

    if (!name) return alert("Nama role wajib diisi!");

    try {
        let url, body;
        if (window.currentRoleAction === 'create') {
             url = `${API_URL}/admin/role`;
             body = JSON.stringify({ name });
             // Create first, then we might need to update customization if backend doesn't support all in one go yet.
             // But let's try to assume we just create basic then update.
             // Actually, simplest is: Create -> Then Update inmediatly if implementation allows.
             // Backend createRole only takes name. So we create, reload, find id, then update.
             const res = await fetch(url, { method: 'POST', headers, body });
             if (!res.ok) throw new Error((await res.json()).message);
             
             // Refresh to get ID
             await loadRoles();
             const newRole = availableRoles.find(r => r.name === name);
             if (newRole) {
                 window.currentRoleId = newRole.id;
                 // Proceed to update customization
             } else {
                 closeCreateModal();
                 return;
             }
        }

        // Customization Update
        if (window.currentRoleId) {
             const updateRes = await fetch(`${API_URL}/admin/role/${window.currentRoleId}`, {
                 method: 'PUT',
                 headers,
                 body: JSON.stringify({ badgeText, badgeColor, badgeStyle, coinPrice, idrPrice, description: desc })
             });
             if (!updateRes.ok) throw new Error("Gagal menyimpan kustomisasi");
        }

        alert("Berhasil disimpan!");
        closeCreateModal();
        loadRoles();
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.deleteRole = async () => {
    if (window.currentRoleAction === 'create') return closeCreateModal(); // Just close if it was new
    if (!confirm("Hapus role ini permanen?")) return;

    try {
        const res = await fetch(`${API_URL}/admin/role/${window.currentRoleId}`, { method: 'DELETE', headers });
        if (res.ok) {
            closeCreateModal();
            loadRoles();
        } else {
            alert("Gagal menghapus.");
        }
    } catch (err) { alert("Error delete."); }
};

async function loadUsers() {
  const roleUserList = document.getElementById("roleUserList");
  const coinUserList = document.getElementById("coinUserList");
  if (!roleUserList || !coinUserList) return;

  try {
    roleUserList.innerHTML = '<p style="color:#888;">Memuat...</p>';
    coinUserList.innerHTML = '<p style="color:#888;">Memuat...</p>';

    const res = await fetch(`${API_URL}/admin/users`, { headers });
    const users = await res.json();

    roleUserList.innerHTML = "";
    users.forEach((user) => {
      const div = document.createElement("div");
      div.className = "user-row";
      let roleOptions = availableRoles
        .map(
          (r) =>
            `<option value="${r.name}" ${
              user.role === r.name ? "selected" : ""
            }>${r.name}</option>`
        )
        .join("");

      div.innerHTML = `
                <div style="flex:1">
                    <strong>${user.username}</strong><br>
                    <small style="color:#aaa;">${user.email}</small>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <select id="roleSel-${user.id}" style="padding:5px;">
                        ${roleOptions}
                    </select>
                    <button class="btn-action" onclick="updateRole(${user.id})">Update</button>
                    <button class="btn-delete" title="Delete User" style="padding:5px 10px;" onclick="deleteUserByAdmin(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
      roleUserList.appendChild(div);
    });

    coinUserList.innerHTML = "";
    users.forEach((user) => {
      const div = document.createElement("div");
      div.className = "user-row";
      div.innerHTML = `
                <div style="flex:1">
                    <strong>${user.username}</strong><br>
                    <small style="color:#e98a22">B: ${user.coin_bronze} | S: ${user.coin_silver} | G: ${user.coin_gold}</small>
                </div>
                <div class="coin-controls">
                    <select id="coinType-${user.id}">
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                    </select>
                    <input type="number" class="coin-input" id="coinAmt-${user.id}" placeholder="+/-">
                    <button class="btn-action" onclick="updateCoins(${user.id})">Set</button>
                </div>
            `;
      coinUserList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

window.deleteUserByAdmin = async (id) => {
  if (!confirm("Hapus user ini secara permanen dari Hyrost?")) return;
  try {
    const res = await fetch(`${API_URL}/admin/user/${id}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) loadUsers();
  } catch (err) {
    alert("Gagal menghapus thread.");
  }
};

// Global Settings
async function loadSettings() {
  try {
    const res = await fetch(`${API_URL}/admin/settings`, { headers });
    const settings = await res.json();

    if (settings.announcement) {
      document.getElementById("globalAnnouncement").value =
        settings.announcement;
    }
    if (settings.maintenance) {
      document.getElementById("maintenanceToggle").checked =
        settings.maintenance === "true";
    }
  } catch (err) {}
}

window.saveAnnouncement = async () => {
  const val = document.getElementById("globalAnnouncement").value;
  try {
    await fetch(`${API_URL}/admin/setting`, {
      method: "POST",
      headers,
      body: JSON.stringify({ key: "announcement", value: val }),
    });
    alert("Banner pengumuman diperbarui.");
  } catch (err) {
    alert("Gagal menyimpan.");
  }
};

window.toggleMaintenance = async () => {
  const isChecked = document.getElementById("maintenanceToggle").checked;
  const val = isChecked ? "true" : "false";
  try {
    await fetch(`${API_URL}/admin/setting`, {
      method: "POST",
      headers,
      body: JSON.stringify({ key: "maintenance", value: val }),
    });
  } catch (err) {
    alert("Gagal mengubah mode maintenance.");
  }
};

async function loadActivityLogs() {
    const tbody = document.getElementById('activityLogBody');
    if (!tbody) return;
    try {
        const res = await fetch(`${API_URL}/admin/logs`, { headers });
        const logs = await res.json();
        
        tbody.innerHTML = '';
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">Belum ada aktivitas.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>
                    <div style="font-weight:bold; color:white;">${log.username}</div>
                    <small style="color:#aaa;">${log.email}</small>
                </td>
                <td><span style="background:rgba(233, 138, 34, 0.2); color:#e98a22; padding:3px 8px; border-radius:4px; font-size:0.8rem;">${log.action}</span></td>
                <td style="color:#ccc;">${log.details}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {}
}

// --- COSMETICS LOGIC ---
async function loadCosmetics() {
    const grid = document.getElementById('cosmeticListGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;"><i class="fas fa-spinner fa-spin"></i> Memuat item...</div>';

    try {
        const res = await fetch(`${API_URL}/admin/cosmetics`, { headers });
        const items = await res.json();
        
        grid.innerHTML = '';
        if (items.length === 0) {
            grid.innerHTML = '<div style="color:#666; width:100%; padding:20px; text-align:center;">Belum ada item kosmetik.</div>';
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'role-badge-card'; // Reuse style
            
            // Preview Visualization
            let previewHTML = '';
            let style = item.css_style || '';
            let animClass = item.animation_data || ''; // Storing anim class here for simplicity or JSON
            
            if (item.type === 'nametag') {
                previewHTML = `<span style="${style}" class="${animClass}">Username</span>`;
            } else if (item.type === 'badge') {
                previewHTML = `<span style="background:#333; padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:5px;">
                    Username <i class="fas fa-check-circle" style="${style}"></i>
                </span>`;
            } else if (item.type === 'nameplate') {
                previewHTML = `<div style="border:1px solid #444; padding:5px 10px; border-radius:5px; ${style} ${animClass}">Username</div>`;
            }

            card.innerHTML = `
                <div style="height:60px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; background:#111; border-radius:8px;">
                    ${previewHTML}
                </div>
                <h3>${item.name}</h3>
                <div style="color:#888; font-size:0.8rem; margin-bottom:10px;">
                    ${item.type.toUpperCase()}
                </div>
                <div style="color:#e98a22; font-weight:bold; margin-bottom:15px;">
                    ${item.price_coin} Coins / IDR ${item.price_idr}
                </div>
                <button class="btn-delete" style="width:100%; padding:8px;" onclick="deleteCosmetic(${item.id})">Hapus</button>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = 'Error loading items.';
    }
}

window.showCreateCosmeticModal = () => {
    document.getElementById('createCosmeticModal').classList.add('active');
    updateCosmeticPreview();
};

window.closeCosmeticModal = () => {
    document.getElementById('createCosmeticModal').classList.remove('active');
};

window.updateCosmeticPreview = () => {
    const type = document.getElementById('cosTypeInput').value;
    const style = document.getElementById('cosCssInput').value;
    const anim = document.getElementById('cosAnimInput').value;
    const target = document.getElementById('previewCosmeticTarget');
    const container = target.parentElement;

    // Reset base
    target.style.cssText = "font-size:1.2rem; font-weight:bold; color:white;";
    target.className = "";
    container.style.background = "#222";
    target.innerHTML = "Username";

    // Apply Logic
    if (type === 'nametag') {
        target.style.cssText += style;
        if (anim) target.classList.add(anim);
    } 
    else if (type === 'badge') {
        target.innerHTML = `Username <i class="fas fa-star" style="${style}"></i>`;
        if (anim) target.querySelector('i').classList.add(anim);
    }
    else if (type === 'nameplate') {
        container.style.cssText += style; // Apply background to container for nameplate
        if (anim) container.classList.add(anim);
    }
};

window.saveCosmetic = async () => {
    const body = {
        name: document.getElementById('cosNameInput').value,
        type: document.getElementById('cosTypeInput').value,
        priceCoin: document.getElementById('cosPriceCoin').value,
        priceIdr: document.getElementById('cosPriceIdr').value,
        cssStyle: document.getElementById('cosCssInput').value,
        animationData: document.getElementById('cosAnimInput').value
    };

    if (!body.name) return alert("Nama item wajib diisi");

    try {
        const res = await fetch(`${API_URL}/admin/cosmetic`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        if (res.ok) {
            alert("Item kosmetik berhasil dibuat!");
            closeCosmeticModal();
            loadCosmetics();
        } else {
            alert("Gagal membuat item");
        }
    } catch (err) {
        alert("Error server");
    }
};

window.deleteCosmetic = async (id) => {
    if(!confirm("Hapus item ini permanen?")) return;
    try {
        await fetch(`${API_URL}/admin/cosmetic/${id}`, { method: 'DELETE', headers });
        loadCosmetics();
    } catch(err) { alert("Error"); }
};

window.updateRole = async (userId) => {
  const roleName = document.getElementById(`roleSel-${userId}`).value;
  try {
    const res = await fetch(`${API_URL}/admin/assign-role`, {
      method: "POST",
      headers,
      body: JSON.stringify({ targetUserId: userId, roleName }),
    });
    const data = await res.json();
    alert(data.message);
    loadUsers();
  } catch (err) {
    alert("Error");
  }
};

window.updateCoins = async (userId) => {
  const type = document.getElementById(`coinType-${userId}`).value;
  const amount = document.getElementById(`coinAmt-${userId}`).value;
  if (amount === "") return;
  try {
    const res = await fetch(`${API_URL}/admin/update-coins`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetUserId: userId,
        type,
        amount: parseInt(amount),
      }),
    });
    if (res.ok) {
      document.getElementById(`coinAmt-${userId}`).value = "";
      loadUsers();
    }
  } catch (err) {
    alert("Error");
  }
};

// [Deleted legacy createRole]

async function loadBannedWords() {
  const list = document.getElementById("bannedWordsList");
  if (!list) return;
  try {
    const res = await fetch(`${API_URL}/admin/banned-words`, { headers });
    const words = await res.json();
    list.innerHTML = "";
    words.forEach((bw) => {
      const chip = document.createElement("div");
      chip.style.cssText =
        "background:rgba(255,77,77,0.1); border:1px solid #ff4d4d; color:#ff4d4d; padding:6px 12px; border-radius:30px; display:flex; align-items:center; gap:8px; font-size:0.85rem;";
      chip.innerHTML = `
                <span>${bw.word}</span>
                <i class="fas fa-times" style="cursor:pointer;" onclick="deleteBannedWord(${bw.id})"></i>
            `;
      list.appendChild(chip);
    });
  } catch (err) {}
}

window.addBannedWord = async () => {
  const input = document.getElementById("newBannedWord");
  const word = input.value.trim();
  if (!word) return;
  try {
    const res = await fetch(`${API_URL}/admin/banned-word`, {
      method: "POST",
      headers,
      body: JSON.stringify({ word }),
    });
    if (res.ok) {
      input.value = "";
      loadBannedWords();
    }
  } catch (err) {}
};

window.deleteBannedWord = async (id) => {
  try {
    const res = await fetch(`${API_URL}/admin/banned-word/${id}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) loadBannedWords();
  } catch (err) {}
};

async function loadForumMods() {
    const list = document.getElementById('forumModList');
    if(!list) return;
    list.innerHTML = '<div style="padding:20px; color:#aaa;">Memuat data forum...</div>';
    
    try {
        const res = await fetch(`${API_URL}/admin/forum/threads`, { headers });
        const threads = await res.json();
        
        list.innerHTML = '';
        if(threads.length === 0) list.innerHTML = '<div style="padding:20px;">Tidak ada thread baru.</div>';
        
        threads.forEach(t => {
            const item = document.createElement('div');
            item.className = 'admin-card'; // Reuse card style
            item.style.marginBottom = '10px';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0; color:white;">${t.title} <span style="font-size:0.8rem; color:#888;">by ${t.username}</span></h4>
                        <p style="margin:5px 0; color:#aaa; font-size:0.9rem;">${t.content.substring(0, 100)}...</p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-action" style="padding:5px 10px; font-size:0.8rem;" onclick="pinThreadByAdmin(${t.id}, ${t.is_pinned})">
                            ${t.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button class="btn-delete" style="padding:5px 10px; font-size:0.8rem;" onclick="deleteThreadByAdmin(${t.id})">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
    } catch(e) {}
}

window.pinThreadByAdmin = async (id, currentStatus) => {
    try {
        await fetch(`${API_URL}/admin/forum/thread/${id}/pin`, { method:'POST', headers });
        loadForumMods();
    } catch(e) { alert("Error"); }
};

window.deleteThreadByAdmin = async (id) => {
    if(!confirm("Hapus thread ini?")) return;
    try {
        await fetch(`${API_URL}/admin/forum/thread/${id}`, { method:'DELETE', headers });
        loadForumMods();
    } catch(e) { alert("Error"); }
};

// --- COSMETICS LOGIC ---
async function loadCosmetics() {
    const grid = document.getElementById('cosmeticListGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;"><i class="fas fa-spinner fa-spin"></i> Memuat item...</div>';

    try {
        const res = await fetch(`${API_URL}/admin/cosmetics`, { headers });
        const items = await res.json();
        
        grid.innerHTML = '';
        if (items.length === 0) {
            grid.innerHTML = '<div style="color:#666; width:100%; padding:20px; text-align:center;">Belum ada item kosmetik.</div>';
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'role-badge-card'; // Reuse style
            
            // Preview Visualization
            let previewHTML = '';
            let style = item.css_style || '';
            let animClass = item.animation_data || '';
            
            if (item.type === 'nametag') {
                previewHTML = `<span style="${style}" class="${animClass}">Username</span>`;
            } else if (item.type === 'badge') {
                previewHTML = `<span style="background:#333; padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:5px;">
                    Username <i class="fas fa-check-circle" style="${style}"></i>
                </span>`;
            } else if (item.type === 'nameplate') {
                previewHTML = `<div style="border:1px solid #444; padding:5px 10px; border-radius:5px; ${style} ${animClass}">Username</div>`;
            }

            card.innerHTML = `
                <div style="height:60px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; background:#111; border-radius:8px;">
                    ${previewHTML}
                </div>
                <h3>${item.name}</h3>
                <div style="color:#888; font-size:0.8rem; margin-bottom:10px;">
                    ${item.type.toUpperCase()}
                </div>
                <div style="color:#e98a22; font-weight:bold; margin-bottom:15px;">
                    ${item.price_coin} Coins / IDR ${item.price_idr}
                </div>
                <button class="btn-delete" style="width:100%; padding:8px;" onclick="deleteCosmetic(${item.id})">Hapus</button>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = 'Error loading items.';
    }
}

window.showCreateCosmeticModal = () => {
    const modal = document.getElementById('createCosmeticModal');
    if(modal) {
        modal.classList.add('active');
        updateCosmeticPreview();
    }
};

window.closeCosmeticModal = () => {
    const modal = document.getElementById('createCosmeticModal');
    if(modal) modal.classList.remove('active');
};

window.updateCosmeticPreview = () => {
    const type = document.getElementById('cosTypeInput').value;
    const style = document.getElementById('cosCssInput').value;
    const anim = document.getElementById('cosAnimInput').value;
    const target = document.getElementById('previewCosmeticTarget');
    if(!target) return;
    const container = target.parentElement;

    // Reset base
    target.style.cssText = "font-size:1.2rem; font-weight:bold; color:white;";
    target.className = "";
    container.style.background = "#222";
    target.innerHTML = "Username";

    // Apply Logic
    if (type === 'nametag') {
        target.style.cssText += style;
        if (anim) target.classList.add(anim);
    } 
    else if (type === 'badge') {
        target.innerHTML = `Username <i class="fas fa-star" style="${style}"></i>`;
        if (anim) target.querySelector('i').classList.add(anim);
    }
    else if (type === 'nameplate') {
        container.style.cssText += style; // Apply background to container for nameplate
        if (anim) container.classList.add(anim);
    }
};

window.saveCosmetic = async () => {
    const body = {
        name: document.getElementById('cosNameInput').value,
        type: document.getElementById('cosTypeInput').value,
        priceBronze: document.getElementById('cosPriceBronze').value,
        priceSilver: document.getElementById('cosPriceSilver').value,
        priceGold: document.getElementById('cosPriceGold').value,
        priceIdr: document.getElementById('cosPriceIdr').value,
        cssStyle: document.getElementById('cosCssInput').value,
        animationData: document.getElementById('cosAnimInput').value
    };

    if (!body.name) return alert("Nama item wajib diisi");

    try {
        const res = await fetch(`${API_URL}/admin/cosmetic`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        if (res.ok) {
            alert("Item kosmetik berhasil dibuat!");
            closeCosmeticModal();
            loadCosmetics();
        } else {
            alert("Gagal membuat item");
        }
    } catch (err) {
        alert("Error server");
    }
};

window.deleteCosmetic = async (id) => {
    if(!confirm("Hapus item ini permanen?")) return;
    try {
        await fetch(`${API_URL}/admin/cosmetic/${id}`, { method: 'DELETE', headers });
        loadCosmetics();
    } catch(err) { alert("Error"); }
};



window.applyColorFromPicker = () => {
    const color = document.getElementById('cosColorPicker').value;
    document.getElementById('cosColorHex').value = color;
    
    // Add color and glow to CSS input
    const cssInput = document.getElementById('cosCssInput');
    cssInput.value = `color: ${color}; text-shadow: 0 0 5px ${color};`;
    updateCosmeticPreview();
};

window.applyHexColor = () => {
    const hex = document.getElementById('cosColorHex').value;
    if(/^#[0-9A-F]{6}$/i.test(hex)) {
        document.getElementById('cosColorPicker').value = hex;
        const cssInput = document.getElementById('cosCssInput');
        cssInput.value = `color: ${hex}; text-shadow: 0 0 5px ${hex};`;
        updateCosmeticPreview();
    }
};

function handleAccessDenied() {
  document.body.innerHTML = `<div style="color:white; text-align:center; padding:50px; font-family: 'Inter', sans-serif;">
        <i class="fas fa-lock fa-4x" style="color:#ff4d4d; margin-bottom:20px;"></i>
        <h1>Akses Ditolak</h1>
        <p>Anda tidak memiliki izin Admin.</p>
        <a href="../dashboard.html" style="color:#e98a22; border:1px solid #e98a22; padding:10px 20px; border-radius:5px; text-decoration:none; display:inline-block; margin-top:20px;">Kembali</a>
    </div>`;
}
