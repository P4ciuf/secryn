#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Secryn CLI — One-line installer
# -----------------------------------------------------------------------------
# Description: Detects the local Python environment and installs the
#              Secryn CLI (sc) via pipx, pip, or a standalone venv
#              as a fallback.  Creates the config directory with restricted
#              permissions (0700).
# Usage:       ./install.sh
# Dependencies: python3 >= 3.10
# Exit codes:
#   0   Installation completed successfully.
#   1   Python 3.10+ not found or installation method failed.
# -----------------------------------------------------------------------------
set -euo pipefail

APP_NAME="sc"
VERSION="${VERSION:-0.1.0}"
HOME_DIR="${HOME:-$HOME}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME_DIR/.config}/secryn"
INSTALL_DIR="${INSTALL_DIR:-$HOME_DIR/.local/bin}"

RED="\033[31m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RESET="\033[0m"

info()  { echo -e "${BLUE}\342\204\271${RESET} $*"; }
ok()    { echo -e "${GREEN}\342\234\223${RESET} $*"; }
err()   { echo -e "${RED}\342\234\227${RESET} $*"; }
warn()  { echo -e "${YELLOW}\342\232\240${RESET} $*"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_URL="https://github.com/secryn/secryn.git"
CLI_PATH="packages/cli"

# Verify that a supported Python interpreter is available on PATH.
#
# Returns:
#   0 if python3 >= 3.10 is present.
#   Exits with code 1 otherwise.
ensure_python3() {
    if ! command -v python3 &>/dev/null; then
        err "Python 3.10+ is required. Install it from https://python.org"
        exit 1
    fi
    local ver
    ver=$(python3 -c 'import sys; print(sys.version_info[:2] >= (3, 10))')
    if [ "$ver" != "True" ]; then
        err "Python 3.10+ is required (found $(python3 --version))"
        exit 1
    fi
}

# Attempt installation via pipx (preferred method).
# Tries the local source tree first, then falls back to cloning from GitHub.
#
# Returns:
#   0 on success, 1 if pipx is not installed or the install command fails.
install_via_pipx() {
    if ! command -v pipx &>/dev/null; then
        return 1
    fi

    info "Installing via pipx..."

    if [ -d "$SCRIPT_DIR/pyproject.toml" ] 2>/dev/null || [ -f "$SCRIPT_DIR/pyproject.toml" ]; then
        pipx install --force "$SCRIPT_DIR"
    else
        pipx install --force "git+${REPO_URL}#subdirectory=${CLI_PATH}"
    fi

    if command -v "${APP_NAME}" &>/dev/null; then
        ok "Installed via pipx: $($APP_NAME version)"
        return 0
    fi
    return 1
}

# Attempt installation via pip in user mode.
# Falls back to a local venv when the system pip is externally managed
# (PEP 668).
#
# Returns:
#   0 on success, 1 if no pip installation method succeeded.
install_via_pip() {
    info "Installing via pip..."

    if command -v pip3 &>/dev/null; then
        pip3 install --user "$SCRIPT_DIR" 2>/dev/null && return 0
    fi

    python3 -m pip install --user "$SCRIPT_DIR" 2>/dev/null && return 0

    warn "System pip is externally managed (PEP 668). Using a local venv."
    python3 -m venv "$HOME_DIR/.local/share/secryn-cli"
    "$HOME_DIR/.local/share/secryn-cli/bin/pip" install "$SCRIPT_DIR"

    mkdir -p "$INSTALL_DIR"
    ln -sf "$HOME_DIR/.local/share/secryn-cli/bin/sc" "$INSTALL_DIR/sc"
    export PATH="$INSTALL_DIR:$PATH"

    if command -v "${APP_NAME}" &>/dev/null; then
        ok "Installed in local venv: $($APP_NAME version)"
        return 0
    fi
    return 1
}

# Standalone install into an isolated virtual environment.
# Used when neither pipx nor pip (user mode) is available.
install_via_venv() {
    info "Creating a virtual environment for Secryn CLI..."
    local venv_dir="$HOME_DIR/.local/share/secryn-cli"

    python3 -m venv "$venv_dir"
    "$venv_dir/bin/pip" install --quiet "$SCRIPT_DIR"

    mkdir -p "$INSTALL_DIR"
    ln -sf "$venv_dir/bin/sc" "$INSTALL_DIR/sc"

    export PATH="$INSTALL_DIR:$PATH"

    if command -v "${APP_NAME}" &>/dev/null; then
        ok "Installed: $($APP_NAME version)"
    else
        warn "Installed to $venv_dir/bin/sc"
        warn "Add $INSTALL_DIR to your PATH:"
        warn "  export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
}

# Entry point: ensure prerequisites exist, then pick the best installation
# strategy available on this system.
main() {
    echo ""
    info "Secryn CLI installer v${VERSION}"
    echo ""

    ensure_python3

    mkdir -p "${CONFIG_DIR}"
    chmod 700 "${CONFIG_DIR}" 2>/dev/null || true

    if command -v pipx &>/dev/null; then
        install_via_pipx || install_via_venv
    elif pip3 install --user --dry-run "$SCRIPT_DIR" &>/dev/null 2>&1; then
        install_via_pip || install_via_venv
    else
        install_via_venv
    fi

    echo ""
    ok "Installation complete!"
    echo ""
    info "Run '${APP_NAME} --help' to get started."
    info "Config directory: ${CONFIG_DIR}/"
    echo ""
}

main "$@"
