/**
 * =============================================================================
 * MEI LABS — 3D MINECRAFT SKIN STUDIO & POSE RIGGING (skin.js)
 * High-Performance WebGL 60FPS Renderer, Scene Templates, Bone Articulation & Multi-Res Exporter
 * =============================================================================
 */

let viewer = null;
let orbitControl = null;
let isSpinning = false;
let currentIGN = 'Steve';
let currentBg = 'transparent';
let currentResolution = 1000;

// Background Images Registry (Aesthetic Minecraft Shaders & Wallpapers)
const BG_IMAGES = {
  transparent: null,
  taiga: '/bot/assets/images/bg_taiga.jpg',
  nether: '/bot/assets/images/bg_nether.jpg',
  end: '/bot/assets/images/bg_end.jpg',
  cherry: '/bot/assets/images/bg_cherry.jpg',
  snow: '/bot/assets/images/bg_snow.jpg',
  ocean: '/bot/assets/images/bg_ocean.jpg',
  sunset: '/bot/assets/images/bg_sunset.jpg',
  dark: '/bot/assets/images/bg_dark.jpg'
};

const PRELOADED_BG_IMAGES = {};

function preloadBackgroundImages() {
  Object.keys(BG_IMAGES).forEach(key => {
    const src = BG_IMAGES[key];
    if (src) {
      const img = new Image();
      img.src = src;
      PRELOADED_BG_IMAGES[key] = img;
    }
  });
}

// ─── Web Audio API Interactive Sound Synthesizer ───
let audioCtx = null;
let isAudioFxEnabled = true;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function toggleAudioFx() {
  isAudioFxEnabled = !isAudioFxEnabled;
  localStorage.setItem('hyrost_audio_fx', isAudioFxEnabled ? 'true' : 'false');
  const btn = document.getElementById('btnSoundToggle');
  if (btn) {
    btn.classList.toggle('active', isAudioFxEnabled);
    btn.innerHTML = `<i class="fas ${isAudioFxEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
  }
  if (isAudioFxEnabled) {
    initAudioContext();
    playAudioFx('pop');
    if (typeof showToast === 'function') showToast('🔊 Suara interaktif diaktifkan');
  } else {
    if (typeof showToast === 'function') showToast('🔇 Suara interaktif dimatikan');
  }
}

function playAudioFx(type = 'click') {
  if (!isAudioFxEnabled) return;
  try {
    initAudioContext();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.04);

    } else if (type === 'whoosh') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

    } else if (type === 'chime') {
      const playNote = (freq, delay, dur) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };
      playNote(523.25, 0.0, 0.18); // C5
      playNote(659.25, 0.09, 0.22); // E5
      playNote(783.99, 0.18, 0.35); // G5
      playNote(1046.50, 0.27, 0.45); // C6

    } else if (type === 'pop') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {}
}

// Curated Cinematic Scene & Map Templates for Mei Members
const SCENE_TEMPLATES = [
  {
    id: 'pvp_nether',
    title: '⚔️ Nether Gladiator',
    map: 'nether',
    mapName: '🌋 The Nether',
    pose: 'zenith',
    angle: 45,
    desc: 'Pose tempur agresif dengan latar magma membara dan partikel bara api Nether.'
  },
  {
    id: 'archer_taiga',
    title: '🏹 Taiga Scout',
    map: 'taiga',
    mapName: '🌲 Hutan Taiga',
    pose: 'bow',
    angle: 90,
    desc: 'Membidik busur panah dari sudut samping di tengah lebatnya malam hutan taiga.'
  },
  {
    id: 'king_end',
    title: '👑 Emperor of End',
    map: 'end',
    mapName: '🌌 The End Void',
    pose: 'king',
    angle: 0,
    desc: 'Duduk megah di singgasana berlatar nebula ungu kosmik dimensi The End.'
  },
  {
    id: 'sakura_relax',
    title: '🌸 Sakura Dreamer',
    map: 'cherry',
    mapName: '🌸 Cherry Grove',
    pose: 'sitting',
    angle: 45,
    desc: 'Duduk santai menatap kelopak bunga sakura merah muda yang damai.'
  },
  {
    id: 'deepslate_miner',
    title: '⛏️ Deep Cave Miner',
    map: 'dark',
    mapName: '⬛ Dark Studio',
    pose: 'mining',
    angle: 315,
    desc: 'Gerakan mengayun beliung menambang bijih berharga di kedalaman gua.'
  },
  {
    id: 'trident_ocean',
    title: '🔱 Ocean Raider',
    map: 'ocean',
    mapName: '🌊 Samudra Tropis',
    pose: 'trident',
    angle: 270,
    desc: 'Bersiap melemparkan trisula sakti di perairan pirus samudra luas.'
  },
  {
    id: 'totem_sunset',
    title: '🌟 Undying Hero',
    map: 'sunset',
    mapName: '🌇 Sunset Savanna',
    pose: 'totem',
    angle: 0,
    desc: 'Mengangkat Totem of Undying di hadapan langit cakrawala senja keemasan.'
  },
  {
    id: 'knight_snow',
    title: '🫡 Realm Paladin',
    map: 'snow',
    mapName: '🏔️ Snowy Peaks',
    pose: 'salute',
    angle: 315,
    desc: 'Hormat ksatria penjaga di puncak pegunungan es bersalju abadi.'
  }
];

// Document Initialization
document.addEventListener('DOMContentLoaded', () => {
  preloadBackgroundImages();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('user')) {
    currentIGN = urlParams.get('user').trim();
    const ignInput = document.getElementById('ignInput');
    if (ignInput) ignInput.value = currentIGN;
  }

  // Render Cinematic Templates & Saved Custom Poses Grid
  renderTemplatesGrid();
  renderSavedCustomPoses();

  // Initialize Audio FX Toggle State
  const savedAudio = localStorage.getItem('hyrost_audio_fx');
  if (savedAudio !== null) {
    isAudioFxEnabled = savedAudio === 'true';
    const sndBtn = document.getElementById('btnSoundToggle');
    if (sndBtn) {
      sndBtn.classList.toggle('active', isAudioFxEnabled);
      sndBtn.innerHTML = `<i class="fas ${isAudioFxEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
    }
  }

  // Initialize VIP Membership & Ad Pass UI
  updateMembershipBadgeUI();

  // Initialize 3D Viewport
  initSkinViewer(currentIGN);
  renderRecentSkins();

  if (urlParams.get('pose')) {
    setTimeout(() => applyPosePreset(urlParams.get('pose')), 500);
  }
  if (urlParams.get('angle')) {
    const ang = parseInt(urlParams.get('angle'), 10);
    setTimeout(() => setCameraAngle(ang), 600);
  }
  if (urlParams.get('template')) {
    setTimeout(() => applySceneTemplate(urlParams.get('template')), 650);
  }

  initMobileNavListeners();
});

// Render Scene Templates in UI
function renderTemplatesGrid() {
  const container = document.getElementById('templatesGrid');
  if (!container) return;

  container.innerHTML = SCENE_TEMPLATES.map(t => `
    <button class="template-card-btn" id="template_${t.id}" onclick="applySceneTemplate('${t.id}')">
      <div class="template-header">
        <span>${t.title}</span>
        <span class="template-map-tag">${t.mapName}</span>
      </div>
      <div class="template-desc">${t.desc}</div>
    </button>
  `).join('');
}

// Apply Full Scene Template (Pose + Map + Camera Angle)
function applySceneTemplate(templateId) {
  const tmpl = SCENE_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return;

  // 1. Highlight template card
  document.querySelectorAll('.template-card-btn').forEach(b => {
    b.classList.toggle('active', b.id === `template_${templateId}`);
  });

  // 2. Set Background
  const bgBtn = document.querySelector(`.bg-preset-btn[data-bg="${tmpl.map}"]`);
  setStudioBackground(tmpl.map, bgBtn);

  // 3. Set Pose
  const poseBtn = document.querySelector(`.pose-card-btn[data-pose="${tmpl.pose}"]`);
  applyPosePreset(tmpl.pose, poseBtn);

  // 4. Set Camera Angle
  const angleBtn = document.querySelector(`.angle-btn[data-angle="${tmpl.angle}"]`);
  setCameraAngle(tmpl.angle, angleBtn);

  if (typeof showToast === 'function') {
    showToast(`🎬 Template diaktifkan: ${tmpl.title}`);
  }
}

// Skin / Model Accessor Helper
function getSkin() {
  if (!viewer) return null;
  if (viewer.playerObject && viewer.playerObject.skin) return viewer.playerObject.skin;
  if (viewer.playerModel) return viewer.playerModel;
  if (viewer.skin) return viewer.skin;
  return null;
}

// Resize SkinViewer WebGL Canvas dynamically according to viewport mode
function resizeSkinViewer() {
  if (!viewer || !viewer.canvas) return;
  const wrapper = document.querySelector('.viewport-canvas-wrapper');
  if (!wrapper) return;

  const w = Math.floor(wrapper.clientWidth) || 360;
  const h = Math.floor(wrapper.clientHeight) || w;

  if (isTheaterModeActive) {
    if (w > 50 && h > 50) {
      viewer.setSize(w, h);
      if (viewer.camera) {
        viewer.camera.aspect = w / h;
        viewer.camera.updateProjectionMatrix();
      }
      if (orbitControl) {
        orbitControl.target.set(0, 4, 0);
        orbitControl.update();
      }
      viewer.render();
    }
  } else {
    const size = Math.min(w, h) || w || 360;
    if (size > 50) {
      viewer.setSize(size, size);
      if (viewer.camera) {
        viewer.camera.aspect = 1;
        viewer.camera.updateProjectionMatrix();
      }
      if (orbitControl) {
        orbitControl.target.set(0, 4, 0);
        orbitControl.update();
      }
      viewer.render();
    }
  }
}

// Initialize SkinViewer WebGL Canvas
function initSkinViewer(ign) {
  const canvas = document.getElementById('skin_container');
  if (!canvas) return;

  const cleanUser = encodeURIComponent(ign || 'Steve');
  const label = document.getElementById('activePlayerLabel');
  if (label) label.textContent = `${ign} (3D Viewport)`;

  const downloadBtn = document.getElementById('btnDownloadSkinFile');
  if (downloadBtn) downloadBtn.href = `https://mc-heads.net/skin/${cleanUser}`;

  if (viewer) {
    viewer.loadSkin(`https://mc-heads.net/skin/${cleanUser}`);
    return;
  }

  const wrapper = document.querySelector('.viewport-canvas-wrapper');
  const initialSize = wrapper ? Math.floor(wrapper.clientWidth) || 380 : 380;

  viewer = new skinview3d.SkinViewer({
    canvas: canvas,
    width: initialSize,
    height: initialSize,
    skin: `https://mc-heads.net/skin/${cleanUser}`,
    preserveDrawingBuffer: true,
    renderOptions: {
      preserveDrawingBuffer: true
    }
  });

  // Center camera precisely at character chest/half-body (matching photo 2 framing)
  viewer.camera.position.set(0, 4, 25);
  viewer.camera.lookAt(0, 4, 0);
  viewer.fov = 50;

  // Initialize controls safely supporting both SkinView3D v2 and v3
  if (typeof skinview3d.createOrbitControls === 'function') {
    orbitControl = skinview3d.createOrbitControls(viewer);
  } else if (viewer && viewer.controls) {
    orbitControl = viewer.controls;
  }

  if (orbitControl) {
    orbitControl.enableRotate = true;
    orbitControl.enableZoom = true;
    orbitControl.enablePan = false; // keep character centered
    orbitControl.minDistance = 15;
    orbitControl.maxDistance = 75;
    if (orbitControl.target && typeof orbitControl.target.set === 'function') {
      orbitControl.target.set(0, 4, 0);
    }
    if (typeof orbitControl.update === 'function') {
      orbitControl.update();
    }
  }

  // Listen for window resize & wrapper size changes
  window.addEventListener('resize', resizeSkinViewer);
  if (window.ResizeObserver && wrapper) {
    const ro = new ResizeObserver(() => resizeSkinViewer());
    ro.observe(wrapper);
  }

  // Apply initial stance
  setTimeout(() => {
    applyPosePreset('idle');
    resizeSkinViewer();
  }, 350);
}

