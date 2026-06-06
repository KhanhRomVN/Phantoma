#!/bin/bash

# Script to force copy Test folder structure to all 6 recon target folders
# Run from: /home/khanhromvn/Documents/Coding/Systema & Phantoma - Combo Https And Hacking/Phantoma - Server Reversing & Hacking

set -e

RECON_DIR="src/renderer/src/features/Tool/components/WorkspaceSection/Recon"
TEST_DIR="$RECON_DIR/Test"

# List of target folders
TARGETS=("Domain" "IPServer" "Website" "Organization" "Person" "SourceCode")

for target in "${TARGETS[@]}"; do
    TARGET_DIR="$RECON_DIR/$target"
    echo "Processing $target..."
    
    # Copy entire Test folder structure (force overwrite, merge directories)
    cp -rf "$TEST_DIR/." "$TARGET_DIR/"
    
    # Remove any placeholder index.tsx if exists (will be replaced by panel)
    rm -f "$TARGET_DIR/index.tsx" 2>/dev/null || true
    
    # Rename ServerPanel.tsx to ${target}Panel.tsx
    if [ -f "$TARGET_DIR/ServerPanel.tsx" ]; then
        mv "$TARGET_DIR/ServerPanel.tsx" "$TARGET_DIR/${target}Panel.tsx"
        # Update component name inside file
        sed -i 's/export function ServerPanel/export function '"${target}"'Panel/g' "$TARGET_DIR/${target}Panel.tsx"
        sed -i 's/interface ServerPanelProps/interface '"${target}"'PanelProps/g' "$TARGET_DIR/${target}Panel.tsx"
        # Update imports for sub-tabs to use relative paths (they're inside same folder)
        # No changes needed as sub-tabs are relative
    fi
    
    # Rename ServerTargetList.tsx to ${target}TargetList.tsx
    if [ -f "$TARGET_DIR/ServerTargetList.tsx" ]; then
        mv "$TARGET_DIR/ServerTargetList.tsx" "$TARGET_DIR/${target}TargetList.tsx"
        # Update component name inside file
        sed -i 's/export function ServerTargetList/export function '"${target}"'TargetList/g' "$TARGET_DIR/${target}TargetList.tsx"
    fi
    
    # Keep ReconDataContext.tsx as is (reusable)
    
    echo "  Done: $target"
done

echo "All folders processed successfully."