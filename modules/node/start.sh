#!/usr/bin/env bash
sed -i 's/\r$//' "$0" 2>/dev/null || true
set -euo pipefail

# Color definitions
BLUE='\033[0;34m'; BOLD_BLUE='\033[1;34m'
GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'
NC='\033[0m'

header() {
  echo -e "${BLUE}───────────────────────────────────────────────${NC}"
  echo -e "${BOLD_BLUE}[NodeJS Backend] $1${NC}"
}

NODE_STATUS="${NODE_STATUS:-true}"
NODE_LOG_FILE="${NODE_LOG_FILE:-/home/container/logs/backend.log}"
NODE_PID_FILE="${NODE_PID_FILE:-/home/container/tmp/backend.pid}"
NODE_APP_DIR="${NODE_APP_DIR:-/home/container/www}"

# Node.js version to auto-install if not found
NODE_VERSION="${NODE_VERSION:-20.18.0}"
NODE_INSTALL_DIR="/home/container/.nodejs"

enabled() { [[ "$1" =~ ^(true|1)$ ]]; }

if ! enabled "$NODE_STATUS"; then
  echo -e "${YELLOW}[NodeJS] NODE_STATUS disabled, skipping.${NC}"
  exit 0
fi

header "Starting Node.js Backend Server"

# ─── FIX: Ensure HOME is writable (Pterodactyl sets HOME=/nonexistent) ─────
export HOME="/home/container"
mkdir -p "$HOME/.npm" "$HOME/tmp" "$HOME/logs" 2>/dev/null || true

# ─── FIX: Create .npmrc to redirect npm cache/logs to writable paths ───────
if [[ ! -f "$HOME/.npmrc" ]] || ! grep -q 'cache=' "$HOME/.npmrc" 2>/dev/null; then
  cat > "$HOME/.npmrc" <<'NPMRC'
cache=/home/container/.npm-cache
logs-dir=/home/container/.npm-logs
fund=false
audit=false
NPMRC
  echo -e "${GREEN}[NodeJS] ✓ Created .npmrc with writable cache/log paths${NC}"
fi
mkdir -p /home/container/.npm-cache /home/container/.npm-logs 2>/dev/null || true

# ─── Find or Install Node.js ─────────────────────────────────────────────────
NODE_BIN=""