function loadCustomSkinFromInput() {
  const val = (document.getElementById('ignInput').value || '').trim();
  if (!val) return;
  currentIGN = val;
  initSkinViewer(currentIGN);
  saveRecentSkin(currentIGN);
}

// ─── Recent Skin History System (LocalStorage) ───
const RECENT_SKINS_KEY = 'hyrost_recent_skins';

function getRecentSkins() {
  try {
    const raw = localStorage.getItem(RECENT_SKINS_KEY);
    return raw ? JSON.parse(raw) : ['Steve', 'Alex', 'Dream', 'Technoblade'];
  } catch (e) {
    return ['Steve', 'Alex', 'Dream', 'Technoblade'];
  }
}

function saveRecentSkin(ign) {
  if (!ign || typeof ign !== 'string') return;
  const clean = ign.trim();
  if (!clean || clean.length < 2 || clean.length > 24) return;

  try {
    let list = getRecentSkins();
    list = list.filter(item => item.toLowerCase() !== clean.toLowerCase());
    list.unshift(clean);
    if (list.length > 6) list = list.slice(0, 6);
    localStorage.setItem(RECENT_SKINS_KEY, JSON.stringify(list));
    renderRecentSkins();
  } catch (e) {}
}

function clearRecentSkins() {
  try {
    localStorage.removeItem(RECENT_SKINS_KEY);
    const wrap = document.getElementById('recentSkinsSection');
    if (wrap) wrap.style.display = 'none';
    if (typeof showToast === 'function') {
      showToast('🗑️ Riwayat skin berhasil dihapus.');
    }
  } catch (e) {}
}

function renderRecentSkins() {
  const container = document.getElementById('recentSkinsChips');
  const wrap = document.getElementById('recentSkinsSection');
  if (!container || !wrap) return;

  const list = getRecentSkins();
  if (!list || list.length === 0) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';
  container.innerHTML = list.map(name => `
    <button type="button" class="recent-skin-chip" onclick="loadSkinByIGN('${name}')" title="Muat skin ${name}">
      <img src="https://mc-heads.net/avatar/${encodeURIComponent(name)}/16" alt="${name}" onerror="this.style.display='none'">
      <span>${name}</span>
    </button>
  `).join('');
}

function loadSkinByIGN(ign) {
  if (!ign) return;
  const input = document.getElementById('ignInput');
  if (input) input.value = ign;
  const nametag = document.getElementById('nametagInput');
  if (nametag) nametag.value = ign;
  currentIGN = ign;
  initSkinViewer(ign);
  saveRecentSkin(ign);
  if (typeof showToast === 'function') {
    showToast(`👤 Memuat skin "${ign}"...`);
  }
}

// Math Utility Helpers
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return Math.round((rad * 180) / Math.PI);
}

function setSlider(part, deg) {
  const slider = document.getElementById(`slider${part}`);
  const valEl = document.getElementById(`val${part}`);
  if (slider) slider.value = deg;
  if (valEl) valEl.textContent = `${deg}°`;
}

function syncSlidersFromModel() {
  const skin = getSkin();
  if (!skin) return;
  setSlider('RightArm', toDeg(skin.rightArm.rotation.x));
  setSlider('RightArmZ', toDeg(skin.rightArm.rotation.z));
  setSlider('RightElbow', toDeg(skin.rightArm.rotation.y));
  setSlider('LeftArm', toDeg(skin.leftArm.rotation.x));
  setSlider('LeftArmZ', toDeg(skin.leftArm.rotation.z));
  setSlider('LeftElbow', toDeg(skin.leftArm.rotation.y));
  setSlider('RightLeg', toDeg(skin.rightLeg.rotation.x));
  setSlider('RightKnee', toDeg(skin.rightLeg.rotation.z));
  setSlider('LeftLeg', toDeg(skin.leftLeg.rotation.x));
  setSlider('LeftKnee', toDeg(skin.leftLeg.rotation.z));
  setSlider('Head', toDeg(skin.head.rotation.x));
  setSlider('HeadY', toDeg(skin.head.rotation.y));
  setSlider('Body', toDeg(skin.body.rotation.x));
}

let defaultLimbPositions = null;

function captureDefaultLimbPositions(skin) {
  if (defaultLimbPositions || !skin) return;
  defaultLimbPositions = {
    head: { x: skin.head.position.x, y: skin.head.position.y, z: skin.head.position.z },
    body: { x: skin.body.position.x, y: skin.body.position.y, z: skin.body.position.z },
    rightArm: { x: skin.rightArm.position.x, y: skin.rightArm.position.y, z: skin.rightArm.position.z },
    leftArm: { x: skin.leftArm.position.x, y: skin.leftArm.position.y, z: skin.leftArm.position.z },
    rightLeg: { x: skin.rightLeg.position.x, y: skin.rightLeg.position.y, z: skin.rightLeg.position.z },
    leftLeg: { x: skin.leftLeg.position.x, y: skin.leftLeg.position.y, z: skin.leftLeg.position.z }
  };
}

function resetSkinBones(skin) {
  if (!skin) return;
  captureDefaultLimbPositions(skin);

  // 1. Reset all rotations to 0
  skin.head.rotation.set(0, 0, 0);
  skin.body.rotation.set(0, 0, 0);
  skin.rightArm.rotation.set(0, 0, 0);
  skin.leftArm.rotation.set(0, 0, 0);
  skin.rightLeg.rotation.set(0, 0, 0);
  skin.leftLeg.rotation.set(0, 0, 0);

  // 2. Restore exact original joint anchor coordinates
  if (defaultLimbPositions) {
    skin.head.position.set(defaultLimbPositions.head.x, defaultLimbPositions.head.y, defaultLimbPositions.head.z);
    skin.body.position.set(defaultLimbPositions.body.x, defaultLimbPositions.body.y, defaultLimbPositions.body.z);
    skin.rightArm.position.set(defaultLimbPositions.rightArm.x, defaultLimbPositions.rightArm.y, defaultLimbPositions.rightArm.z);
    skin.leftArm.position.set(defaultLimbPositions.leftArm.x, defaultLimbPositions.leftArm.y, defaultLimbPositions.leftArm.z);
    skin.rightLeg.position.set(defaultLimbPositions.rightLeg.x, defaultLimbPositions.rightLeg.y, defaultLimbPositions.rightLeg.z);
    skin.leftLeg.position.set(defaultLimbPositions.leftLeg.x, defaultLimbPositions.leftLeg.y, defaultLimbPositions.leftLeg.z);
  }

  // 3. Reset player container translation & rotation
  if (viewer && viewer.playerObject) {
    viewer.playerObject.position.set(0, 0, 0);
    viewer.playerObject.rotation.set(0, 0, 0);
  }
}

function clearAllAnimations() {
  if (!viewer) return;
  viewer.animation = null;
  const runningBtn = document.getElementById('btnToggleRunning');
  if (runningBtn) runningBtn.style.background = '';
}

// ─── Model Format & 3D Layer Extrusion Controllers ───
function setModelType(type, btnEl) {
  if (!viewer || !viewer.playerObject) return;
  if (btnEl) {
    document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  if (viewer.playerObject.skin) {
    viewer.playerObject.skin.modelType = type;
  }
  if (typeof showToast === 'function') {
    showToast(`🎽 Model format diubah: ${type === 'slim' ? 'Slim (Alex 3px)' : 'Classic (Steve 4px)'}`);
  }
}

function toggleSkinLayer(part, layerType, isVisible) {
  const skin = getSkin();
  if (!skin || !skin[part] || !skin[part][layerType]) return;
  skin[part][layerType].visible = isVisible;
}

// ─── 3D Cape & Jubah Simulator Engine ───
function generateCapeTexture(type) {
  if (type === 'none') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  switch(type) {
    case 'hyrost':
      ctx.fillStyle = '#180a29';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#ff3385';
      ctx.fillRect(2, 2, 8, 14);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(4, 5, 4, 8);
      break;

    case 'minecon2011':
      ctx.fillStyle = '#8f1c1c';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#f5b842';
      ctx.fillRect(4, 3, 4, 3);
      ctx.fillRect(3, 6, 6, 6);
      break;

    case 'minecon2012':
      ctx.fillStyle = '#1c284d';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#d4a822';
      ctx.fillRect(4, 3, 5, 2);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(6, 5, 2, 7);
      break;

    case 'minecon2013':
      ctx.fillStyle = '#18382b';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#2de07f';
      ctx.fillRect(4, 4, 4, 6);
      break;

    case 'optifine':
      ctx.fillStyle = '#b01e28';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 4, 3, 8);
      ctx.fillRect(7, 4, 3, 8);
      break;

    case 'migrator':
      ctx.fillStyle = '#5c101c';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(4, 4, 4, 6);
      break;

    case 'anniversary15':
      ctx.fillStyle = '#1c4d28';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(4, 3, 4, 4);
      break;

    case 'cherry':
      ctx.fillStyle = '#592039';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(3, 3, 6, 8);
      break;

    default:
      return null;
  }

  return canvas.toDataURL('image/png');
}

let currentBackEquipment = 'cape';
let currentCapeKey = 'none';

