/**
 * 3D Blockbench Minecraft Skin & Dynamic Pose Studio Engine
 * Powered by Three.js & skinview3d WebGL
 */

let skinViewer = null;
let currentAnim = null;
let orbitControls = null;

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

document.addEventListener('DOMContentLoaded', () => {
    initSkinStudio();
});

function initSkinStudio() {
    const canvas = document.getElementById('skinCanvas');
    if (!canvas) return;

    // Detect username from URL or localStorage or fallback to andwiko
    let initialUser = getUrlParameter('user') || localStorage.getItem('hyrost_mc_ign') || 'andwiko';
    initialUser = initialUser.replace(/[^a-zA-Z0-9_]/g, '') || 'andwiko';

    document.getElementById('inputMcUsername').value = initialUser;
    document.getElementById('displayPlayerName').innerText = initialUser;

    try {
        skinViewer = new skinview3d.SkinViewer({
            canvas: canvas,
            width: 480,
            height: 480,
            skin: `https://mc-heads.net/skin/${encodeURIComponent(initialUser)}`
        });

        skinViewer.camera.position.x = -15;
        skinViewer.camera.position.y = 10;
        skinViewer.camera.position.z = 35;
        skinViewer.fov = 65;

        orbitControls = skinview3d.createOrbitControls(skinViewer);
        orbitControls.enableRotate = true;
        orbitControls.enableZoom = true;
        orbitControls.enablePan = true;

        // Default pose
        applyBlockbenchPose('samurai');

        setupEventListeners();
    } catch (err) {
        console.error('[SkinStudio] Gagal menginisialisasi 3D WebGL Viewer:', err);
    }
}

function setupEventListeners() {
    // 1. Load Skin button
    document.getElementById('btnLoadSkin')?.addEventListener('click', () => {
        loadUserSkin();
    });

    document.getElementById('inputMcUsername')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUserSkin();
    });

    // 2. Toggle Animation
    document.getElementById('btnToggleAnim')?.addEventListener('click', (e) => {
        if (!skinViewer) return;
        skinViewer.animationPaused = !skinViewer.animationPaused;
        e.target.innerHTML = skinViewer.animationPaused ? '<i class="fas fa-play"></i> Putar Gerak' : '<i class="fas fa-pause"></i> Jeda Gerak';
    });

    // 3. Reset Camera
    document.getElementById('btnResetCam')?.addEventListener('click', () => {
        if (!skinViewer) return;
        skinViewer.camera.position.x = -15;
        skinViewer.camera.position.y = 10;
        skinViewer.camera.position.z = 35;
    });

    // 4. File Upload custom skin
    document.getElementById('fileUploadSkin')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                skinViewer.loadSkin(event.target.result);
                document.getElementById('displayPlayerName').innerText = 'Custom Skin';
            };
            reader.readAsDataURL(file);
        }
    });
}

function loadUserSkin() {
    const rawUser = document.getElementById('inputMcUsername').value.trim() || 'andwiko';
    const cleanUser = rawUser.replace(/[^a-zA-Z0-9_]/g, '') || 'andwiko';
    document.getElementById('displayPlayerName').innerText = cleanUser;

    const skinUrl = `https://mc-heads.net/skin/${encodeURIComponent(cleanUser)}`;
    skinViewer.loadSkin(skinUrl);

    const btnDl = document.getElementById('btnDownloadSkinTex');
    if (btnDl) btnDl.href = skinUrl;
}

