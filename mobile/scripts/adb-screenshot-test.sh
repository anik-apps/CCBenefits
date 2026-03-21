#!/usr/bin/env bash
#
# ADB Screenshot Test — automated visual smoke test for CCBenefits mobile app.
#
# Takes screenshots of every major screen and compares against baselines.
# Requires: running Android emulator, Metro dev server, backend API.
#
# Usage:
#   ./scripts/adb-screenshot-test.sh              # Run tests, compare to baselines
#   ./scripts/adb-screenshot-test.sh --update      # Update baseline screenshots
#
# Exit codes:
#   0 — all screens captured successfully
#   1 — a screen failed to load or navigation failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BASELINE_DIR="$PROJECT_DIR/screenshots/baseline"
OUTPUT_DIR="$PROJECT_DIR/screenshots/output"
DIFF_DIR="$PROJECT_DIR/screenshots/diff"

UPDATE_MODE=false
if [[ "${1:-}" == "--update" ]]; then
  UPDATE_MODE=true
fi

# --- Resolve ADB ---
ADB="${ADB_PATH:-}"
if [[ -z "$ADB" ]]; then
  if command -v adb &>/dev/null; then
    ADB="adb"
  elif [[ -f "/opt/homebrew/share/android-commandlinetools/platform-tools/adb" ]]; then
    ADB="/opt/homebrew/share/android-commandlinetools/platform-tools/adb"
  elif [[ -n "${ANDROID_HOME:-}" && -f "$ANDROID_HOME/platform-tools/adb" ]]; then
    ADB="$ANDROID_HOME/platform-tools/adb"
  else
    echo "ERROR: adb not found. Set ADB_PATH or ANDROID_HOME." >&2
    exit 1
  fi
fi

PACKAGE="com.anikapps.ccbenefits"
ACTIVITY="$PACKAGE/.MainActivity"

# --- Helpers ---
screenshot() {
  local name="$1"
  local outdir="$2"
  mkdir -p "$outdir"
  $ADB exec-out screencap -p > "$outdir/${name}.png"
  echo "  captured: $name"
}

wait_for_screen() {
  local timeout="${1:-8}"
  sleep "$timeout"
}

dump_ui() {
  $ADB shell uiautomator dump /sdcard/ui.xml 2>/dev/null
}