function setBackEquipmentType(type, btnEl) {
  currentBackEquipment = type;
  if (btnEl) {
    document.querySelectorAll('#tabPanel_cape .model-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  setStudioCape(currentCapeKey);
  if (typeof showToast === 'function') {
    showToast(`🪽 Perlengkapan: ${type === 'elytra' ? 'Sayap Elytra' : 'Jubah Minecraft'}`);
  }
}

function setStudioCape(capeKey, btnEl) {
  if (!viewer) return;
  if (capeKey !== undefined) currentCapeKey = capeKey;
  if (btnEl) {
    document.querySelectorAll('.cape-card-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  if (currentCapeKey === 'none') {
    if (viewer.loadCape) viewer.loadCape(null);
    if (viewer.playerObject && viewer.playerObject.cape) {
      viewer.playerObject.cape.visible = false;
    }
  } else {
    const capeDataUrl = generateCapeTexture(currentCapeKey);
    if (capeDataUrl && viewer.loadCape) {
      viewer.loadCape(capeDataUrl, { backEquipment: currentBackEquipment });
      if (viewer.playerObject && viewer.playerObject.cape) {
        viewer.playerObject.cape.visible = true;
      }
    }
  }
}

// ─── Animation & Rigging Reset Helpers ───
function clearAllAnimations() {
  if (!viewer) return;
  viewer.animation = null;
  if (viewer.animations && viewer.animations.paused !== undefined) {
    viewer.animations.paused = true;
  }
  isWavingActive = false;
  const waveBtn = document.getElementById('btnToggleWaving');
  if (waveBtn) {
    waveBtn.classList.remove('active');
    waveBtn.style.background = '';
  }
  const runBtn = document.getElementById('btnToggleRunning');
  if (runBtn) {
    runBtn.classList.remove('active');
    runBtn.style.background = '';
  }
}

function resetSkinBones(skin) {
  if (!skin) return;
  if (skin.head) skin.head.rotation.set(0, 0, 0);
  if (skin.body) skin.body.rotation.set(0, 0, 0);
  if (skin.rightArm) skin.rightArm.rotation.set(0, 0, 0);
  if (skin.leftArm) skin.leftArm.rotation.set(0, 0, 0);
  if (skin.rightLeg) skin.rightLeg.rotation.set(0, 0, 0);
  if (skin.leftLeg) skin.leftLeg.rotation.set(0, 0, 0);
  if (viewer && viewer.playerObject) {
    viewer.playerObject.position.set(0, 0, 0);
  }
}

// ─── Studio Lighting Presets Engine ───
const LIGHTING_PRESETS = {
  daylight: { ambient: 100, sun: 100, name: 'Siang Cerah (Daylight)' },
  golden: { ambient: 130, sun: 160, name: 'Golden Hour (Senja)' },
  moonlight: { ambient: 50, sun: 40, name: 'Malam Bulan (Moonlight)' },
  spotlight: { ambient: 150, sun: 200, name: 'Spotlight Studio (Terang)' },
  dim: { ambient: 40, sun: 30, name: 'Redup Sinematik (Dim)' }
};

function applyLightingPreset(presetKey, btnEl) {
  const preset = LIGHTING_PRESETS[presetKey];
  if (!preset) return;

  if (btnEl) {
    document.querySelectorAll('.lighting-preset-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  // Update slider inputs & value badges
  const ambInput = document.getElementById('sliderAmbientLight');
  const sunInput = document.getElementById('sliderSunLight');
  if (ambInput) ambInput.value = preset.ambient;
  if (sunInput) sunInput.value = preset.sun;

  // Apply to Three.js lighting
  updateStudioLighting('ambient', preset.ambient);
  updateStudioLighting('sun', preset.sun);

  if (typeof showToast === 'function') {
    showToast(`💡 Pencahayaan: ${preset.name}`);
  }
}

// ─── Studio Lighting Controller ───
function updateStudioLighting(type, val) {
  if (!viewer) return;
  const intensity = parseFloat(val) / 100;
  const valEl = document.getElementById(`val${type === 'ambient' ? 'AmbientLight' : 'SunLight'}`);
  if (valEl) valEl.textContent = `${val}%`;

  if (type === 'ambient' && viewer.ambientLight) {
    viewer.ambientLight.intensity = 0.6 * intensity;
  } else if (type === 'sun' && viewer.directLight) {
    viewer.directLight.intensity = 0.8 * intensity;
  }
}

// Apply Selected Pose Preset with Precise Anatomical Angles
function applyPosePreset(poseName, btnEl) {
  if (btnEl) {
    document.querySelectorAll('.pose-card-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const skin = getSkin();
  if (!skin) return;

  clearAllAnimations();
  resetSkinBones(skin);

  switch (poseName) {
    case 'walking':
      viewer.animation = new skinview3d.WalkingAnimation();
      break;

    case 'running':
      viewer.animation = new skinview3d.RunningAnimation();
      break;

    case 'flying':
      viewer.animation = new skinview3d.FlyingAnimation();
      break;

    case 'waving':
      skin.rightArm.rotation.x = toRad(-150);
      skin.rightArm.rotation.z = toRad(25);
      skin.leftArm.rotation.x = toRad(10);
      skin.head.rotation.y = toRad(10);
      break;

    case 'bow':
      skin.rightArm.rotation.x = toRad(-85);
      skin.rightArm.rotation.y = toRad(-25);
      skin.leftArm.rotation.x = toRad(-85);
      skin.leftArm.rotation.y = toRad(25);
      skin.head.rotation.x = toRad(-5);
      break;

    case 'sword':
      skin.rightArm.rotation.x = toRad(-80);
      skin.rightArm.rotation.z = toRad(15);
      skin.leftArm.rotation.x = toRad(15);
      skin.leftArm.rotation.z = toRad(-15);
      skin.head.rotation.y = toRad(-15);
      skin.rightLeg.rotation.x = toRad(-15);
      skin.leftLeg.rotation.x = toRad(15);
      break;

    case 'shield':
      skin.leftArm.rotation.x = toRad(-75);
      skin.leftArm.rotation.y = toRad(35);
      skin.rightArm.rotation.x = toRad(-20);
      skin.rightArm.rotation.z = toRad(15);
      skin.head.rotation.x = toRad(10);
      skin.body.rotation.y = toRad(-15);
      break;

    case 'sitting':
      skin.rightLeg.rotation.x = toRad(-90);
      skin.leftLeg.rotation.x = toRad(-90);
      skin.rightArm.rotation.x = toRad(-20);
      skin.leftArm.rotation.x = toRad(-20);
      if (viewer && viewer.playerObject) {
        viewer.playerObject.position.y = -6;
      }
      break;

    case 'mining':
      skin.rightArm.rotation.x = toRad(-110);
      skin.rightArm.rotation.z = toRad(15);
      skin.leftArm.rotation.x = toRad(25);
      skin.head.rotation.x = toRad(15);
      skin.body.rotation.x = toRad(10);
      break;

    case 'swimming':
      if (viewer && viewer.playerObject) {
        viewer.playerObject.rotation.x = toRad(75);
      }
      skin.head.rotation.x = toRad(-35);
      skin.rightArm.rotation.x = toRad(140);
      skin.leftArm.rotation.x = toRad(120);
      skin.rightLeg.rotation.x = toRad(10);
      skin.leftLeg.rotation.x = toRad(-10);
      break;

    case 'victory':
      skin.rightArm.rotation.x = toRad(-150);
      skin.rightArm.rotation.z = toRad(20);
      skin.leftArm.rotation.x = toRad(-150);
      skin.leftArm.rotation.z = toRad(-20);
      skin.head.rotation.x = toRad(-15);
      skin.rightLeg.rotation.z = toRad(10);
      skin.leftLeg.rotation.z = toRad(-10);
      break;

    case 'trident':
      skin.rightArm.rotation.x = toRad(-130);
      skin.rightArm.rotation.z = toRad(-15);
      skin.leftArm.rotation.x = toRad(25);
      skin.head.rotation.y = toRad(15);
      skin.rightLeg.rotation.x = toRad(25);
      skin.leftLeg.rotation.x = toRad(-25);
      break;

    case 'king':
      skin.rightLeg.rotation.x = toRad(-90);
      skin.leftLeg.rotation.x = toRad(-90);
      skin.rightArm.rotation.x = toRad(-25);
      skin.rightArm.rotation.z = toRad(25);
      skin.leftArm.rotation.x = toRad(-25);
      skin.leftArm.rotation.z = toRad(-25);
      skin.head.rotation.x = toRad(-8);
      if (viewer && viewer.playerObject) {
        viewer.playerObject.position.y = -6;
      }
      break;

    case 'zenith':
      skin.rightArm.rotation.x = toRad(-75);
      skin.rightArm.rotation.z = toRad(20);
      skin.leftArm.rotation.x = toRad(20);
      skin.leftArm.rotation.z = toRad(-15);
      skin.head.rotation.y = toRad(-10);
      skin.rightLeg.rotation.x = toRad(-20);
      skin.leftLeg.rotation.x = toRad(20);
      break;

    case 'mace':
      skin.rightArm.rotation.x = toRad(-140);
      skin.leftArm.rotation.x = toRad(-140);
      skin.head.rotation.x = toRad(15);
      skin.body.rotation.x = toRad(10);
      break;

    case 'totem':
      skin.leftArm.rotation.x = toRad(-70);
      skin.leftArm.rotation.y = toRad(15);
      skin.rightArm.rotation.x = toRad(-20);
      skin.head.rotation.y = toRad(-10);
      break;

    case 'salute':
      skin.rightArm.rotation.x = toRad(-110);
      skin.rightArm.rotation.z = toRad(35);
      skin.head.rotation.x = toRad(-5);
      break;

    default: // idle
      skin.rightArm.rotation.x = toRad(-5);
      skin.leftArm.rotation.x = toRad(5);
      skin.rightLeg.rotation.x = toRad(3);
      skin.leftLeg.rotation.x = toRad(-3);
      break;
  }

  syncSlidersFromModel();
  playAudioFx('whoosh');
}

// Multi-Joint Manual Bone Rigging Controller (Bahu, Siku, Pinggul, Lutut, Kepala, Tubuh)
function updateManualBone(part, val) {
  const skin = getSkin();
  if (!skin) return;
  clearAllAnimations();

  const rad = toRad(parseFloat(val));
  const cap = part.charAt(0).toUpperCase() + part.slice(1);
  const valEl = document.getElementById(`val${cap}`);
  if (valEl) valEl.textContent = `${val}°`;

  // Arms & Elbows
  if (part === 'rightArm') skin.rightArm.rotation.x = rad;
  if (part === 'rightArmZ') skin.rightArm.rotation.z = rad;
  if (part === 'rightElbow') skin.rightArm.rotation.y = rad;
  
  if (part === 'leftArm') skin.leftArm.rotation.x = rad;
  if (part === 'leftArmZ') skin.leftArm.rotation.z = rad;
  if (part === 'leftElbow') skin.leftArm.rotation.y = rad;

  // Legs & Knees
  if (part === 'rightLeg') skin.rightLeg.rotation.x = rad;
  if (part === 'rightKnee') skin.rightLeg.rotation.z = rad;
  
  if (part === 'leftLeg') skin.leftLeg.rotation.x = rad;
  if (part === 'leftKnee') skin.leftLeg.rotation.z = rad;

  // Head & Body
  if (part === 'head') skin.head.rotation.x = rad;
  if (part === 'headY') skin.head.rotation.y = rad;
  if (part === 'body') skin.body.rotation.x = rad;
}

// 360 Camera Angle Selector
function setCameraAngle(angle, btnEl) {
  if (btnEl) {
    document.querySelectorAll('.angle-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  if (!viewer) return;

  const rad = toRad(angle);
  const dist = 25;
  viewer.camera.position.set(dist * Math.sin(rad), 4, dist * Math.cos(rad));
  viewer.camera.lookAt(0, 4, 0);
  if (orbitControl) {
    orbitControl.target.set(0, 4, 0);
    orbitControl.update();
  }
}

// Toggle Viewport Auto Spin
function toggleSpin() {
  if (!viewer) return;
  isSpinning = !isSpinning;
  viewer.autoRotate = isSpinning;
  viewer.autoRotateSpeed = 2.5;

  const btn = document.getElementById('btnToggleSpin');
  if (btn) {
    btn.classList.toggle('active', isSpinning);
    btn.innerHTML = `<i class="fas fa-rotate" style="color:var(--accent-cyan);"></i> <span>${isSpinning ? 'Berhenti Spin' : 'Spin 360°'}</span>`;
  }
}

// Toggle Animated Run
function toggleRunAnimation() {
  if (!viewer) return;
  const btn = document.getElementById('btnToggleRunning');
  if (viewer.animation instanceof skinview3d.RunningAnimation) {
    clearAllAnimations();
    applyPosePreset('idle');
    if (btn) btn.classList.remove('active');
  } else {
    applyPosePreset('running');
    if (btn) btn.classList.add('active');
  }
}

// Reset Camera to Default Angle
function resetCameraView() {
  if (!viewer) return;
  viewer.camera.position.set(0, 4, 25);
  viewer.camera.lookAt(0, 4, 0);
  if (orbitControl) {
    orbitControl.target.set(0, 4, 0);
    orbitControl.update();
  }
  const firstAngle = document.querySelector('.angle-btn');
  if (firstAngle) setCameraAngle(0, firstAngle);
}

// Background Selector Controller
function setStudioBackground(bg, btnEl) {
  const proBackgrounds = ['nether', 'end', 'cherry', 'dark'];
  if (proBackgrounds.includes(bg) && !hasProAccess()) {
    openRewardedAdModal(`Background ${bg.toUpperCase()}`, () => setStudioBackground(bg, btnEl));
    return;
  }

  currentBg = bg;
  if (btnEl) {
    document.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const wrapper = document.querySelector('.viewport-canvas-wrapper');
  if (wrapper) {
    if (bg === 'transparent') {
      wrapper.style.background = 'radial-gradient(circle at 50% 50%, rgba(88, 101, 242, 0.2) 0%, rgba(7, 10, 19, 0.98) 85%)';
    } else if (BG_IMAGES[bg]) {
      wrapper.style.background = `url('${BG_IMAGES[bg]}') center/cover no-repeat`;
    }
  }
}

// ─── Aspect Ratio & Resolution Controllers ───
let currentAspectRatio = '1:1';

function setExportAspectRatio(ratio, btnEl) {
  currentAspectRatio = ratio;
  if (btnEl) {
    document.querySelectorAll('.aspect-ratio-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  updateExportButtonLabel();
  if (typeof showToast === 'function') {
    const ratioNames = {
      '1:1': '1:1 Kotak (Profil)',
      '16:9': '16:9 Wallpaper PC',
      '9:16': '9:16 Story HP',
      '3:1': '3:1 Banner Header'
    };
    showToast(`📐 Aspek Rasio: ${ratioNames[ratio] || ratio}`);
  }
}

function setExportResolution(res, btnEl) {
  const targetRes = parseInt(res, 10) || 1000;
  if (targetRes >= 3000 && !hasProAccess()) {
    openRewardedAdModal(`Resolusi ${targetRes}px Ultra HD`, () => setExportResolution(res, btnEl));
    return;
  }

  currentResolution = targetRes;
  if (btnEl) {
    document.querySelectorAll('.res-preset-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  updateExportButtonLabel();
}

function updateExportButtonLabel() {
  const labelEl = document.getElementById('btnExportLabel');
  if (!labelEl) return;
  const targetSize = currentResolution || 1000;
  let w = targetSize, h = targetSize;
  if (currentAspectRatio === '16:9') {
    h = Math.round(targetSize * 9 / 16);
  } else if (currentAspectRatio === '9:16') {
    w = Math.round(targetSize * 9 / 16);
  } else if (currentAspectRatio === '3:1') {
    h = Math.round(targetSize / 3);
  }
  labelEl.textContent = `Unduh Snapshot (${w}x${h} - ${currentAspectRatio})`;
}

// Draw Image with Aspect-Cover Fit
function drawImageCover(ctx, img, canvasWidth, canvasHeight) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  let renderWidth, renderHeight, offsetX, offsetY;

  if (imgRatio < canvasRatio) {
    renderWidth = canvasWidth;
    renderHeight = canvasWidth / imgRatio;
    offsetX = 0;
    offsetY = (canvasHeight - renderHeight) / 2;
  } else {
    renderWidth = canvasHeight * imgRatio;
    renderHeight = canvasHeight;
    offsetX = (canvasWidth - renderWidth) / 2;
    offsetY = 0;
  }

  ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
}

// Multi-Resolution Snapshot Exporter with Dynamic Aspect Ratio & True Native WebGL 5K Quality
async function exportCustomSnapshot() {
  if (!viewer || !viewer.canvas) return;

  const targetSize = currentResolution || 1000;
  let exportWidth = targetSize;
  let exportHeight = targetSize;

  if (currentAspectRatio === '16:9') {
    exportHeight = Math.round(targetSize * 9 / 16);
  } else if (currentAspectRatio === '9:16') {
    exportWidth = Math.round(targetSize * 9 / 16);
  } else if (currentAspectRatio === '3:1') {
    exportHeight = Math.round(targetSize / 3);
  }

  const wrapper = document.querySelector('.viewport-canvas-wrapper');
  const originalWidth = viewer.width || (wrapper ? Math.floor(wrapper.clientWidth) : 380) || 380;
  const originalHeight = viewer.height || originalWidth;

  if (typeof showToast === 'function') {
    showToast(`⏳ Merender Ultra HD (${exportWidth}x${exportHeight} - ${currentAspectRatio})...`);
  }

  try {
    // 1. Preload Background Image if required
    let bgImg = null;
    if (currentBg !== 'transparent' && BG_IMAGES[currentBg]) {
      bgImg = PRELOADED_BG_IMAGES[currentBg];
      if (!bgImg || !bgImg.complete || bgImg.naturalWidth === 0) {
        bgImg = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = BG_IMAGES[currentBg];
        });
      }
    }

    // 2. Temporarily resize viewer WebGL viewport to target size & dynamic aspect ratio
    viewer.setSize(exportWidth, exportHeight);
    if (viewer.camera) {
      viewer.camera.aspect = exportWidth / exportHeight;
      viewer.camera.updateProjectionMatrix();
    }
    if (orbitControl) {
      orbitControl.target.set(0, 0, 0);
      orbitControl.update();
    }

    // 3. Render 3D WebGL scene natively at full target resolution
    viewer.render();

    // 4. Create offscreen canvas for final composite
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext('2d');

    // 5. Draw high-res realistic background image with cover fit
    if (bgImg) {
      drawImageCover(ctx, bgImg, exportWidth, exportHeight);
    } else if (currentBg === 'transparent') {
      ctx.clearRect(0, 0, exportWidth, exportHeight);
    }

    // 6. Draw the crisp, genuine full-resolution WebGL 3D character (1:1 pixel exact)
    ctx.drawImage(viewer.canvas, 0, 0, exportWidth, exportHeight);

    // 7. Restore on-screen viewport size & 1:1 camera aspect
    viewer.setSize(originalWidth, originalHeight);
    if (viewer.camera) {
      viewer.camera.aspect = 1;
      viewer.camera.updateProjectionMatrix();
    }
    if (orbitControl) {
      orbitControl.target.set(0, 0, 0);
      orbitControl.update();
    }
    viewer.render();

    // 8. Trigger crisp PNG download via Blob
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ratioLabel = currentAspectRatio.replace(':', 'x');
      link.download = `mei_labs_3d_skin_${currentIGN}_${currentBg}_${exportWidth}x${exportHeight}_${ratioLabel}_${Date.now()}.png`;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      playAudioFx('chime');
      if (typeof showToast === 'function') {
        showToast(`📸 Snapshot Ultra HD (${exportWidth}x${exportHeight}) berhasil diunduh!`);
      }
    }, 'image/png');

  } catch (err) {
    // Failsafe recovery of original size
    if (viewer) {
      viewer.setSize(originalWidth, originalHeight);
      if (viewer.camera) {
        viewer.camera.aspect = 1;
        viewer.camera.updateProjectionMatrix();
      }
      viewer.render();
    }
    if (typeof showToast === 'function') {
      showToast('⚠️ Gagal memproses gambar resolusi tinggi.');
    }
  }
}

// Download Raw Skin Texture
async function downloadSkinTexture(e) {
  if (e) e.preventDefault();
  try {
    const url = `https://mc-heads.net/skin/${encodeURIComponent(currentIGN)}`;
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `skin_${currentIGN}.png`;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    window.open(`https://mc-heads.net/skin/${encodeURIComponent(currentIGN)}`, '_blank');
  }
}

// Copy Discord Skin Command Helper
function copyDiscordSkinCommand() {
  const cmd = `!mcskin ${currentIGN}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(cmd);
    if (typeof showToast === 'function') {
      showToast(`📋 Disalin: ${cmd}`);
    } else {
      alert(`Command berhasil disalin: ${cmd}`);
    }
  }
}

// ─── Custom Skin File Upload & Drag-and-Drop Handler ───
function handleSkinFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.includes('png')) {
    if (typeof showToast === 'function') showToast('⚠️ Harap pilih file gambar PNG skin Minecraft.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    if (viewer) {
      viewer.loadSkin(dataUrl);
      currentIGN = file.name.replace(/\.[^/.]+$/, "") || "CustomSkin";
      
      const label = document.getElementById('activePlayerLabel');
      if (label) label.textContent = `${currentIGN} (3D Viewport)`;
      
      const nametag = document.getElementById('nametagText');
      if (nametag) nametag.textContent = currentIGN;

      const ignInput = document.getElementById('ignInput');
      if (ignInput) ignInput.value = currentIGN;

      if (typeof showToast === 'function') {
        showToast(`📂 Skin lokal "${currentIGN}" berhasil dimuat!`);
      }
    }
  };
  reader.readAsDataURL(file);
}

// ─── Floating 3D Minecraft Nametag Customizer ───
function updateNametagText(val) {
  const el = document.getElementById('nametagText');
  if (el) el.textContent = val.trim() || currentIGN;
}

function updateNametagRank(rank) {
  const badge = document.getElementById('nametagRankBadge');
  if (!badge) return;
  
  if (rank === 'none') {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'inline-block';
    badge.className = `nametag-rank-${rank}`;
    const rankTitles = {
      member: '🟢 Member',
      vip: '🟡 VIP',
      staff: '🔵 Staff',
      founder: '🟣 Founder'
    };
    badge.textContent = rankTitles[rank] || '';
  }
}

function toggleNametagVisibility(visible) {
  const tag = document.getElementById('viewportNametag');
  if (tag) tag.style.display = visible ? 'flex' : 'none';
}

// ─── VFX Shaders & Post-Processing Visual Filters ───
let currentVfxFilter = 'none';

function setStudioVfxFilter(filterName, btnEl) {
  currentVfxFilter = filterName;
  if (btnEl) {
    document.querySelectorAll('.filter-preset-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const wrapper = document.getElementById('viewportCanvasWrapper');
  if (!wrapper) return;

  wrapper.classList.remove('fx-filter-vignette', 'fx-filter-cyberpunk', 'fx-filter-golden', 'fx-filter-retro', 'fx-filter-noir');
  if (filterName !== 'none') {
    wrapper.classList.add(`fx-filter-${filterName}`);
  }

  if (typeof showToast === 'function') {
    showToast(`🔮 Filter VFX diaktifkan: ${filterName}`);
  }
}

// ─── Extra Interactive Animation Loop: Melambaikan Tangan (Waving) ───
let isWavingActive = false;
let wavingAnimLoop = null;

function toggleWavingAnimation() {
  if (!viewer) return;
  const btn = document.getElementById('btnToggleWaving');
  const skin = getSkin();
  if (!skin) return;

  if (isWavingActive) {
    clearAllAnimations();
    applyPosePreset('idle');
    isWavingActive = false;
    if (btn) btn.classList.remove('active');
  } else {
    clearAllAnimations();
    isWavingActive = true;
    if (btn) btn.classList.add('active');

    let t = 0;
    wavingAnimLoop = {
      update: () => {
        t += 0.08;
        skin.rightArm.rotation.x = toRad(-140);
        skin.rightArm.rotation.z = toRad(20 + Math.sin(t * 3) * 18);
        skin.head.rotation.y = toRad(Math.sin(t) * 8);
      }
    };
    if (viewer.animations) {
      viewer.animations.add(wavingAnimLoop);
    }
  }
}

// ─── Multi-Format Video & Animated GIF 360° Recording Engine ───
let currentVideoFormat = 'mp4'; // 'mp4' | 'webm' | 'gif'
let currentVideoDuration = 4.5; // in seconds
let isRecordingVideo = false;
let mediaRecorder = null;
let recordedChunks = [];
let gifRecordingCancel = false;

function setVideoFormat(format, btnEl) {
  if (format === 'gif' && !hasProAccess()) {
    openRewardedAdModal('Format GIF Animasi 360°', () => setVideoFormat(format, btnEl));
    return;
  }

  currentVideoFormat = format;
  if (btnEl) {
    document.querySelectorAll('.video-format-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const recordBtnLabel = document.getElementById('btnRecordLabel');
  if (recordBtnLabel) {
    if (format === 'mp4') recordBtnLabel.textContent = '🎬 Rekam Putaran 360° (MP4)';
    else if (format === 'webm') recordBtnLabel.textContent = '🎥 Rekam Putaran 360° (WebM)';
    else if (format === 'gif') recordBtnLabel.textContent = '🎞️ Buat GIF Animasi 360°';
  }

  playAudioFx('pop');
  if (typeof showToast === 'function') {
    const names = { mp4: 'MP4 (H.264 Universal Video)', webm: 'WebM (High-Performance 60FPS)', gif: 'GIF Animasi (Looping Sticker/Emoji)' };
    showToast(`📼 Format video: ${names[format] || format.toUpperCase()}`);
  }
}

function setVideoDuration(dur, btnEl) {
  const targetDur = parseFloat(dur) || 4.5;
  if (targetDur >= 8 && !hasProAccess()) {
    openRewardedAdModal('Durasi Sinematik 8 Detik', () => setVideoDuration(dur, btnEl));
    return;
  }

  currentVideoDuration = targetDur;
  if (btnEl) {
    document.querySelectorAll('.vduration-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  playAudioFx('pop');
  if (typeof showToast === 'function') {
    showToast(`⏱️ Durasi putaran: ${currentVideoDuration} detik`);
  }
}

async function toggleRecord360Spin() {
  const canvas = document.getElementById('skin_container');
  if (!canvas || !viewer) return;
  const btn = document.getElementById('btnRecordVideo');
  const btnLabel = document.getElementById('btnRecordLabel');

  if (isRecordingVideo) {
    // Stop recording manually
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    gifRecordingCancel = true;
    return;
  }

  if (currentVideoFormat === 'gif') {
    await recordAnimatedGif360(canvas, btn, btnLabel);
  } else {
    await recordVideoMediaRecorder(canvas, btn, btnLabel, currentVideoFormat);
  }
}

// 1. MP4 & WebM MediaRecorder Recording Method
async function recordVideoMediaRecorder(canvas, btn, btnLabel, targetFormat) {
  try {
    if (!isSpinning) toggleSpin();

    const stream = canvas.captureStream(60);
    recordedChunks = [];

    let mimeType = 'video/webm';
    let fileExt = 'webm';

    if (targetFormat === 'mp4') {
      const mp4Types = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264',
        'video/mp4'
      ];
      const matchedMp4 = mp4Types.find(t => MediaRecorder.isTypeSupported(t));
      if (matchedMp4) {
        mimeType = matchedMp4;
        fileExt = 'mp4';
      } else {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        fileExt = 'mp4';
      }
    } else {
      mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm');
      fileExt = 'webm';
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = function(e) {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = function() {
      isRecordingVideo = false;
      if (btn) btn.style.background = '';
      if (btnLabel) {
        btnLabel.textContent = targetFormat === 'mp4' ? '🎬 Rekam Putaran 360° (MP4)' : '🎥 Rekam Putaran 360° (WebM)';
      }

      const blob = new Blob(recordedChunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `mei_labs_3d_spin_${currentIGN}_${Date.now()}.${fileExt}`;
      a.href = videoUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(videoUrl);

      playAudioFx('chime');
      if (typeof showToast === 'function') {
        showToast(`🎉 Video 360° (${fileExt.toUpperCase()}) berhasil diunduh!`);
      }
    };

    mediaRecorder.start();
    isRecordingVideo = true;
    if (btn) btn.style.background = 'rgba(255, 51, 85, 0.25)';
    if (btnLabel) btnLabel.innerHTML = `<span class="rec-pulse-badge">● Merekam ${targetFormat.toUpperCase()}...</span>`;

    if (typeof showToast === 'function') {
      showToast(`⏺️ Merekam video ${targetFormat.toUpperCase()} (${currentVideoDuration} detik)...`);
    }

    setTimeout(() => {
      if (isRecordingVideo && mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, Math.round(currentVideoDuration * 1000) + 150);

  } catch (err) {
    isRecordingVideo = false;
    if (btn) btn.style.background = '';
    if (typeof showToast === 'function') {
      showToast('⚠️ Perekaman video langsung tidak didukung di browser ini.');
    }
  }
}

// 2. Animated GIF 360° Recording Engine
async function recordAnimatedGif360(canvas, btn, btnLabel) {
  try {
    isRecordingVideo = true;
    gifRecordingCancel = false;

    if (btn) btn.style.background = 'rgba(255, 187, 0, 0.25)';
    if (btnLabel) btnLabel.innerHTML = '<span class="rec-pulse-badge" style="color:var(--mei-gold);">● Mengambil Frame GIF...</span>';

    if (typeof showToast === 'function') {
      showToast(`🎞️ Memproses animasi GIF 360° (${currentVideoDuration} detik)...`);
    }

    if (!isSpinning) toggleSpin();

    const frames = [];
    const totalFrames = Math.min(36, Math.max(18, Math.round(currentVideoDuration * 6)));
    const frameInterval = (currentVideoDuration * 1000) / totalFrames;

    // Create offscreen capture canvas for optimal GIF size (320x320)
    const gifCanvas = document.createElement('canvas');
    gifCanvas.width = 320;
    gifCanvas.height = 320;
    const gifCtx = gifCanvas.getContext('2d');

    for (let i = 0; i < totalFrames; i++) {
      if (gifRecordingCancel) {
        isRecordingVideo = false;
        if (btn) btn.style.background = '';
        if (btnLabel) btnLabel.textContent = '🎞️ Buat GIF Animasi 360°';
        return;
      }

      // Draw background if set
      if (currentBg !== 'transparent' && BG_IMAGES[currentBg] && PRELOADED_BG_IMAGES[currentBg]) {
        gifCtx.drawImage(PRELOADED_BG_IMAGES[currentBg], 0, 0, 320, 320);
      } else {
        gifCtx.clearRect(0, 0, 320, 320);
      }

      // Draw 3D canvas
      gifCtx.drawImage(canvas, 0, 0, 320, 320);
      frames.push(gifCanvas.toDataURL('image/png'));

      await new Promise(r => setTimeout(r, frameInterval));
    }

    if (btnLabel) btnLabel.innerHTML = '<span class="rec-pulse-badge" style="color:var(--accent-cyan);">⏳ Menyusun GIF...</span>';

    if (window.gifshot) {
      gifshot.createGIF({
        images: frames,
        gifWidth: 320,
        gifHeight: 320,
        interval: currentVideoDuration / totalFrames,
        numFrames: totalFrames,
        sampleInterval: 10
      }, function(obj) {
        isRecordingVideo = false;
        if (btn) btn.style.background = '';
        if (btnLabel) btnLabel.textContent = '🎞️ Buat GIF Animasi 360°';

        if (!obj.error) {
          const a = document.createElement('a');
          a.download = `mei_labs_3d_spin_${currentIGN}_${Date.now()}.gif`;
          a.href = obj.image;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          playAudioFx('chime');
          if (typeof showToast === 'function') {
            showToast('🎉 Animasi GIF 360° berhasil dibuat dan diunduh!');
          }
        } else {
          if (typeof showToast === 'function') showToast('⚠️ Gagal membuat animasi GIF.');
        }
      });
    } else {
      isRecordingVideo = false;
      if (btn) btn.style.background = '';
      if (btnLabel) btnLabel.textContent = '🎞️ Buat GIF Animasi 360°';
      if (typeof showToast === 'function') {
        showToast('⚠️ Pustaka GIF sedang dimuat, silakan coba kembali.');
      }
    }

  } catch (err) {
    isRecordingVideo = false;
    if (btn) btn.style.background = '';
    if (btnLabel) btnLabel.textContent = '🎞️ Buat GIF Animasi 360°';
    if (typeof showToast === 'function') {
      showToast('⚠️ Terjadi kendala saat memproses GIF animasi.');
    }
  }
}

// Studio Tab Switcher Controller
function switchStudioTab(tabId, tabBtn) {
  // Update Tab Buttons
  document.querySelectorAll('.studio-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });

  if (tabBtn) {
    tabBtn.classList.add('active');
    tabBtn.setAttribute('aria-selected', 'true');
  } else {
    const defaultBtn = document.getElementById(`tabBtn_${tabId}`);
    if (defaultBtn) {
      defaultBtn.classList.add('active');
      defaultBtn.setAttribute('aria-selected', 'true');
    }
  }

  // Update Tab Panels
  document.querySelectorAll('.studio-tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById(`tabPanel_${tabId}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  playAudioFx('pop');
}

// Initialize Mobile Navigation Listeners
function initMobileNavListeners() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('botNavMenu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      toggleBtn.classList.toggle('open');
    });
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        toggleBtn.classList.remove('open');
      });
    });
  }

  // Drag & drop support on upload zone
  const dropZone = document.getElementById('skinUploadZone');
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files[0]) {
        handleSkinFileUpload({ target: { files: files } });
      }
    }, false);
  }
}

