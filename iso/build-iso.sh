#!/bin/bash
# MasterChef Bootable Live ISO Build Helper (Debian/Ubuntu-based)

echo "=== MasterChef Canteen ISO Build Process ==="
echo "Prerequisites: Ubuntu/Debian environment with 'live-build' or 'cubic' installed."

# Steps summary for generating Live ISO:
# 1. Install live-build: sudo apt-get update && sudo apt-get install -y live-build
# 2. Configure live-build environment:
#    lb config --architectures amd64 --bootloader grub-efi
# 3. Include node.js and application files under config/includes.chroot/opt/masterchef
# 4. Configure auto-start systemd service or kiosk browser mode (Chromium --kiosk http://localhost:3000)
# 5. Build ISO: sudo lb build

echo "ISO construction configuration script initialized."
