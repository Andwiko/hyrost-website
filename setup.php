<?php
/**
 * HYROST REALM & MEI LABS — Backend Manager & Auto-Installer v2.0
 * Web-based Server Manager for Pterodactyl / NuraHost environments.
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300);

putenv('HOME=/home/container');
$_ENV['HOME'] = '/home/container';

$containerRoot = '/home/container';
$wwwRoot = '/home/container/www';
$logsDir = $containerRoot . '/logs';
$tmpDir = $containerRoot . '/tmp';
$nodeInstallDir = $containerRoot . '/.nodejs';
$pidFile = $tmpDir . '/backend.pid';
$logFile = $logsDir . '/backend.log';

// Ensure directories exist
@mkdir($logsDir, 0755, true);
@mkdir($tmpDir, 0755, true);
@mkdir($nodeInstallDir, 0755, true);
@mkdir($containerRoot . '/.npm-cache', 0755, true);
@mkdir($containerRoot . '/.npm-logs', 0755, true);

// Create .npmrc if not exists
$npmrcPath = $containerRoot . '/.npmrc';
if (!file_exists($npmrcPath)) {
    @file_put_contents($npmrcPath, "cache=/home/container/.npm-cache\nlogs-dir=/home/container/.npm-logs\nfund=false\naudit=false\n");
}

// Function to auto-download and install standalone Node.js Linux binary
function autoInstallNodeJs($targetDir = '/home/container/.nodejs') {
    $arch = 'x64';
    $uname = php_uname('m');
    if (strpos($uname, 'aarch64') !== false || strpos($uname, 'arm64') !== false) {
        $arch = 'arm64';
    }
    
    $version = '20.18.0';
    $tarball = "node-v{$version}-linux-{$arch}.tar.gz";
    $url = "https://nodejs.org/dist/v{$version}/{$tarball}";
    $tmpTar = "/tmp/{$tarball}";
    
    @mkdir($targetDir, 0755, true);
    
    // Download tarball via cURL or file_get_contents
    $downloaded = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $fp = fopen($tmpTar, 'wb');
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 180);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);
        if ($httpCode === 200 && file_exists($tmpTar) && filesize($tmpTar) > 10000000) {
            $downloaded = true;
        }
    }
    
    if (!$downloaded) {
        $data = @file_get_contents($url);
        if ($data && strlen($data) > 10000000) {
            @file_put_contents($tmpTar, $data);
            $downloaded = true;
        }
    }
    
    if (!$downloaded) {
        return [false, "Gagal mengunduh file Node.js dari {$url}. Silakan cek koneksi server."];
    }
    
    // Extract tarball
    $cmd = "tar -xzf {$tmpTar} -C {$targetDir} --strip-components=1 2>&1";
    $extractOut = shell_exec($cmd);
    @unlink($tmpTar);
    
    $nodeBin = "{$targetDir}/bin/node";
    if (file_exists($nodeBin)) {
        @chmod($nodeBin, 0755);
        if (file_exists("{$targetDir}/bin/npm")) @chmod("{$targetDir}/bin/npm", 0755);
        if (file_exists("{$targetDir}/bin/npx")) @chmod("{$targetDir}/bin/npx", 0755);
        return [true, "✓ Node.js v{$version} ({$arch}) berhasil diunduh dan dipasang ke {$targetDir}!"];
    }
    
    return [false, "Gagal mengekstrak Node.js: " . htmlspecialchars($extractOut ?? '')];
}

// Find Node.js / npm binaries
function findBinary($name) {
    $candidates = [
        "/home/container/.nodejs/bin/{$name}",
        "/usr/local/bin/{$name}",
        "/usr/bin/{$name}",
        "/bin/{$name}",
        "/opt/node/bin/{$name}",
        "/opt/nodejs/bin/{$name}",
        "/home/container/.nvm/versions/node/v20.18.0/bin/{$name}",
        "/home/container/.nvm/versions/node/v18.20.4/bin/{$name}"
    ];
    foreach ($candidates as $path) {
        if (file_exists($path) && (is_executable($path) || @chmod($path, 0755))) {
            return $path;
        }
    }
    
    // Check globs
    $globs = @glob("/home/container/.nvm/versions/node/*/bin/{$name}");
    if (!empty($globs)) {
        foreach ($globs as $path) {
            if (file_exists($path)) return $path;
        }
    }
    
    $which = trim(@shell_exec("which {$name} 2>/dev/null") ?? '');
    if (!empty($which) && file_exists($which)) {
        return $which;
    }
    return null;
}