// ─── Fullscreen Theater Mode Controller ───
let isTheaterModeActive = false;

function toggleFullscreenTheater() {
  isTheaterModeActive = !isTheaterModeActive;
  document.body.classList.toggle('fullscreen-theater-mode', isTheaterModeActive);
  const btn = document.getElementById('btnFullscreenToggle');
  if (btn) {
    btn.classList.toggle('active', isTheaterModeActive);
    btn.innerHTML = `<i class="fas ${isTheaterModeActive ? 'fa-compress' : 'fa-expand'}"></i>`;
    btn.title = isTheaterModeActive ? 'Keluar Mode Layar Penuh (Esc)' : 'Mode Layar Penuh (Theater Mode)';
  }
  playAudioFx('whoosh');

  requestAnimationFrame(() => {
    resizeSkinViewer();
    setTimeout(resizeSkinViewer, 50);
    setTimeout(resizeSkinViewer, 200);
  });

  if (typeof showToast === 'function') {
    showToast(isTheaterModeActive ? '⛶ Mode Teater Layar Penuh (Tekan Esc untuk keluar)' : '↩️ Keluar dari Mode Teater');
  }
}

// Handle Escape Key to exit Theater Mode
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isTheaterModeActive) {
    toggleFullscreenTheater();
  }
});

