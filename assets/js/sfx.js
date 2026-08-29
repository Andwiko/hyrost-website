/**
 * Hyrost Realm — Interactive Web Audio SFX Engine
 * Lightweight procedural sound synthesis with zero external MP3 dependencies.
 */
(function (global) {
  let audioCtx = null;
  const STORAGE_KEY = 'hyrost_sfx_muted';
  let isMuted = localStorage.getItem(STORAGE_KEY) === 'true';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Ensure AudioContext starts on first user interaction
  document.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }, { once: true });

  const SFX = {
    isMuted: () => isMuted,
    
    toggleMute: () => {
      isMuted = !isMuted;
      localStorage.setItem(STORAGE_KEY, isMuted ? 'true' : 'false');
      SFX.updateMuteButtons();
      if (!isMuted) {
        SFX.playClick();
      }
      return isMuted;
    },

    setMuted: (muted) => {
      isMuted = !!muted;
      localStorage.setItem(STORAGE_KEY, isMuted ? 'true' : 'false');
      SFX.updateMuteButtons();
    },

    // 1. Snappy UI Button Click
    playClick: () => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } catch (e) {}
    },

    // 2. Experience Orb Pickup (Coin Gain / Chime)
    playOrb: () => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
          
          gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.15);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.06);
          osc.stop(ctx.currentTime + idx * 0.06 + 0.15);
        });
      } catch (e) {}
    },

    // 3. Quest Complete / Level Up Fanfare
    playLevelUp: () => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
          
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.28);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.09);
          osc.stop(ctx.currentTime + idx * 0.09 + 0.28);
        });
      } catch (e) {}
    },

    // 4. Mystery Box / Chest Opening Sound
    playChest: () => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        // Low rumble opening
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(120, ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.18);
        gain1.gain.setValueAtTime(0.2, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.2);

        // High sparkle reward
        setTimeout(() => {
          SFX.playOrb();
        }, 160);
      } catch (e) {}
    },

    // 5. Cosmetic Equip Snap
    playEquip: () => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch (e) {}
    },

    // Update UI Mute Button Icons
    updateMuteButtons: () => {
      document.querySelectorAll('.sfx-mute-toggle').forEach(btn => {
        btn.innerHTML = isMuted 
          ? '<i class="fas fa-volume-mute" style="color:var(--text-dim, #888);"></i>' 
          : '<i class="fas fa-volume-up" style="color:var(--accent-cyan, #06b6d4);"></i>';
        btn.title = isMuted ? 'Nyalakan Efek Suara' : 'Matikan Efek Suara';
      });
    },

    initAutoHooks: () => {
      SFX.updateMuteButtons();
      
      // Attach click SFX to buttons & interactive elements
      document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .nav-item, .inv-tab-btn, .btn-header-action, .btn-primary-action');
        if (target && !target.classList.contains('no-sfx') && !target.classList.contains('sfx-mute-toggle')) {
          SFX.playClick();
        }
      });
    }
  };

  global.HyrostSFX = SFX;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SFX.initAutoHooks());
  } else {
    SFX.initAutoHooks();
  }
})(window);