$nodeBin = findBinary('node');
$npmBin = findBinary('npm');

// Auto-install Node.js if missing
$autoInstallNotice = '';
if (!$nodeBin) {
    list($success, $msg) = autoInstallNodeJs($nodeInstallDir);
    if ($success) {
        $autoInstallNotice = $msg;
        $nodeBin = findBinary('node');
        $npmBin = findBinary('npm');
    } else {
        $autoInstallNotice = $msg;
    }
}

// Ensure PATH contains the node directory
if ($nodeBin) {
    $nodeDir = dirname($nodeBin);
    $currentPath = getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin';
    putenv("PATH={$nodeDir}:{$currentPath}");
    $_ENV['PATH'] = "{$nodeDir}:{$currentPath}";
}

// Check backend process status
function isBackendRunning($pidFile) {
    if (!file_exists($pidFile)) return false;
    $pid = intval(trim(@file_get_contents($pidFile) ?: '0'));
    if ($pid <= 0) return false;
    
    $check = @shell_exec("kill -0 {$pid} 2>&1");
    if ($check === null || trim($check) === '') {
        return $pid;
    }
    $ps = @shell_exec("ps aux 2>/dev/null | grep 'backend/server.js' | grep -v grep");
    if (!empty($ps)) {
        return $pid;
    }
    return false;
}

// Check port 3044 HTTP response
function checkPort3044() {
    $fp = @fsockopen('127.0.0.1', 3044, $errno, $errstr, 1);
    if ($fp) {
        fclose($fp);
        return true;
    }
    return false;
}

$action = $_GET['action'] ?? '';
$message = $autoInstallNotice;
$messageType = empty($autoInstallNotice) ? 'info' : 'success';

// HANDLE ACTIONS
if ($action === 'install-node') {
    list($success, $msg) = autoInstallNodeJs($nodeInstallDir);
    $message = $msg;
    $messageType = $success ? 'success' : 'error';
    $nodeBin = findBinary('node');
    $npmBin = findBinary('npm');
} elseif ($action === 'install') {
    if (!$npmBin) {
        $message = "❌ npm binary tidak ditemukan. Silakan klik 'Download & Pasang Node.js' terlebih dahulu.";
        $messageType = 'error';
    } else {
        $nodeDir = dirname($npmBin);
        $cmd = "cd {$wwwRoot} && export HOME=/home/container && export PATH={$nodeDir}:\$PATH && export NODE_PATH=/home/container/www/node_modules:/home/container/node_modules && {$npmBin} install express cors dotenv jsonwebtoken mysql2 bcryptjs mongoose multer nodemailer qrcode speakeasy midtrans-client --no-audit --no-fund 2>&1";
        $output = shell_exec($cmd);
        
        // Also ensure installed in parent if needed
        @shell_exec("cd {$containerRoot} && export HOME=/home/container && export PATH={$nodeDir}:\$PATH && export NODE_PATH=/home/container/www/node_modules:/home/container/node_modules && {$npmBin} install express cors dotenv jsonwebtoken mysql2 bcryptjs mongoose multer nodemailer qrcode speakeasy midtrans-client --no-audit --no-fund 2>&1");
        
        $message = "✅ Instalasi paket npm selesai!\n\n" . htmlspecialchars($output ?? '');
        $messageType = 'success';
    }
} elseif ($action === 'start' || $action === 'restart') {
    if (!$nodeBin) {
        $message = "❌ node binary tidak ditemukan. Klik 'Download & Pasang Node.js' terlebih dahulu.";
        $messageType = 'error';
    } else {
        $nodeDir = dirname($nodeBin);
        
        // Kill existing process
        $oldPid = intval(trim(@file_get_contents($pidFile) ?: '0'));
        if ($oldPid > 0) {
            @shell_exec("kill -15 {$oldPid} 2>/dev/null || kill -9 {$oldPid} 2>/dev/null");
            @unlink($pidFile);
            sleep(1);
        }
        @shell_exec("pkill -f 'backend/server.js' 2>/dev/null");
        
        // Start backend in background with explicit NODE_PATH
        $startCmd = "cd {$wwwRoot} && export HOME=/home/container && export PATH={$nodeDir}:\$PATH && export NODE_PATH=/home/container/www/node_modules:/home/container/node_modules && nohup {$nodeBin} backend/server.js >> {$logFile} 2>&1 & echo $!";
        $newPid = trim(shell_exec($startCmd) ?? '');
        
        if (!empty($newPid) && intval($newPid) > 0) {
            file_put_contents($pidFile, $newPid);
            sleep(2);
            $isRunning = isBackendRunning($pidFile) || checkPort3044();
            if ($isRunning) {
                $message = "🚀 Backend Node.js BERHASIL DINYALAKAN (PID: {$newPid}) di Port 3044!";
                $messageType = 'success';
            } else {
                $message = "⚠️ Backend dijalankan (PID: {$newPid}), silakan cek apakah port 3044 sudah merespon di log bawah.";
                $messageType = 'warning';
            }
        } else {
            $message = "❌ Gagal menjalankan perintah startup Node.js.";
            $messageType = 'error';
        }
    }
} elseif ($action === 'stop') {
    $pid = intval(trim(@file_get_contents($pidFile) ?: '0'));
    if ($pid > 0) {
        @shell_exec("kill -15 {$pid} 2>/dev/null || kill -9 {$pid} 2>/dev/null");
    }
    @shell_exec("pkill -f 'backend/server.js' 2>/dev/null");
    @unlink($pidFile);
    $message = "🛑 Backend Node.js telah dihentikan.";
    $messageType = 'info';
}