find_node() {
  # 1. Try PATH
  if command -v node >/dev/null 2>&1; then
    echo "$(command -v node)"; return
  fi
  # 2. Try known paths
  local paths=(
    "/usr/local/bin/node" "/usr/bin/node"
    "/opt/node/bin/node" "/opt/nodejs/bin/node"
    "${NODE_INSTALL_DIR}/bin/node"
    "/home/container/.nvm/versions/node/$(ls /home/container/.nvm/versions/node/ 2>/dev/null | tail -1)/bin/node"
  )
  for p in "${paths[@]}"; do
    [[ -x "$p" ]] && echo "$p" && return
  done
  # 3. Glob nvm versions
  for p in /home/container/.nvm/versions/node/*/bin/node; do
    [[ -x "$p" ]] && echo "$p" && return
  done
  echo ""
}

NODE_BIN="$(find_node)"

# ─── Auto-install Node.js if not found ───────────────────────────────────────
if [[ -z "$NODE_BIN" ]]; then
  echo -e "${YELLOW}[NodeJS] Node.js not found. Installing Node.js v${NODE_VERSION}...${NC}"

  ARCH="x64"
  # Detect ARM
  if uname -m | grep -q 'aarch64\|arm64'; then
    ARCH="arm64"
  fi

  NODE_TARBALL="node-v${NODE_VERSION}-linux-${ARCH}.tar.gz"
  NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}"

  mkdir -p "$NODE_INSTALL_DIR"
  mkdir -p /home/container/logs /home/container/tmp

  echo -e "${YELLOW}[NodeJS] Downloading from ${NODE_URL}...${NC}"

  # Try wget first, then curl
  if command -v wget >/dev/null 2>&1; then
    wget -q --show-progress -O "/tmp/${NODE_TARBALL}" "$NODE_URL" 2>&1 || {
      echo -e "${RED}[NodeJS] wget failed.${NC}"
    }
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "/tmp/${NODE_TARBALL}" "$NODE_URL" || {
      echo -e "${RED}[NodeJS] curl failed.${NC}"
    }
  else
    echo -e "${RED}[NodeJS] Neither wget nor curl available. Cannot install Node.js.${NC}"
    exit 0
  fi

  if [[ -f "/tmp/${NODE_TARBALL}" ]]; then
    echo -e "${YELLOW}[NodeJS] Extracting Node.js...${NC}"
    tar -xzf "/tmp/${NODE_TARBALL}" -C "$NODE_INSTALL_DIR" --strip-components=1 2>/dev/null || {
      echo -e "${RED}[NodeJS] Extraction failed.${NC}"
      exit 0
    }
    rm -f "/tmp/${NODE_TARBALL}"
    echo -e "${GREEN}[NodeJS] ✓ Node.js installed to ${NODE_INSTALL_DIR}${NC}"
  else
    echo -e "${RED}[NodeJS] Download failed. Cannot start backend.${NC}"
    exit 0
  fi

  # Try again after install
  NODE_BIN="$(find_node)"
fi

if [[ -z "$NODE_BIN" ]]; then
  echo -e "${RED}[NodeJS] ✗ Node.js could not be found or installed.${NC}"
  exit 0
fi

# Export PATH so node/npm work from now on
export PATH="$(dirname "$NODE_BIN"):$PATH"

echo -e "${GREEN}[NodeJS] ✓ Node: ${NODE_BIN}${NC}"
echo -e "${GREEN}[NodeJS] ✓ Version: $("$NODE_BIN" --version 2>/dev/null)${NC}"

# ─── Pull latest code from git ────────────────────────────────────────────────
cd "$NODE_APP_DIR"
if command -v git >/dev/null 2>&1 && [[ -d ".git" ]]; then
  echo -e "${YELLOW}[NodeJS] Pulling latest code from git...${NC}"
  # FIX: Reset any local conflicts first, then pull
  git checkout -- . 2>/dev/null || true
  git clean -fd 2>/dev/null || true
  git pull --ff-only 2>&1 | tail -3 || echo -e "${YELLOW}[NodeJS] git pull skipped (no changes or auth issue).${NC}"
fi

# ─── Install npm dependencies ─────────────────────────────────────────────────
NPM_BIN="$(dirname "$NODE_BIN")/npm"

# FIX: Always verify express is installed, not just check if node_modules exists
install_deps() {
  if [[ ! -x "$NPM_BIN" ]]; then
    echo -e "${RED}[NodeJS] npm binary not found at $NPM_BIN${NC}"
    return 1
  fi

  local need_install=false

  # Check 1: node_modules directory doesn't exist
  if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}[NodeJS] node_modules not found.${NC}"
    need_install=true
  fi

  # Check 2: express module is missing (critical dependency)
  if [[ ! -d "node_modules/express" ]]; then
    echo -e "${YELLOW}[NodeJS] express module missing in node_modules.${NC}"
    need_install=true
  fi

  # Check 3: package-lock.json doesn't exist
  if [[ ! -f "package-lock.json" ]]; then
    echo -e "${YELLOW}[NodeJS] package-lock.json not found.${NC}"
    need_install=true
  fi

  if [[ "$need_install" == "true" ]]; then
    echo -e "${BOLD_BLUE}[NodeJS] Installing npm dependencies...${NC}"

    # Run npm install with HOME set correctly
    HOME="/home/container" "$NPM_BIN" install --production --no-audit --no-fund 2>&1 | tail -10 || {
      echo -e "${RED}[NodeJS] npm install failed in $NODE_APP_DIR. Trying parent directory...${NC}"
      # Fallback: try installing from parent (root package.json)
      if [[ -f "/home/container/package.json" ]]; then
        cd /home/container
        HOME="/home/container" "$NPM_BIN" install --production --no-audit --no-fund 2>&1 | tail -10 || true
        cd "$NODE_APP_DIR"
      fi
    }

    # Final verification
    if [[ -d "node_modules/express" ]]; then
      echo -e "${GREEN}[NodeJS] ✓ Dependencies installed successfully${NC}"
    elif [[ -d "/home/container/node_modules/express" ]]; then
      echo -e "${GREEN}[NodeJS] ✓ Dependencies installed in parent directory${NC}"
    else
      echo -e "${RED}[NodeJS] ✗ express still missing after npm install!${NC}"
      echo -e "${YELLOW}[NodeJS] Attempting direct install of critical packages...${NC}"
      HOME="/home/container" "$NPM_BIN" install express cors dotenv jsonwebtoken mysql2 bcryptjs mongoose multer nodemailer qrcode speakeasy 2>&1 | tail -5 || true
    fi
  else
    echo -e "${GREEN}[NodeJS] ✓ Dependencies already installed${NC}"
  fi
}

install_deps

# ─── Ensure directories ───────────────────────────────────────────────────────
mkdir -p /home/container/logs /home/container/tmp

# ─── Kill previous instance ───────────────────────────────────────────────────
if [[ -f "$NODE_PID_FILE" ]]; then
  old_pid=$(cat "$NODE_PID_FILE" 2>/dev/null || echo "")
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo -e "${YELLOW}[NodeJS] Stopping previous process (PID: $old_pid)...${NC}"
    kill -15 "$old_pid" 2>/dev/null || kill -9 "$old_pid" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$NODE_PID_FILE"
fi

# ─── Check entry file ─────────────────────────────────────────────────────────
if [[ ! -f "backend/server.js" ]]; then
  echo -e "${RED}[NodeJS] ✗ backend/server.js not found in ${NODE_APP_DIR}${NC}"
  exit 0
fi

# ─── Launch backend ───────────────────────────────────────────────────────────
echo -e "${BOLD_BLUE}[NodeJS] Launching backend on port 3044...${NC}"
export NODE_PATH="/home/container/www/node_modules:/home/container/node_modules"
HOME="/home/container" "$NODE_BIN" backend/server.js >> "$NODE_LOG_FILE" 2>&1 &
node_pid=$!
echo "$node_pid" > "$NODE_PID_FILE"

sleep 2

if kill -0 "$node_pid" 2>/dev/null; then
  echo -e "${GREEN}[NodeJS] ✓ Backend running (PID: ${node_pid})${NC}"
  echo -e "${GREEN}[NodeJS] ✓ Port 3044 → proxied by Nginx at /api/${NC}"
else
  echo -e "${RED}[NodeJS] ✗ Backend crashed. Last log:${NC}"
  tail -25 "$NODE_LOG_FILE" 2>/dev/null || true
fi