// ─── Custom User Poses Saver & LocalStorage Engine ───
const CUSTOM_POSES_STORAGE_KEY = 'hyrost_custom_poses';

function getSavedCustomPoses() {
  try {
    const raw = localStorage.getItem(CUSTOM_POSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCurrentCustomPose() {
  const input = document.getElementById('customPoseNameInput');
  const name = input ? input.value.trim() : '';
  if (!name) {
    if (typeof showToast === 'function') showToast('⚠️ Harap masukkan nama untuk pose kustom Anda.');
    if (input) input.focus();
    return;
  }

  const skin = getSkin();
  if (!skin) return;

  const poseData = {
    id: 'pose_' + Date.now(),
    name: name,
    timestamp: Date.now(),
    bones: {
      headX: toDeg(skin.head.rotation.x),
      headY: toDeg(skin.head.rotation.y),
      rightArmX: toDeg(skin.rightArm.rotation.x),
      rightArmY: toDeg(skin.rightArm.rotation.y),
      rightArmZ: toDeg(skin.rightArm.rotation.z),
      leftArmX: toDeg(skin.leftArm.rotation.x),
      leftArmY: toDeg(skin.leftArm.rotation.y),
      leftArmZ: toDeg(skin.leftArm.rotation.z),
      rightLegX: toDeg(skin.rightLeg.rotation.x),
      rightLegZ: toDeg(skin.rightLeg.rotation.z),
      leftLegX: toDeg(skin.leftLeg.rotation.x),
      leftLegZ: toDeg(skin.leftLeg.rotation.z),
      bodyX: toDeg(skin.body.rotation.x)
    }
  };

  let list = getSavedCustomPoses();
  list.unshift(poseData);
  if (list.length > 12) list = list.slice(0, 12);
  localStorage.setItem(CUSTOM_POSES_STORAGE_KEY, JSON.stringify(list));

  if (input) input.value = '';
  renderSavedCustomPoses();
  playAudioFx('chime');
  if (typeof showToast === 'function') {
    showToast(`💾 Pose "${name}" berhasil disimpan!`);
  }
}

function loadCustomSavedPose(poseId) {
  const list = getSavedCustomPoses();
  const item = list.find(p => p.id === poseId);
  if (!item || !item.bones) return;

  clearAllAnimations();
  const skin = getSkin();
  if (!skin) return;

  const b = item.bones;
  skin.head.rotation.x = toRad(b.headX || 0);
  skin.head.rotation.y = toRad(b.headY || 0);
  skin.rightArm.rotation.x = toRad(b.rightArmX || 0);
  skin.rightArm.rotation.y = toRad(b.rightArmY || 0);
  skin.rightArm.rotation.z = toRad(b.rightArmZ || 0);
  skin.leftArm.rotation.x = toRad(b.leftArmX || 0);
  skin.leftArm.rotation.y = toRad(b.leftArmY || 0);
  skin.leftArm.rotation.z = toRad(b.leftArmZ || 0);
  skin.rightLeg.rotation.x = toRad(b.rightLegX || 0);
  skin.rightLeg.rotation.z = toRad(b.rightLegZ || 0);
  skin.leftLeg.rotation.x = toRad(b.leftLegX || 0);
  skin.leftLeg.rotation.z = toRad(b.leftLegZ || 0);
  skin.body.rotation.x = toRad(b.bodyX || 0);

  syncSlidersFromModel();
  playAudioFx('whoosh');
  if (typeof showToast === 'function') {
    showToast(`✨ Pose "${item.name}" dimuat!`);
  }
}

function deleteCustomSavedPose(poseId, e) {
  if (e) e.stopPropagation();
  let list = getSavedCustomPoses();
  list = list.filter(p => p.id !== poseId);
  localStorage.setItem(CUSTOM_POSES_STORAGE_KEY, JSON.stringify(list));
  renderSavedCustomPoses();
  playAudioFx('pop');
  if (typeof showToast === 'function') {
    showToast('🗑️ Pose berhasil dihapus.');
  }
}

function renderSavedCustomPoses() {
  const container = document.getElementById('savedCustomPosesList');
  const wrap = document.getElementById('savedCustomPosesWrap');
  if (!container || !wrap) return;

  const list = getSavedCustomPoses();
  if (!list || list.length === 0) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';
  container.innerHTML = list.map(item => `
    <div class="saved-pose-chip">
      <button type="button" class="saved-pose-btn-load" onclick="loadCustomSavedPose('${item.id}')" title="Terapkan pose ini">
        <i class="fas fa-person" style="color:var(--mei-emerald);"></i> <span>${item.name}</span>
      </button>
      <button type="button" class="saved-pose-chip-del" onclick="deleteCustomSavedPose('${item.id}', event)" title="Hapus pose">
        <i class="fas fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

// =============================================================================
// ─── Mei Labs Premium & Rewarded Ad Monetization Engine (Server-backed) ───
// All VIP state is authoritative from the server; localStorage is only used as
// a fast session cache and legacy guest fallback.
// =============================================================================

// ── Legacy localStorage keys (kept for guest ad-pass fallback) ──
const VIP_STORAGE_KEY      = 'hyrost_vip_expires';
const VIP_PLAN_STORAGE_KEY = 'hyrost_vip_plan';
const AD_REWARD_STORAGE_KEY = 'hyrost_ad_unlock_until';

// ── In-memory session cache (cleared on page reload) ──
let _studioCache = null;          // { isVip, isAdPass, hasProAccess, isAdmin, planName, vipExpiresAt, adUntil, username, ts }
const CACHE_TTL_MS = 60 * 1000;  // 1 minute

let pendingRewardCallback = null;
let adTimerInterval = null;
let adCountdownSeconds = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAuthToken() {
  return localStorage.getItem('hyrostToken') || null;
}

function isLoggedIn() {
  return !!getAuthToken();
}

/** Resolve the best /api base URL (same multi-fallback strategy as login.js) */
function getStudioApiBase() {
  const candidates = [
    window.HYROST_API_URL,
    localStorage.getItem('hyrost_api_url'),
    '/api',
    window.location.origin + '/api',
    `${window.location.protocol}//${window.location.hostname}:3044/api`,
  ].filter(Boolean);
  return [...new Set(candidates)][0].replace(/\/+$/, '');
}

/** Authenticated fetch helper with timeout */
async function studioApiFetch(endpoint, options = {}) {
  const token   = getAuthToken();
  const base    = getStudioApiBase();
  const url     = `${base}/studio/${endpoint.replace(/^\/+/, '')}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const controller = new AbortController();
  const timeoutMs = options.timeout || 10000;
  const { timeout, ...fetchOpts } = options;
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res  = await fetch(url, { ...fetchOpts, headers, signal: controller.signal });
    clearTimeout(tid);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(tid);
    return { ok: false, status: 0, data: { message: e.name === 'AbortError' ? 'Koneksi timeout' : 'Gagal terhubung ke server' } };
  }
}

// ── VIP Status Fetch & Cache ─────────────────────────────────────────────────

/**
 * Fetch VIP status from server. Returns cached result if < CACHE_TTL_MS old.
 * For guests (no token), falls back to localStorage-only guest checks.
 */
async function fetchStudioStatus(forceRefresh = false) {
  // Use memory cache if fresh
  if (!forceRefresh && _studioCache && (Date.now() - _studioCache.ts) < CACHE_TTL_MS) {
    return _studioCache;
  }

  // ── Not logged in → guest fallback ──
  if (!isLoggedIn()) {
    const adRaw  = localStorage.getItem(AD_REWARD_STORAGE_KEY);
    const adUntilMs = adRaw ? parseInt(adRaw, 10) : 0;
    const isAdPass  = !isNaN(adUntilMs) && adUntilMs > Date.now();

    return {
      isLoggedIn:   false,
      isAdmin:      false,
      isVip:        false,
      isAdPass,
      hasProAccess: isAdPass,
      planName:     null,
      vipExpiresAt: null,
      adUntil:      isAdPass ? new Date(adUntilMs).toISOString() : null,
      username:     null,
      ts:           Date.now(),
    };
  }

  // ── Logged in → fetch from server ──
  try {
    const { ok, data } = await studioApiFetch('vip-status', { method: 'GET' });
    if (ok && data.success) {
      _studioCache = {
        isLoggedIn:   true,
        isAdmin:      data.isAdmin || false,
        isVip:        data.isVip  || false,
        isAdPass:     data.isAdPass || false,
        hasProAccess: data.hasProAccess || false,
        planName:     data.planName  || null,
        vipExpiresAt: data.vipExpiresAt || null,
        adUntil:      data.adUntil  || null,
        username:     data.username || null,
        ts:           Date.now(),
      };
      return _studioCache;
    }
  } catch (_) {}

  // Server error → fallback to localStorage cache
  const vipRaw  = localStorage.getItem(VIP_STORAGE_KEY);
  const adRaw   = localStorage.getItem(AD_REWARD_STORAGE_KEY);
  const vipMs   = vipRaw ? parseInt(vipRaw, 10) : 0;
  const adMs    = adRaw  ? parseInt(adRaw,  10) : 0;
  const isVip   = !isNaN(vipMs) && vipMs > Date.now();
  const isAdPass = !isNaN(adMs)  && adMs  > Date.now();
  return {
    isLoggedIn:   true,
    isAdmin:      false,
    isVip,
    isAdPass,
    hasProAccess: isVip || isAdPass,
    planName:     localStorage.getItem(VIP_PLAN_STORAGE_KEY) || null,
    vipExpiresAt: isVip   ? new Date(vipMs).toISOString() : null,
    adUntil:      isAdPass ? new Date(adMs).toISOString()  : null,
    username:     null,
    ts:           Date.now(),
  };
}

/** Synchronous fast-check using in-memory cache (safe fallback for gatekeeping) */
function hasProAccess() {
  if (_studioCache) return _studioCache.hasProAccess;
  
  // Fast check if user is logged in as Admin in localStorage
  try {
    const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (cu && cu.role && cu.role.toLowerCase() === 'admin') return true;
  } catch (_) {}

  // Fallback: localStorage guest check while async fetch is in flight
  const vipRaw = localStorage.getItem(VIP_STORAGE_KEY);
  const adRaw  = localStorage.getItem(AD_REWARD_STORAGE_KEY);
  const vipMs  = vipRaw ? parseInt(vipRaw, 10) : 0;
  const adMs   = adRaw  ? parseInt(adRaw,  10) : 0;
  return (!isNaN(vipMs) && vipMs > Date.now()) || (!isNaN(adMs) && adMs > Date.now());
}

// ── Time Formatter ───────────────────────────────────────────────────────────
function formatRemainingTime(isoOrMs) {
  let ms;
  if (typeof isoOrMs === 'string') {
    ms = new Date(isoOrMs).getTime() - Date.now();
  } else {
    ms = isoOrMs - Date.now();
  }
  if (ms <= 0) return '0 menit';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days  = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins  = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days  > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${mins}m`;
  return `${mins} mnt`;
}

// ── UI Badge Updater (async) ─────────────────────────────────────────────────
async function updateMembershipBadgeUI() {
  const navBtn      = document.getElementById('btnUserMembership');
  const navText     = document.getElementById('navMembershipText');
  const mobileBtn   = document.getElementById('btnUserMembershipMobile');
  const mobileText  = document.getElementById('navMembershipMobileText');
  const statusTitle = document.getElementById('mstatusTitle');
  const statusInfo  = document.getElementById('mstatusDurationInfo');
  const loginGuard  = document.getElementById('premiumLoginGuard');
  const plansSection = document.getElementById('premiumPlansSection');

  const status = await fetchStudioStatus();

  // ── Show/hide login guard inside modal ──
  if (loginGuard)   loginGuard.style.display   = status.isLoggedIn ? 'none' : 'block';
  if (plansSection) plansSection.style.display = status.isLoggedIn ? 'block' : 'none';

  if (status.isAdmin) {
    if (navBtn)     navBtn.classList.add('is-vip');
    if (mobileBtn)  mobileBtn.classList.add('is-vip');
    if (navText)    navText.innerHTML = '⚡ ADMIN (Lifetime VIP)';
    if (mobileText) mobileText.innerHTML = '⚡ Admin: Lifetime VIP';
    if (statusTitle) { statusTitle.textContent = '⚡ ADMIN — LIFETIME VIP'; statusTitle.style.color = 'var(--mei-gold)'; }
    if (statusInfo)  statusInfo.textContent = 'Akun Admin mendapatkan akses VIP Studio secara permanen.';

  } else if (status.isVip && status.vipExpiresAt) {
    const timeLeft = formatRemainingTime(status.vipExpiresAt);
    if (navBtn)     navBtn.classList.add('is-vip');
    if (mobileBtn)  mobileBtn.classList.add('is-vip');
    if (navText)    navText.innerHTML = `💎 VIP AKTIF (${timeLeft})`;
    if (mobileText) mobileText.innerHTML = `💎 Status: VIP AKTIF (${timeLeft})`;
    if (statusTitle) { statusTitle.textContent = `💎 ${(status.planName || 'VIP PRO').toUpperCase()} (AKTIF)`; statusTitle.style.color = 'var(--mei-gold)'; }
    if (statusInfo)  statusInfo.textContent = `Masa aktif tersisa: ${timeLeft}. Bebas akses semua fitur & iklan!`;

  } else if (status.isAdPass && status.adUntil) {
    const timeLeft = formatRemainingTime(status.adUntil);
    if (navBtn)     navBtn.classList.remove('is-vip');
    if (mobileBtn)  mobileBtn.classList.remove('is-vip');
    if (navText)    navText.innerHTML = `🎁 AD PASS (${timeLeft})`;
    if (mobileText) mobileText.innerHTML = `🎁 Status: AD PASS AKTIF (${timeLeft})`;
    if (statusTitle) { statusTitle.textContent = '🎁 PASS HADIAH IKLAN AKTIF'; statusTitle.style.color = 'var(--accent-cyan)'; }
    if (statusInfo)  statusInfo.textContent = `Akses PRO sementara aktif. Sisa waktu: ${timeLeft}.`;

  } else if (!status.isLoggedIn) {
    if (navBtn)     navBtn.classList.remove('is-vip');
    if (mobileBtn)  mobileBtn.classList.remove('is-vip');
    if (navText)    navText.innerHTML = '🔐 Login untuk PRO';
    if (mobileText) mobileText.innerHTML = 'Status Akun: Belum Login';
    if (statusTitle) { statusTitle.textContent = 'BELUM LOGIN'; statusTitle.style.color = '#ef4444'; }
    if (statusInfo)  statusInfo.textContent = 'Login ke Hyrost Web untuk mengakses fitur premium Studio.';

  } else {
    if (navBtn)     navBtn.classList.remove('is-vip');
    if (mobileBtn)  mobileBtn.classList.remove('is-vip');
    if (navText)    navText.innerHTML = 'Free (Upgrade PRO)';
    if (mobileText) mobileText.innerHTML = 'Status Akun: Free (Upgrade PRO)';
    if (statusTitle) { statusTitle.textContent = 'FREE EDITION (GRATIS)'; statusTitle.style.color = 'var(--accent-cyan)'; }
    if (statusInfo)  statusInfo.textContent = 'Tonton iklan untuk pass gratis atau upgrade ke VIP PRO';
  }
}

// ─── Modal Open/Close Controllers ────────────────────────────────────────────
function openPremiumModal() {
  if (typeof closeRewardedAdModal === 'function') closeRewardedAdModal();
  updateMembershipBadgeUI(); // async refresh inside modal
  const modal = document.getElementById('premiumModalOverlay');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.classList.add('active');
  }
  playAudioFx('pop');
}

function closePremiumModal() {
  const modal = document.getElementById('premiumModalOverlay');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
    modal.classList.remove('active');
  }
  playAudioFx('pop');
}

// ── Midtrans Snap Loader (loads Snap.js once on demand) ──────────────────────
let _snapJsLoaded  = false;
let _snapJsLoading = false;
let _snapConfig    = null;

async function loadMidtransConfig() {
  if (_snapConfig && _snapConfig.midtransClientKey) return _snapConfig;
  try {
    const { ok, data } = await studioApiFetch('config', { method: 'GET' });
    if (ok && data.success) {
      _snapConfig = data;
      return data;
    }
  } catch (_) {}
  return null;
}

async function loadSnapJs() {
  if (typeof window.snap !== 'undefined') {
    _snapJsLoaded = true;
    return true;
  }
  if (_snapJsLoaded) return true;
  if (_snapJsLoading) {
    // Wait for ongoing load
    await new Promise(resolve => {
      let count = 0;
      const check = setInterval(() => {
        count++;
        if (_snapJsLoaded || !_snapJsLoading || count > 50) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
    return (typeof window.snap !== 'undefined') || _snapJsLoaded;
  }

  _snapJsLoading = true;
  const config = await loadMidtransConfig();
  if (!config || !config.midtransClientKey) {
    _snapJsLoading = false;
    return false;
  }
  if (config.enabled === false) {
    _snapJsLoading = false;
    return false;
  }

  return new Promise(resolve => {
    const existing = document.querySelector(`script[src*="snap.js"]`);
    if (existing && typeof window.snap !== 'undefined') {
      _snapJsLoaded = true;
      _snapJsLoading = false;
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'midtrans-snap-script';
    script.src = config.snapJsUrl;
    script.setAttribute('data-client-key', config.midtransClientKey);
    script.type = 'text/javascript';
    script.onload  = () => { _snapJsLoaded = true;  _snapJsLoading = false; resolve(true); };
    script.onerror = () => { _snapJsLoaded = false; _snapJsLoading = false; resolve(false); };
    document.head.appendChild(script);
  });
}

// ── Confetti Particle Burst Animation ────────────────────────────────────────
function triggerConfettiBurst() {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-overlay-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#38bdf8', '#ffd700', '#a855f7'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2 - 50,
      w: Math.random() * 9 + 5,
      h: Math.random() * 5 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      gravity: 0.35,
      drag: 0.96,
    });
  }

  let startTime = Date.now();
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.vx *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0 && p.y < canvas.height + 50) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (alive && Date.now() - startTime < 3500) {
      requestAnimationFrame(render);
    } else {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  }

  requestAnimationFrame(render);
}

// ── Payment Modal Controllers ────────────────────────────────────────────────
function showPaymentSuccessModal(details = {}) {
  const modal = document.getElementById('paymentSuccessModalOverlay');
  if (!modal) return;

  const orderId = details.orderId || 'studio-' + Date.now();
  const planLabel = details.planLabel || (details.plan && details.plan.label) || 'Mei Labs VIP PRO';
  const amountStr = details.amountFormatted || (details.amount ? `Rp ${Number(details.amount).toLocaleString('id-ID')}` : 'Rp 25.000');
  const paymentType = details.paymentType || 'Midtrans Snap (QRIS / VA / E-Wallet)';
  const username = (getCurrentUser() && getCurrentUser().username) || 'Member';

  // Calculate formatted date & expiry date
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  
  let expiryDateStr = 'Aktif Sesuai Paket';
  if (details.expiryDate) {
    const exp = new Date(details.expiryDate);
    expiryDateStr = exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  } else if (details.planDays) {
    const exp = new Date(Date.now() + details.planDays * 24 * 60 * 60 * 1000);
    expiryDateStr = exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  }

  if (document.getElementById('receiptOrderId')) document.getElementById('receiptOrderId').textContent = orderId;
  if (document.getElementById('receiptPlanName')) document.getElementById('receiptPlanName').textContent = planLabel;
  if (document.getElementById('receiptUsername')) document.getElementById('receiptUsername').textContent = username;
  if (document.getElementById('receiptPaymentType')) document.getElementById('receiptPaymentType').textContent = paymentType;
  if (document.getElementById('receiptDate')) document.getElementById('receiptDate').textContent = dateStr;
  if (document.getElementById('receiptExpiryDate')) document.getElementById('receiptExpiryDate').textContent = expiryDateStr;
  if (document.getElementById('receiptTotalAmount')) document.getElementById('receiptTotalAmount').textContent = amountStr;

  modal.style.display = 'flex';
  playAudioFx('chime');
  triggerConfettiBurst();
}

function closePaymentSuccessModal() {
  const modal = document.getElementById('paymentSuccessModalOverlay');
  if (modal) modal.style.display = 'none';
  playAudioFx('pop');
}

function showPaymentPendingModal() {
  const modal = document.getElementById('paymentPendingModalOverlay');
  if (modal) modal.style.display = 'flex';
  playAudioFx('pop');
}

function closePaymentPendingModal() {
  const modal = document.getElementById('paymentPendingModalOverlay');
  if (modal) modal.style.display = 'none';
  playAudioFx('pop');
}

function copyReceiptOrderId() {
  const el = document.getElementById('receiptOrderId');
  if (!el) return;
  const id = el.textContent || el.innerText;
  navigator.clipboard.writeText(id).then(() => {
    if (typeof showToast === 'function') showToast('📋 Nomor Order ID berhasil disalin!');
  }).catch(() => {
    if (typeof showToast === 'function') showToast('Gagal menyalin Order ID');
  });
}

// ── Check URL Callback when redirected from Midtrans ─────────────────────────
async function checkUrlPaymentCallback() {
  try {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const orderId = params.get('order_id');
    const transactionStatus = params.get('transaction_status');
    const statusCode = params.get('status_code');

    if (!payment && !orderId && !transactionStatus) return;

    // Clean up URL without refresh
    const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

    if (payment === 'success' || transactionStatus === 'settlement' || transactionStatus === 'capture' || statusCode === '200') {
      _studioCache = null; // Invalidate cache
      const status = await fetchStudioStatus();
      await updateMembershipBadgeUI();

      showPaymentSuccessModal({
        orderId: orderId || `studio-order-${Date.now()}`,
        planLabel: status.planName || 'Mei Labs VIP PRO',
        expiryDate: status.vipExpiresAt,
        amountFormatted: 'Lunas via Midtrans',
        paymentType: 'Midtrans Online Payment',
      });

    } else if (payment === 'pending' || transactionStatus === 'pending') {
      showPaymentPendingModal();
    } else if (payment === 'error' || transactionStatus === 'deny' || transactionStatus === 'expire' || transactionStatus === 'cancel') {
      if (typeof showToast === 'function') showToast('❌ Pembayaran dibatalkan atau kedaluwarsa.');
    }
  } catch (err) {
    console.warn('[checkUrlPaymentCallback]', err);
  }
}

// ─── Multi-Gateway Payment Handling (Tripay, Midtrans, Manual Transfer) ──────
let _activePollingInterval = null;

function switchPaymentGatewayTab(tabKey) {
  const tabBtns = {
    auto: document.getElementById('tabBtnAutoPay'),
    manual: document.getElementById('tabBtnManualPay'),
    redeem: document.getElementById('tabBtnRedeemKey'),
  };
  const tabPanes = {
    auto: document.getElementById('tabContentAutoPay'),
    manual: document.getElementById('tabContentManualPay'),
    redeem: document.getElementById('tabContentRedeemKey'),
  };

  for (const [key, btn] of Object.entries(tabBtns)) {
    if (btn) btn.classList.toggle('active', key === tabKey);
  }
  for (const [key, pane] of Object.entries(tabPanes)) {
    if (pane) pane.style.display = (key === tabKey) ? 'block' : 'none';
  }
}

function closeTripayQrisModal() {
  const modal = document.getElementById('tripayQrisModalOverlay');
  if (modal) modal.style.display = 'none';
  if (_activePollingInterval) {
    clearInterval(_activePollingInterval);
    _activePollingInterval = null;
  }
}

function closeManualTransferModal() {
  const modal = document.getElementById('manualTransferModalOverlay');
  if (modal) modal.style.display = 'none';
}

function copyManualNominal() {
  const el = document.getElementById('manualTotalAmountText');
  if (!el) return;
  const numStr = el.textContent.replace(/[^0-9]/g, '');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(numStr).then(() => {
      if (typeof showToast === 'function') showToast('📋 Nominal Rp ' + parseInt(numStr, 10).toLocaleString('id-ID') + ' disalin!');
    });
  }
}

function copyManualAccount() {
  const el = document.getElementById('manualAccountNumber');
  if (!el) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(el.textContent.trim()).then(() => {
      if (typeof showToast === 'function') showToast('📋 Nomor rekening/HP berhasil disalin!');
    });
  }
}