// Current status
$runningPid = isBackendRunning($pidFile);
$port3044Ok = checkPort3044();
$isExpressInstalled = file_exists($wwwRoot . '/node_modules/express') || file_exists($containerRoot . '/node_modules/express');

// Auto-start if ready and not running
if (!$runningPid && !$port3044Ok && $isExpressInstalled && empty($action) && $nodeBin) {
    $nodeDir = dirname($nodeBin);
    $startCmd = "cd {$wwwRoot} && export HOME=/home/container && export PATH={$nodeDir}:\$PATH && export NODE_PATH=/home/container/www/node_modules:/home/container/node_modules && nohup {$nodeBin} backend/server.js >> {$logFile} 2>&1 & echo $!";
    $newPid = trim(shell_exec($startCmd) ?? '');
    if (!empty($newPid) && intval($newPid) > 0) {
        file_put_contents($pidFile, $newPid);
        sleep(2);
        $runningPid = isBackendRunning($pidFile);
        $port3044Ok = checkPort3044();
    }
}

// Fetch logs
$lastLogs = '';
if (file_exists($logFile)) {
    $lines = @file($logFile);
    if ($lines) {
        $lastLogs = implode('', array_slice($lines, -40));
    }
}

$nodeVersionStr = $nodeBin ? trim(@shell_exec("{$nodeBin} -v 2>/dev/null") ?: 'v20.18.0') : '';
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hyrost Backend Manager &amp; Installer</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: rgba(255, 255, 255, 0.08);
      --accent-blue: #38bdf8;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-red: #ef4444;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .container {
      width: 100%;
      max-width: 820px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .header p {
      color: var(--text-muted);
      margin-top: 6px;
      font-size: 0.95rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .status-badge.online {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: var(--accent-emerald);
    }
    .status-badge.offline {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: var(--accent-red);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin: 18px 0;
    }
    .stat-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 14px 16px;
      border-radius: 12px;
    }
    .stat-item .label {
      font-size: 0.78rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .stat-item .value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      margin-top: 4px;
      font-family: monospace;
      word-break: break-all;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 22px;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #fff;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #0369a1, #075985);
      transform: translateY(-1px);
    }
    .btn-success {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }
    .btn-success:hover {
      background: linear-gradient(135deg, #059669, #047857);
      transform: translateY(-1px);
    }
    .btn-warning {
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #fff;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--text);
    }
    .alert {
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.92rem;
      line-height: 1.5;
      white-space: pre-wrap;
      font-family: monospace;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
    }
    .alert-warning {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }
    .logs-box {
      background: #050811;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 10px;
      padding: 14px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.8rem;
      color: #94a3b8;
      max-height: 280px;
      overflow-y: auto;
      white-space: pre-wrap;
      line-height: 1.45;
    }
    .quick-links {
      text-align: center;
      margin-top: 14px;
    }
    .quick-links a {
      color: var(--accent-blue);
      text-decoration: none;
      font-size: 0.9rem;
      margin: 0 10px;
      font-weight: 600;
    }
    .quick-links a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><i class="fas fa-server" style="color:var(--accent-blue);"></i> Hyrost Backend Manager</h1>
      <p>Panel Kontrol &amp; Pengelola Node.js Port 3044</p>
    </div>

    <?php if (!empty($message)): ?>
      <div class="alert alert-<?= $messageType ?>">
        <?= $message ?>
      </div>
    <?php endif; ?>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <h2 style="font-size:1.15rem; color:#fff;">Status Backend Server</h2>
        <?php if ($port3044Ok): ?>
          <span class="status-badge online"><i class="fas fa-circle-check"></i> ONLINE (Port 3044 Aktif)</span>
        <?php else: ?>
          <span class="status-badge offline"><i class="fas fa-circle-xmark"></i> OFFLINE (Port 3044 Mati)</span>
        <?php endif; ?>
      </div>

      <div class="grid">
        <div class="stat-item">
          <div class="label">Status Node.js</div>
          <div class="value" style="color:<?= $nodeBin ? 'var(--accent-emerald)' : 'var(--accent-red)' ?>;">
            <?= $nodeBin ? "✓ Terpasang ({$nodeVersionStr})" : '✗ Belum Terpasang' ?>
          </div>
        </div>
        <div class="stat-item">
          <div class="label">Modul Express (node_modules)</div>
          <div class="value" style="color:<?= $isExpressInstalled ? 'var(--accent-emerald)' : 'var(--accent-red)' ?>;">
            <?= $isExpressInstalled ? '✓ Siap (Terinstall)' : '✗ Belum Diinstall' ?>
          </div>
        </div>
        <div class="stat-item">
          <div class="label">PID Proses Node.js</div>
          <div class="value"><?= $runningPid ? "PID #{$runningPid}" : 'Tidak Aktif' ?></div>
        </div>
        <div class="stat-item">
          <div class="label">Port 3044 (Reverse Proxy)</div>
          <div class="value" style="color:<?= $port3044Ok ? 'var(--accent-emerald)' : 'var(--accent-red)' ?>;">
            <?= $port3044Ok ? '127.0.0.1:3044 (OK)' : 'Connection Refused (502)' ?>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <?php if (!$nodeBin): ?>
          <a href="setup.php?action=install-node" class="btn btn-warning">
            <i class="fas fa-cube"></i> Unduh &amp; Pasang Node.js v20 Otomatis
          </a>
        <?php else: ?>
          <a href="setup.php?action=start" class="btn btn-primary">
            <i class="fas fa-play"></i> Nyalakan / Restart Backend
          </a>
          <a href="setup.php?action=install" class="btn btn-success">
            <i class="fas fa-download"></i> Install Semua Dependensi (npm)
          </a>
        <?php endif; ?>
        <?php if ($runningPid): ?>
          <a href="setup.php?action=stop" class="btn btn-danger" onclick="return confirm('Hentikan backend server?')">
            <i class="fas fa-stop"></i> Matikan
          </a>
        <?php endif; ?>
        <a href="setup.php" class="btn btn-outline">
          <i class="fas fa-rotate"></i> Refresh Status
        </a>
      </div>
    </div>

    <div class="card">
      <h3 style="font-size:1rem; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <i class="fas fa-terminal" style="color:var(--text-muted);"></i> Log Terakhir Server Backend (backend.log)
      </h3>
      <div class="logs-box"><?= !empty($lastLogs) ? htmlspecialchars($lastLogs) : 'Belum ada catatan log. Klik "Nyalakan / Restart Backend" untuk memulai.' ?></div>
    </div>

    <div class="quick-links">
      <a href="/modules/admin.html" target="_blank"><i class="fas fa-shield-alt"></i> Buka Admin Panel</a>
      <a href="/bot/skin.html" target="_blank"><i class="fas fa-cube"></i> Buka 3D Skin Studio</a>
      <a href="/" target="_blank"><i class="fas fa-home"></i> Beranda Hyrost</a>
    </div>
  </div>
</body>
</html>
