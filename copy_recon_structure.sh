#!/bin/bash

# Script to copy Test folder structure to all 6 recon target folders
# Run from: /home/khanhromvn/Documents/Coding/Systema & Phantoma - Combo Https And Hacking/Phantoma - Server Reversing & Hacking

set -e

RECON_DIR="src/renderer/src/features/Tool/components/WorkspaceSection/Recon"
TEST_DIR="$RECON_DIR/Test"

# List of target folders
TARGETS=("Domain" "IPServer" "Website" "Organization" "Person" "SourceCode")

for target in "${TARGETS[@]}"; do
    TARGET_DIR="$RECON_DIR/$target"
    echo "Processing $target..."
    
    # Skip if target already exists (to avoid overwriting)
    if [ -d "$TARGET_DIR" ]; then
        echo "  $target already exists, skipping..."
        continue
    fi
    
    # Copy entire Test folder structure
    cp -r "$TEST_DIR" "$TARGET_DIR"
    
    # Remove .gitkeep if any
    rm -f "$TARGET_DIR/.gitkeep" 2>/dev/null || true
    
    # Rename ServerPanel.tsx to ${target}Panel.tsx
    if [ -f "$TARGET_DIR/ServerPanel.tsx" ]; then
        mv "$TARGET_DIR/ServerPanel.tsx" "$TARGET_DIR/${target}Panel.tsx"
        # Update component name inside file
        sed -i 's/export function ServerPanel/export function '"${target}"'Panel/g' "$TARGET_DIR/${target}Panel.tsx"
        sed -i 's/interface ServerPanelProps/interface '"${target}"'PanelProps/g' "$TARGET_DIR/${target}Panel.tsx"
    fi
    
    # Rename ServerTargetList.tsx to ${target}TargetList.tsx
    if [ -f "$TARGET_DIR/ServerTargetList.tsx" ]; then
        mv "$TARGET_DIR/ServerTargetList.tsx" "$TARGET_DIR/${target}TargetList.tsx"
        # Update component name inside file
        sed -i 's/export function ServerTargetList/export function '"${target}"'TargetList/g' "$TARGET_DIR/${target}TargetList.tsx"
    fi
    
    echo "  Done: $target"
done

echo "All folders processed successfully."