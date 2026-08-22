/**
 * Realtime server status — delegates to HyrostMCServer + optional LiveHub.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (window.HyrostMCServer) {
    HyrostMCServer.init();
  }

  if (window.HyrostLiveHub) {
    window.HyrostLiveHub.init({
      playerCountSelector: '#onlinePlayers, #sidebarOnlinePlayers, #livePlayersCount, #mcServerWidgetPlayers',
      statusDotSelector: '.status-dot, .badge-dot, .mc-sync-dot',
      serverIpSelector: '#ipText, .server-ip, .server-pill-ip, #mcServerWidgetIp, [data-mc-server-ip]',
      intervals: { snapshot: 12000, presence: 20000 },
    });
  }
});