function startTripayPaymentPolling(orderId, plan) {
  if (_activePollingInterval) clearInterval(_activePollingInterval);

  let attempts = 0;
  _activePollingInterval = setInterval(async () => {
    attempts++;
    if (attempts > 120) { // Berhenti polling setelah 4-5 menit
      clearInterval(_activePollingInterval);
      _activePollingInterval = null;
      return;
    }

    try {
      const { ok, data } = await studioApiFetch(`payment-status/${orderId}`, { method: 'GET' });
      if (ok && data && data.isPaid) {
        clearInterval(_activePollingInterval);
        _activePollingInterval = null;
        closeTripayQrisModal();

        _studioCache = null;
        const status = await fetchStudioStatus();
        await updateMembershipBadgeUI();

        showPaymentSuccessModal({
          orderId: orderId,
          planLabel: plan.label || 'VIP Studio Pass',
          planDays: plan.days || 30,
          amount: plan.priceIdr || 2000,
          amountFormatted: plan.priceFormatted || 'Rp 2.000',
          paymentType: 'Tripay Real-Time QRIS',
          expiryDate: status.vipExpiresAt,
        });
      }
    } catch (_) {}
  }, 2500);
}

// ── Plan Selection → Tripay QRIS / Midtrans Snap ──────────────────────────────
async function selectPremiumPlan(planKey, planName, priceStr) {
  if (!isLoggedIn()) {
    if (typeof showToast === 'function') showToast('🔐 Login dulu ke Hyrost Web untuk membeli paket VIP!');
    setTimeout(() => { window.location.href = '/login'; }, 800);
    return;
  }

  // Tutup modal premium utama
  closePremiumModal();

  if (typeof showToast === 'function') showToast('⏳ Memproses order pembayaran...');

  // Cek konfigurasi gateway
  const { ok: cfgOk, data: cfgData } = await studioApiFetch('config', { method: 'GET' });
  const isTripayEnabled = cfgOk && cfgData && cfgData.tripay && cfgData.tripay.enabled;

  // 1. Prioritaskan Tripay Gateway (Opsi 1: Otomatis QRIS)
  if (isTripayEnabled) {
    const { ok, data } = await studioApiFetch('create-tripay-payment', {
      method: 'POST',
      body: JSON.stringify({ planKey, method: 'QRIS' }),
      timeout: 30000,
    });

    if (ok && data && data.success) {
      const { orderId, qrUrl, qrString, totalAmount, checkoutUrl, plan } = data;

      // Jika ada QR code gambar langsung
      if (qrUrl || qrString) {
        const modal = document.getElementById('tripayQrisModalOverlay');
        const img = document.getElementById('tripayQrisImg');
        const planLbl = document.getElementById('tripayQrisPlanLabel');
        const amtLbl = document.getElementById('tripayQrisAmount');
        const orderLbl = document.getElementById('tripayQrisOrderId');
        const linkBtn = document.getElementById('tripayCheckoutLinkBtn');

        if (img) img.src = qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrString)}`;
        if (planLbl) planLbl.textContent = plan.label;
        if (amtLbl) amtLbl.textContent = `Rp ${totalAmount.toLocaleString('id-ID')}`;
        if (orderLbl) orderLbl.textContent = orderId;
        if (linkBtn && checkoutUrl) {
          linkBtn.href = checkoutUrl;
          linkBtn.style.display = 'inline-flex';
        }

        if (modal) modal.style.display = 'flex';
        startTripayPaymentPolling(orderId, plan);
        return;
      }

      // Jika redirect checkout URL
      if (checkoutUrl) {
        if (typeof showToast === 'function') showToast('🚀 Mengarahkan ke halaman pembayaran Tripay...');
        setTimeout(() => { window.location.href = checkoutUrl; }, 600);
        return;
      }
    }
  }

  // 2. Jika Midtrans aktif, coba Snap; jika Midtrans nonaktif, langsung buka Transfer Manual & QRIS Statis
  const isMidtransEnabled = cfgOk && cfgData && cfgData.midtrans && cfgData.midtrans.enabled;
  if (!isMidtransEnabled) {
    if (typeof showToast === 'function') {
      showToast('💡 Menggunakan metode QRIS Statis & Transfer Manual (0% Fee)...');
    }
    selectManualPlan(planKey, planName, priceStr);
    return;
  }

  await loadSnapJs();

  const { ok: mOk, data: mData } = await studioApiFetch('create-payment', {
    method: 'POST',
    body: JSON.stringify({ planKey }),
    timeout: 30000,
  });

  if (!mOk || !mData || !mData.success) {
    if (typeof showToast === 'function') {
      showToast('💡 Mengalihkan ke opsi QRIS Statis & Transfer Manual...');
    }
    selectManualPlan(planKey, planName, priceStr);
    return;
  }

  const { snapToken, orderId, plan, redirectUrl } = mData;

  if (typeof window.snap !== 'undefined' && typeof window.snap.pay === 'function') {
    try {
      window.snap.pay(snapToken, {
        onSuccess: async function(result) {
          if (typeof showToast === 'function') showToast('⏳ Pembayaran berhasil! Mengaktifkan VIP...');
          _studioCache = null;
          
          let attempts = 0;
          let isCompleted = false;

          const pollStatus = async () => {
            attempts++;
            const { ok: sok, data: sdata } = await studioApiFetch(`payment-status/${orderId}`, { method: 'GET' });
            if (sok && sdata.isPaid) {
              isCompleted = true;
              const status = await fetchStudioStatus();
              await updateMembershipBadgeUI();

              showPaymentSuccessModal({
                orderId: orderId,
                planLabel: plan.label,
                planDays: plan.days,
                amount: plan.priceIdr,
                amountFormatted: plan.priceFormatted,
                paymentType: (result && result.payment_type) ? result.payment_type.toUpperCase() : 'Midtrans Snap',
                expiryDate: status.vipExpiresAt,
              });

            } else if (attempts < 6 && !isCompleted) {
              setTimeout(pollStatus, 1800);
            } else {
              await updateMembershipBadgeUI();
              showPaymentSuccessModal({
                orderId: orderId,
                planLabel: plan.label,
                planDays: plan.days,
                amount: plan.priceIdr,
                amountFormatted: plan.priceFormatted,
                paymentType: 'Midtrans Online Payment',
              });
            }
          };

          setTimeout(pollStatus, 1500);
        },
        onPending: function() {
          showPaymentPendingModal();
        },
        onError: function() {
          if (typeof showToast === 'function') showToast('❌ Pembayaran dibatalkan atau gagal.');
        },
        onClose: function() {
          if (typeof showToast === 'function') showToast('ℹ️ Pembayaran ditutup.');
        },
      });
      return;
    } catch (snapErr) {
      console.warn('[selectPremiumPlan] snap.pay popup error, fallback to redirect:', snapErr);
    }
  }

  if (redirectUrl) {
    if (typeof showToast === 'function') showToast('🚀 Mengarahkan ke halaman pembayaran...');
    setTimeout(() => { window.location.href = redirectUrl; }, 600);
    return;
  }
}

// ── Manual Payment Selection (QRIS Statis & WhatsApp) ────────────────────────
async function selectManualPlan(planKey, planName, priceStr) {
  if (!isLoggedIn()) {
    if (typeof showToast === 'function') showToast('🔐 Login dulu ke Hyrost Web untuk membeli paket VIP!');
    setTimeout(() => { window.location.href = '/login'; }, 800);
    return;
  }

  closePremiumModal();
  if (typeof showToast === 'function') showToast('⏳ Membuat order transfer manual...');

  const { ok, data } = await studioApiFetch('create-manual-payment', {
    method: 'POST',
    body: JSON.stringify({ planKey }),
    timeout: 30000,
  });

  if (!ok || !data || !data.success) {
    if (typeof showToast === 'function') showToast('❌ Gagal membuat order manual: ' + (data?.message || 'Server error'));
    return;
  }

  const modal = document.getElementById('manualTransferModalOverlay');
  const title = document.getElementById('manualPlanTitle');
  const amountTxt = document.getElementById('manualTotalAmountText');
  const bankName = document.getElementById('manualBankName');
  const accNum = document.getElementById('manualAccountNumber');
  const accName = document.getElementById('manualAccountName');
  const waBtn = document.getElementById('manualWaLinkBtn');
  const qrisContainer = document.getElementById('manualQrisImageContainer');
  const qrisImg = document.getElementById('manualQrisImage');

  if (title) title.textContent = data.plan?.label || planName;
  if (amountTxt) amountTxt.textContent = data.totalFormatted || `Rp ${data.totalAmount.toLocaleString('id-ID')}`;
  if (bankName) bankName.textContent = data.bankName || 'BCA / DANA';
  if (accNum) accNum.textContent = data.accountNumber || '08123456789';
  if (accName) accName.textContent = data.accountName || 'Hyrost Admin';
  if (waBtn && data.whatsappUrl) waBtn.href = data.whatsappUrl;

  if (qrisContainer && qrisImg) {
    if (data.qrisImage) {
      qrisImg.src = data.qrisImage;
      qrisContainer.style.display = 'block';
    } else {
      qrisContainer.style.display = 'none';
    }
  }

  if (modal) modal.style.display = 'flex';
}

// ── License Key Redemption ────────────────────────────────────────────────────
async function redeemLicenseKeyInput() {
  const input = document.getElementById('licenseKeyInput');
  if (!input) return;
  const key = input.value.trim().toUpperCase();

  if (!key) {
    if (typeof showToast === 'function') showToast('⚠️ Harap masukkan kode lisensi VIP Anda.');
    input.focus();
    return;
  }

  if (!isLoggedIn()) {
    if (typeof showToast === 'function') showToast('🔐 Login dulu ke Hyrost Web sebelum menukarkan kode lisensi!');
    return;
  }

  // Disable button during request
  const btn = document.getElementById('btnRedeemKey');
  const originalHtml = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memvalidasi...'; }

  const { ok, data } = await studioApiFetch('redeem-key', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });

  if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || 'Tukarkan'; }

  if (ok && data.success) {
    input.value = '';
    _studioCache = null; // invalidate cache
    await updateMembershipBadgeUI();
    playAudioFx('chime');
    if (typeof showToast === 'function') showToast(data.message || '💎 Kode lisensi berhasil ditukarkan!');
    setTimeout(() => closePremiumModal(), 700);
  } else {
    playAudioFx('whoosh');
    if (typeof showToast === 'function') showToast('❌ ' + (data.message || 'Kode lisensi tidak valid atau sudah digunakan.'));
  }
}

// ─── Rewarded Ad Simulation & Feature Unlock ──────────────────────────────────
function openRewardedAdModal(featureName, successCallback) {
  if (hasProAccess()) {
    if (typeof successCallback === 'function') successCallback();
    return;
  }

  pendingRewardCallback = successCallback;
  const modal      = document.getElementById('rewardedAdModalOverlay');
  const claimBtn   = document.getElementById('btnClaimAdReward');
  const claimLabel = document.getElementById('btnClaimAdLabel');
  const claimIcon  = document.getElementById('btnClaimAdIcon');
  const countdownText = document.getElementById('adCountdownText');

  if (!modal) return;

  modal.style.display = 'flex';
  playAudioFx('pop');

  adCountdownSeconds = 5;
  if (claimBtn)   { claimBtn.disabled = true; claimBtn.style.opacity = '0.5'; claimBtn.style.cursor = 'not-allowed'; }
  if (claimIcon)  claimIcon.className  = 'fas fa-lock';
  if (claimLabel) claimLabel.textContent = `Tonton Iklan (${adCountdownSeconds}s)...`;
  if (countdownText) countdownText.textContent = `${adCountdownSeconds}s`;

  if (adTimerInterval) clearInterval(adTimerInterval);

  adTimerInterval = setInterval(() => {
    adCountdownSeconds--;
    if (countdownText) countdownText.textContent = `${Math.max(0, adCountdownSeconds)}s`;
    if (claimLabel)    claimLabel.textContent = adCountdownSeconds > 0 ? `Tonton Iklan (${adCountdownSeconds}s)...` : '🎉 Klaim Akses 1 Jam';

    if (adCountdownSeconds <= 0) {
      clearInterval(adTimerInterval);
      if (claimBtn) { claimBtn.disabled = false; claimBtn.style.opacity = '1'; claimBtn.style.cursor = 'pointer'; }
      if (claimIcon) claimIcon.className = 'fas fa-unlock';
      playAudioFx('chime');
    }
  }, 1000);
}

async function claimAdReward() {
  if (adCountdownSeconds > 0) return;
  if (adTimerInterval) clearInterval(adTimerInterval);

  // ── Logged in: claim via server ──
  if (isLoggedIn()) {
    const { ok, data } = await studioApiFetch('claim-ad-reward', { method: 'POST' });
    if (ok && data.success) {
      _studioCache = null; // invalidate
      await updateMembershipBadgeUI();
      closeRewardedAdModal();
      playAudioFx('chime');
      if (typeof showToast === 'function') showToast(data.message || '🎉 Akses PRO 1 Jam berhasil diaktifkan!');
    } else {
      if (typeof showToast === 'function') showToast('❌ Gagal klaim: ' + (data.message || 'Server error'));
      return;
    }
  } else {
    // ── Guest: localStorage fallback (1-hour pass) ──
    const oneHourMs  = 1 * 60 * 60 * 1000;
    const unlockUntil = Date.now() + oneHourMs;
    localStorage.setItem(AD_REWARD_STORAGE_KEY, unlockUntil.toString());
    _studioCache = null;
    await updateMembershipBadgeUI();
    closeRewardedAdModal();
    playAudioFx('chime');
    if (typeof showToast === 'function') showToast('🎉 Akses PRO 1 Jam aktif (login untuk sinkronisasi ke akun).');
  }

  if (typeof pendingRewardCallback === 'function') {
    const cb = pendingRewardCallback;
    pendingRewardCallback = null;
    setTimeout(cb, 250);
  }
}

function closeRewardedAdModal() {
  if (adTimerInterval) clearInterval(adTimerInterval);
  const modal = document.getElementById('rewardedAdModalOverlay');
  if (modal) modal.style.display = 'none';
  pendingRewardCallback = null;
  playAudioFx('pop');
}

// ── Global Initializer ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateMembershipBadgeUI();
  checkUrlPaymentCallback();
});
window.addEventListener('load', () => {
  checkUrlPaymentCallback();
});