find_and_tap() {
  local text="$1"
  local coords
  dump_ui
  coords=$($ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET, re
tree = ET.parse(sys.stdin)
for node in tree.iter():
    t = node.get('text') or ''
    cd = node.get('content-desc') or ''
    if t == '$text' or cd == '$text':
        b = node.get('bounds','')
        nums = re.findall(r'\d+', b)
        if len(nums)==4:
            print(f'{(int(nums[0])+int(nums[2]))//2} {(int(nums[1])+int(nums[3]))//2}')
            break
" 2>/dev/null)

  if [[ -z "$coords" ]]; then
    echo "  WARNING: could not find element '$text'" >&2
    return 1
  fi
  $ADB shell input tap $coords
  return 0
}

tap_back() {
  find_and_tap "← Back" || find_and_tap "Back" || $ADB shell input tap 100 210
}

# --- Pre-flight checks ---
echo "=== CCBenefits ADB Screenshot Test ==="

device_count=$($ADB devices | grep -c 'device$' || true)
if [[ "$device_count" -eq 0 ]]; then
  echo "ERROR: No Android device/emulator connected." >&2
  echo "  Start an emulator first (see mobile/TESTING.md)." >&2
  exit 1
fi
echo "Device connected."

# Check backend
if ! curl -sf http://localhost:8000/api/card-templates/ > /dev/null 2>&1; then
  echo "WARNING: Backend not reachable at localhost:8000. Screens may show errors."
fi

# --- Set up output directory ---
dest="$OUTPUT_DIR"
if $UPDATE_MODE; then
  dest="$BASELINE_DIR"
  echo "MODE: Updating baselines"
else
  echo "MODE: Capturing for comparison"
fi
rm -rf "$dest"
mkdir -p "$dest"

# --- Launch app ---
echo ""
echo "Launching app..."
$ADB shell am force-stop "$PACKAGE"
sleep 1
$ADB shell am start -n "$ACTIVITY" > /dev/null 2>&1
wait_for_screen 7

FAILED=0

# --- 1. Dashboard ---
echo ""
echo "[1/8] Dashboard"
screenshot "01_dashboard" "$dest"

# --- 2. All Credits - By Period ---
echo "[2/8] All Credits — By Period"
if find_and_tap "All Credits"; then
  wait_for_screen 3
  screenshot "02_allcredits_byperiod" "$dest"
else
  echo "  FAILED: Could not navigate to All Credits" >&2
  FAILED=$((FAILED + 1))
fi

# --- 3. All Credits - By Card ---
echo "[3/8] All Credits — By Card"
if find_and_tap "By Card"; then
  wait_for_screen 2
  screenshot "03_allcredits_bycard" "$dest"
else
  echo "  FAILED: Could not find By Card tab" >&2
  FAILED=$((FAILED + 1))
fi

# --- 4. All Credits - Sheet ---
echo "[4/8] All Credits — Sheet"
if find_and_tap "Sheet"; then
  wait_for_screen 2
  screenshot "04_allcredits_sheet" "$dest"
else
  echo "  FAILED: Could not find Sheet tab" >&2
  FAILED=$((FAILED + 1))
fi

# --- 5. Card Detail ---
echo "[5/8] Card Detail"
tap_back
sleep 2
# Tap first card (Bilt Palladium area)
$ADB shell input tap 540 750
wait_for_screen 2
screenshot "05_card_detail" "$dest"

# --- 6. Notifications ---
echo "[6/8] Notifications"
tap_back
sleep 2
if find_and_tap "🔔"; then
  wait_for_screen 2
  screenshot "06_notifications" "$dest"
else
  echo "  FAILED: Could not find bell icon" >&2
  FAILED=$((FAILED + 1))
fi

# --- 7. Add Card ---
echo "[7/8] Add Card"
tap_back
sleep 2
if find_and_tap "+"; then
  wait_for_screen 2
  screenshot "07_add_card" "$dest"
else
  echo "  FAILED: Could not find + FAB" >&2
  FAILED=$((FAILED + 1))
fi

# --- 8. Profile ---
echo "[8/8] Profile"
tap_back
sleep 2
# Profile avatar is the last letter of display name
dump_ui
# Try to find the avatar element (single letter like "A")
if find_and_tap "A"; then
  wait_for_screen 2
  screenshot "08_profile" "$dest"
else
  echo "  FAILED: Could not find profile avatar" >&2
  FAILED=$((FAILED + 1))
fi

# --- Results ---
echo ""
echo "=== Results ==="
count=$(ls "$dest"/*.png 2>/dev/null | wc -l | tr -d ' ')
echo "Screenshots captured: $count / 8"

if [[ $FAILED -gt 0 ]]; then
  echo "FAILED screens: $FAILED"
fi

if $UPDATE_MODE; then
  echo "Baselines updated in: $BASELINE_DIR"
  echo "Commit these to track visual changes."
else
  echo "Output saved to: $OUTPUT_DIR"

  # Compare with baselines if they exist
  if [[ -d "$BASELINE_DIR" ]]; then
    echo ""
    echo "Comparing against baselines..."
    mismatches=0
    for baseline in "$BASELINE_DIR"/*.png; do
      name=$(basename "$baseline")
      output="$OUTPUT_DIR/$name"
      if [[ ! -f "$output" ]]; then
        echo "  MISSING: $name (not captured this run)"
        mismatches=$((mismatches + 1))
        continue
      fi

      # Simple file-size comparison (pixel-perfect diff requires ImageMagick)
      baseline_size=$(wc -c < "$baseline" | tr -d ' ')
      output_size=$(wc -c < "$output" | tr -d ' ')
      diff_pct=$(python3 -c "print(abs($baseline_size - $output_size) * 100 // max($baseline_size, 1))")

      if [[ "$diff_pct" -gt 20 ]]; then
        echo "  CHANGED: $name (size diff ${diff_pct}%)"
        mismatches=$((mismatches + 1))
      else
        echo "  OK: $name"
      fi
    done

    if [[ $mismatches -gt 0 ]]; then
      echo ""
      echo "$mismatches screen(s) changed. Review screenshots in $OUTPUT_DIR."
      echo "Run with --update to accept new baselines."
    else
      echo ""
      echo "All screens match baselines."
    fi
  else
    echo ""
    echo "No baselines found. Run with --update to create them:"
    echo "  ./scripts/adb-screenshot-test.sh --update"
  fi
fi

exit $FAILED
