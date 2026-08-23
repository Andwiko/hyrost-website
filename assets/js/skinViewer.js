/**
 * Hyrost 3D Minecraft Skin Viewer Wrapper (skinview3d)
 * Provides interactive 3D rendering of Minecraft skins, animations, and cosmetic previews.
 */
(function (global) {
  let skinview3dLoaded = false;
  let activeViewers = new Map();

  function loadSkinview3dLib(callback) {
    if (global.skinview3d) {
      skinview3dLoaded = true;
      if (callback) callback();
      return;
    }
    if (document.getElementById('skinview3d-script')) {
      const existing = document.getElementById('skinview3d-script');
      existing.addEventListener('load', () => {
        skinview3dLoaded = true;
        if (callback) callback();
      });
      return;
    }
    const script = document.createElement('script');
    script.id = 'skinview3d-script';
    script.src = 'https://cdn.jsdelivr.net/npm/skinview3d@3.0.1/bundles/skinview3d.bundle.js';
    script.onload = () => {
      skinview3dLoaded = true;
      if (callback) callback();
    };
    script.onerror = () => {
      console.warn('Could not load external skinview3d bundle, using fallback avatar renderer');
      if (callback) callback(new Error('skinview3d load failed'));
    };
    document.head.appendChild(script);
  }

  function resolveSkinUrl(username, customUrl) {
    if (customUrl && customUrl.startsWith('http')) return customUrl;
    const cleanUser = (username || 'Steve').trim();
    return `https://mineskin.eu/skin/${encodeURIComponent(cleanUser)}`;
  }

  const HyrostSkinViewer = {
    init: (canvasId, options = {}) => {
      const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      if (!canvas) return null;

      const container = canvas.parentElement;
      const width = options.width || (container ? container.clientWidth : 300) || 300;
      const height = options.height || (container ? container.clientHeight : 400) || 400;
      const username = options.username || 'Steve';
      const skinUrl = options.skinUrl || resolveSkinUrl(username);

      loadSkinview3dLib((err) => {
        if (err || !global.skinview3d) {
          // Fallback static 2D preview
          canvas.style.display = 'none';
          if (container && !container.querySelector('.skin-fallback-preview')) {
            const fb = document.createElement('div');
            fb.className = 'skin-fallback-preview';
            fb.style.cssText = 'text-align:center; padding:20px;';
            fb.innerHTML = `
              <img src="https://cravatar.eu/helmbody/${encodeURIComponent(username)}/160.png" alt="${username}" style="filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5)); max-height:220px;" onerror="this.src='https://cravatar.eu/helmbody/Steve/160.png'">
            `;
            container.appendChild(fb);
          }
          return;
        }

        try {
          // Cleanup existing viewer if any
          if (activeViewers.has(canvas)) {
            activeViewers.get(canvas).dispose();
            activeViewers.delete(canvas);
          }

          const skinViewer = new global.skinview3d.SkinViewer({
            canvas: canvas,
            width: width,
            height: height,
            skin: skinUrl
          });

          // Control & Camera setup
          skinViewer.camera.position.set(0, 0, 70);
          skinViewer.controls.enableRotate = true;
          skinViewer.controls.enableZoom = options.enableZoom !== false;
          skinViewer.controls.enablePan = false;

          // Default animation (Idle / Breathing)
          if (options.animation !== false) {
            skinViewer.animation = new global.skinview3d.IdleAnimation();
            skinViewer.animation.speed = 0.8;
          }

          activeViewers.set(canvas, skinViewer);

          if (typeof options.onReady === 'function') {
            options.onReady(skinViewer);
          }
        } catch (e) {
          console.error('Failed to create skinview3d viewer:', e);
        }
      });
    },

    setSkin: (canvasId, usernameOrUrl) => {
      const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      const viewer = activeViewers.get(canvas);
      if (viewer) {
        const url = usernameOrUrl.startsWith('http') ? usernameOrUrl : resolveSkinUrl(usernameOrUrl);
        viewer.loadSkin(url);
      }
    },

    setAnimation: (canvasId, animationType) => {
      const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      const viewer = activeViewers.get(canvas);
      if (!viewer || !global.skinview3d) return;

      switch (animationType) {
        case 'walk':
          viewer.animation = new global.skinview3d.WalkingAnimation();
          viewer.animation.speed = 0.8;
          break;
        case 'run':
          viewer.animation = new global.skinview3d.RunningAnimation();
          viewer.animation.speed = 1.2;
          break;
        case 'wave':
          viewer.animation = new global.skinview3d.WaveAnimation();
          break;
        case 'idle':
        default:
          viewer.animation = new global.skinview3d.IdleAnimation();
          viewer.animation.speed = 0.8;
          break;
      }
    }
  };

  global.HyrostSkinViewer = HyrostSkinViewer;
})(window);