function applyBlockbenchPose(poseName) {
    if (!skinViewer) return;

    document.querySelectorAll('.pose-chip').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-pose="${poseName}"]`)?.classList.add('active');

    if (currentAnim) {
        currentAnim.resetAndKeep();
        currentAnim = null;
    }

    // Reset all bone rotations
    skinViewer.playerModel.head.rotation.set(0, 0, 0);
    skinViewer.playerModel.leftArm.rotation.set(0, 0, 0);
    skinViewer.playerModel.rightArm.rotation.set(0, 0, 0);
    skinViewer.playerModel.leftLeg.rotation.set(0, 0, 0);
    skinViewer.playerModel.rightLeg.rotation.set(0, 0, 0);
    skinViewer.playerModel.body.rotation.set(0, 0, 0);

    const toRad = deg => (deg * Math.PI) / 180;

    switch (poseName) {
        case 'samurai':
            // Samurai Katana Stance: Right arm raised swinging katana, left arm balance, bent legs
            skinViewer.playerModel.rightArm.rotation.x = toRad(-110);
            skinViewer.playerModel.rightArm.rotation.y = toRad(-35);
            skinViewer.playerModel.rightArm.rotation.z = toRad(45);
            skinViewer.playerModel.leftArm.rotation.x = toRad(30);
            skinViewer.playerModel.leftArm.rotation.z = toRad(-30);
            skinViewer.playerModel.rightLeg.rotation.x = toRad(-35);
            skinViewer.playerModel.leftLeg.rotation.x = toRad(25);
            skinViewer.playerModel.head.rotation.y = toRad(15);
            skinViewer.playerModel.head.rotation.x = toRad(10);
            break;

        case 'knight':
            // Shield and Sword Stance
            skinViewer.playerModel.leftArm.rotation.x = toRad(-85);
            skinViewer.playerModel.leftArm.rotation.y = toRad(40);
            skinViewer.playerModel.rightArm.rotation.x = toRad(-95);
            skinViewer.playerModel.rightArm.rotation.y = toRad(-20);
            skinViewer.playerModel.leftLeg.rotation.x = toRad(-20);
            skinViewer.playerModel.rightLeg.rotation.x = toRad(20);
            break;

        case 'archer':
            // Bow Aim Stance
            skinViewer.playerModel.leftArm.rotation.x = toRad(-85);
            skinViewer.playerModel.leftArm.rotation.y = toRad(25);
            skinViewer.playerModel.rightArm.rotation.x = toRad(-85);
            skinViewer.playerModel.rightArm.rotation.y = toRad(-45);
            skinViewer.playerModel.head.rotation.y = toRad(-20);
            break;

        case 'ninja':
            // Stealth Ninja Crouch
            skinViewer.playerModel.body.rotation.x = toRad(25);
            skinViewer.playerModel.head.rotation.x = toRad(-25);
            skinViewer.playerModel.rightArm.rotation.x = toRad(45);
            skinViewer.playerModel.leftArm.rotation.x = toRad(45);
            skinViewer.playerModel.rightLeg.rotation.x = toRad(-40);
            skinViewer.playerModel.leftLeg.rotation.x = toRad(30);
            break;

        case 'elytra':
            // Elytra Gliding
            skinViewer.playerModel.body.rotation.x = toRad(75);
            skinViewer.playerModel.head.rotation.x = toRad(-65);
            skinViewer.playerModel.rightArm.rotation.z = toRad(60);
            skinViewer.playerModel.leftArm.rotation.z = toRad(-60);
            skinViewer.playerModel.rightLeg.rotation.x = toRad(10);
            skinViewer.playerModel.leftLeg.rotation.x = toRad(10);
            break;

        case 'running':
            currentAnim = skinViewer.animations.add(skinview3d.RunningAnimation);
            currentAnim.speed = 0.8;
            break;

        case 'walking':
            currentAnim = skinViewer.animations.add(skinview3d.WalkingAnimation);
            currentAnim.speed = 0.6;
            break;

        case 'waving':
            currentAnim = skinViewer.animations.add(skinview3d.WaveAnimation);
            break;

        case 'sitting':
            skinViewer.playerModel.rightLeg.rotation.x = toRad(-90);
            skinViewer.playerModel.leftLeg.rotation.x = toRad(-90);
            skinViewer.playerModel.rightArm.rotation.x = toRad(-30);
            skinViewer.playerModel.leftArm.rotation.x = toRad(-30);
            break;

        case 'mining':
            skinViewer.playerModel.rightArm.rotation.x = toRad(-120);
            skinViewer.playerModel.body.rotation.y = toRad(-15);
            skinViewer.playerModel.head.rotation.x = toRad(15);
            break;

        case 'swimming':
            skinViewer.playerModel.body.rotation.x = toRad(80);
            skinViewer.playerModel.head.rotation.x = toRad(-70);
            skinViewer.playerModel.rightArm.rotation.x = toRad(160);
            skinViewer.playerModel.leftArm.rotation.x = toRad(160);
            break;

        case 'idle':
        default:
            skinViewer.playerModel.rightArm.rotation.x = toRad(-10);
            skinViewer.playerModel.leftArm.rotation.x = toRad(10);
            skinViewer.playerModel.rightLeg.rotation.x = toRad(10);
            skinViewer.playerModel.leftLeg.rotation.x = toRad(-10);
            break;
    }
}

function updateBoneSlider(bone, deg) {
    if (!skinViewer) return;
    const rad = (deg * Math.PI) / 180;
    if (bone === 'head') skinViewer.playerModel.head.rotation.x = rad;
    if (bone === 'rightArm') skinViewer.playerModel.rightArm.rotation.x = rad;
    if (bone === 'leftArm') skinViewer.playerModel.leftArm.rotation.x = rad;
    if (bone === 'rightLeg') skinViewer.playerModel.rightLeg.rotation.x = rad;
    if (bone === 'leftLeg') skinViewer.playerModel.leftLeg.rotation.x = rad;
}

function exportTransparentSnapshot() {
    if (!skinViewer) return;
    skinViewer.render();
    const dataUrl = skinViewer.canvas.toDataURL("image/png");
    const playerName = document.getElementById('inputMcUsername').value.trim() || 'hyrost-skin';
    
    const link = document.createElement('a');
    link.download = `${playerName}-blockbench-pose-4k.png`;
    link.href = dataUrl;
    link.click();
}
