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
#   0 — all screens captured and (in compare mode) match baselines
#   non-zero — number of failures (navigation, content assertions, or baseline mismatches)

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

ui_contains() {
  # Check if the current UI dump contains an element with the given text.
  # Returns 0 (true) if found, 1 (false) if not. Does NOT dump_ui — caller must do that.
  local text="$1"
  $ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET
target = sys.argv[1]
tree = ET.parse(sys.stdin)
for node in tree.iter():
    t = node.get('text') or ''
    cd = node.get('content-desc') or ''
    if target in t or target in cd:
        print('found')
        break
" "$text" 2>/dev/null | grep -q 'found'
}

assert_ui_contains() {
  # Assert that the current screen contains the given text. Fails the test if not found.
  # Pass --no-dump as first arg to skip dump_ui (reuse previous dump).
  local skip_dump=false
  if [[ "${1:-}" == "--no-dump" ]]; then
    skip_dump=true
    shift
  fi
  local text="$1"
  local context="${2:-}"
  if ! $skip_dump; then
    dump_ui
  fi
  if ! ui_contains "$text"; then
    echo "  ASSERT FAILED: expected '$text' on screen${context:+ ($context)}" >&2
    FAILED=$((FAILED + 1))
    return 1
  fi
  return 0
}

type_text() {
  # Type text via adb — must quote the string to preserve @ and special chars
  local text="$1"
  $ADB shell "input text '${text}'"
}

seed_test_data() {
  # Ensure the test account has cards with usage so screenshots show real data.
  # Idempotent: skips card creation if user already has cards.
  local api="${API_URL:-http://localhost:8000}"
  local email="${TEST_EMAIL:-ccbtest_auto@test.com}"
  local password="${TEST_PASSWORD:-TestPass1234}"

  # Login to get token
  local token
  token=$(curl -s -X POST "$api/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

  if [[ -z "$token" ]]; then
    echo "ERROR: Could not get token for seeding data." >&2
    exit 1
  fi

  # Check if user already has cards
  local card_count
  card_count=$(curl -s "$api/api/user-cards/" \
    -H "Authorization: Bearer $token" 2>/dev/null \
    | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

  if [[ "$card_count" -gt 0 ]]; then
    echo "  Test data already seeded ($card_count cards)."
    return
  fi

  echo "  Seeding test data..."

  # Add Amex Platinum (template 1) and Chase Sapphire Reserve (template 6)
  local card1_id card2_id
  card1_id=$(curl -s -X POST "$api/api/user-cards/" \
    -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    -d '{"card_template_id": 1}' 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

  card2_id=$(curl -s -X POST "$api/api/user-cards/" \
    -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    -d '{"card_template_id": 6}' 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

  if [[ -z "$card1_id" || -z "$card2_id" ]]; then
    echo "ERROR: Failed to create test cards." >&2
    exit 1
  fi

  # Get current year/month for realistic dates
  local year month
  year=$(date +%Y)
  month=$(date +%m)

  # Helper to log usage — tracks failures
  local seed_errors=0
  _log() {
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$api/api/user-cards/$1/usage" \
      -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
      -d "{\"benefit_template_id\": $2, \"amount_used\": $3, \"target_date\": \"$4\"}")
    if [[ "$status" != "200" && "$status" != "201" ]]; then
      echo "  WARNING: usage log failed (card=$1 bt=$2 date=$4 → HTTP $status)" >&2
      seed_errors=$((seed_errors + 1))
    fi
  }

  # Amex Platinum: Uber Cash (BT 1, $15/mo) — Jan through current month
  for m in $(seq 1 "$((10#$month))"); do
    _log "$card1_id" 1 15 "$(printf '%s-%02d-15' "$year" "$m")"
  done
  # Amex Platinum: Saks (BT 3, $50/semi) — H1
  _log "$card1_id" 3 50 "${year}-01-20"
  # Amex Platinum: Airline Fee (BT 5, $200/annual) — partial
  _log "$card1_id" 5 100 "${year}-02-10"

  # CSR: DoorDash (BT 31, $25/mo) — Jan through current month
  for m in $(seq 1 "$((10#$month))"); do
    _log "$card2_id" 31 25 "$(printf '%s-%02d-10' "$year" "$m")"
  done
  # CSR: Travel Credit (BT 37, $300/annual) — partial
  _log "$card2_id" 37 200 "${year}-02-15"
  # CSR: Lyft (BT 29, $10/mo) — Jan & Feb
  _log "$card2_id" 29 10 "${year}-01-05"
  _log "$card2_id" 29 10 "${year}-02-05"

  if [[ "$seed_errors" -gt 0 ]]; then
    echo "  WARNING: $seed_errors usage log(s) failed during seeding." >&2
  fi
  echo "  Seeded 2 cards with usage (Amex Platinum + Chase Sapphire Reserve)."
}

ensure_test_account() {
  # Register a test account via the API if it doesn't exist.
  # This bypasses email verification since local dev has it disabled,
  # or the account may already exist.
  local api="${API_URL:-http://localhost:8000}"
  local email="${TEST_EMAIL:-ccbtest_auto@test.com}"
  local password="${TEST_PASSWORD:-TestPass1234}"
  local name="${TEST_NAME:-CCB Tester}"

  echo "  Ensuring test account exists ($email)..."

  # Try to register — ignore if already exists (409)
  local register_response
  register_response=$(curl -s -w "\n%{http_code}" \
    -X POST "$api/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"display_name\":\"$name\"}" \
    2>/dev/null)

  local register_status
  register_status=$(echo "$register_response" | tail -1)
  local register_body
  register_body=$(echo "$register_response" | sed '$d')

  case "$register_status" in
    201)
      echo "  Test account created."
      # Extract access token and verify email via API
      local token
      token=$(echo "$register_body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
      if [[ -n "$token" ]]; then
        # Mark email as verified using the admin-like approach: call /api/auth/me to check,
        # then directly verify via database or skip if verification is disabled.
        # For local SQLite dev, we can use the verify endpoint if we have the token,
        # or just try logging in — some setups don't require verification.
        echo "  Attempting to auto-verify email..."
        curl -s -o /dev/null -X POST "$api/api/auth/request-verification" \
          -H "Authorization: Bearer $token" 2>/dev/null || true
      fi
      ;;
    409) echo "  Test account already exists." ;;
    000|"") echo "  WARNING: Could not reach API to register. Login may fail." ;;
    *)   echo "  WARNING: Registration returned HTTP $register_status." ;;
  esac

  # Try logging in via API first to check if account works
  local login_response
  login_response=$(curl -s -w "\n%{http_code}" \
    -X POST "$api/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    2>/dev/null)
  local login_status
  login_status=$(echo "$login_response" | tail -1)

  if [[ "$login_status" != "200" ]]; then
    echo "ERROR: API login failed (HTTP $login_status). Account may need email verification." >&2
    echo "  Verify the email manually or set CCB_REQUIRE_EMAIL_VERIFICATION=false." >&2
    exit 1
  fi
  echo "  API login verified."
}

fill_field_after_label() {
  # Find the EditText that follows a label with the given text, tap it, and type
  local label="$1"
  local value="$2"

  local coords
  coords=$($ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET, re
tree = ET.parse(sys.stdin)
found_label = False
for node in tree.iter():
    t = node.get('text') or ''
    cls = node.get('class') or ''
    if t == '$label':
        found_label = True
        continue
    if found_label and 'EditText' in cls:
        b = node.get('bounds','')
        nums = re.findall(r'\d+', b)
        if len(nums)==4:
            print(f'{(int(nums[0])+int(nums[2]))//2} {(int(nums[1])+int(nums[3]))//2}')
            break
" 2>/dev/null)

  if [[ -n "$coords" ]]; then
    $ADB shell input tap $coords
    sleep 0.3
    type_text "$value"
    sleep 0.3
  else
    echo "  WARNING: Could not find field after label '$label'" >&2
  fi
}

check_and_login() {
  # Check if login screen is showing. If so, log in with test credentials.
  local email="${TEST_EMAIL:-ccbtest_auto@test.com}"
  local password="${TEST_PASSWORD:-TestPass1234}"

  dump_ui
  local screen_text
  screen_text=$($ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET
tree = ET.parse(sys.stdin)
for node in tree.iter():
    t = node.get('text') or ''
    if t in ('Sign In', 'Create Account'):
        print(t)
        break
" 2>/dev/null)

  if [[ -z "$screen_text" ]]; then
    echo "  Already logged in."
    return 0
  fi

  # If on Register screen, navigate to Sign In
  if [[ "$screen_text" == "Create Account" ]]; then
    echo "  On register screen, navigating to Sign In..."
    find_and_tap "Sign In" || true
    sleep 2
    dump_ui
  fi

  echo "  Logging in as $email..."

  # Find and tap the email EditText directly (placeholder "you@example.com")
  local email_bounds
  email_bounds=$($ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET, re
tree = ET.parse(sys.stdin)
for node in tree.iter():
    cls = node.get('class') or ''
    t = node.get('text') or ''
    if 'EditText' in cls and ('example' in t or 'email' in t.lower() or t == ''):
        b = node.get('bounds','')
        nums = re.findall(r'\d+', b)
        if len(nums)==4:
            print(f'{(int(nums[0])+int(nums[2]))//2} {(int(nums[1])+int(nums[3]))//2}')
            break
" 2>/dev/null)

  if [[ -n "$email_bounds" ]]; then
    $ADB shell input tap $email_bounds
    sleep 0.3
    type_text "$email"
    sleep 0.3
  fi

  # Find and tap the password EditText (second EditText on screen)
  dump_ui
  local pw_bounds
  pw_bounds=$($ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET, re
tree = ET.parse(sys.stdin)
edit_texts = []
for node in tree.iter():
    cls = node.get('class') or ''
    if 'EditText' in cls:
        b = node.get('bounds','')
        nums = re.findall(r'\d+', b)
        if len(nums)==4:
            edit_texts.append(f'{(int(nums[0])+int(nums[2]))//2} {(int(nums[1])+int(nums[3]))//2}')
# Password is the second EditText
if len(edit_texts) >= 2:
    print(edit_texts[1])
" 2>/dev/null)

  if [[ -n "$pw_bounds" ]]; then
    $ADB shell input tap $pw_bounds
    sleep 0.3
    type_text "$password"
    sleep 0.3
  else
    echo "  WARNING: Could not find password field" >&2
  fi

  # Dismiss keyboard (KEYCODE_BACK) and tap Sign In button
  $ADB shell input keyevent 4  # KEYCODE_BACK to dismiss keyboard
  sleep 1
  dump_ui

  # Find the Sign In BUTTON (second "Sign In" element, not the title)
  local signin_coords
  signin_coords=$($ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET, re
tree = ET.parse(sys.stdin)
matches = []
for node in tree.iter():
    if node.get('text') == 'Sign In':
        b = node.get('bounds','')
        nums = re.findall(r'\d+', b)
        if len(nums)==4:
            matches.append(f'{(int(nums[0])+int(nums[2]))//2} {(int(nums[1])+int(nums[3]))//2}')
# The button is the second match (first is the title)
if len(matches) >= 2:
    print(matches[1])
elif len(matches) == 1:
    print(matches[0])
" 2>/dev/null)

  if [[ -n "$signin_coords" ]]; then
    $ADB shell input tap $signin_coords
  else
    echo "  WARNING: Could not find Sign In button" >&2
  fi
  echo "  Waiting for dashboard to load..."
  wait_for_screen 5

  # Verify we made it to dashboard
  dump_ui
  local on_dashboard
  on_dashboard=$($ADB shell cat /sdcard/ui.xml | python3 -c "
import sys, xml.etree.ElementTree as ET
tree = ET.parse(sys.stdin)
for node in tree.iter():
    if 'Hello' in (node.get('text') or ''):
        print('yes')
        break
" 2>/dev/null)

  if [[ "$on_dashboard" == "yes" ]]; then
    echo "  Login successful."
  else
    echo "ERROR: Login failed — did not reach dashboard. Check emulator." >&2
    $ADB exec-out screencap -p > "$PROJECT_DIR/screenshots/login_failure.png" 2>/dev/null || true
    echo "  Saved failure screenshot to screenshots/login_failure.png" >&2
    exit 1
  fi
}

FAILED=0

# --- Pre-flight checks ---
echo "=== CCBenefits ADB Screenshot Test ==="

device_count=$($ADB devices | grep -c 'device$' || true)
if [[ "$device_count" -eq 0 ]]; then
  echo "ERROR: No Android device/emulator connected." >&2
  echo "  Start an emulator first (see mobile/TESTING.md)." >&2
  exit 1
fi
echo "Device connected."

# Check backend — required for seeding and realistic screenshots
if ! curl -sf http://localhost:8000/api/card-templates/ > /dev/null 2>&1; then
  echo "ERROR: Backend not reachable at localhost:8000." >&2
  echo "  Start it: cd backend && poetry run uvicorn ccbenefits.main:app --reload --port 8000" >&2
  exit 1
fi
echo "Backend reachable."

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

# --- Ensure test account + seed data before launch ---
ensure_test_account
seed_test_data

# --- Launch app from logged-out state ---
echo ""
echo "Launching app..."
$ADB shell pm clear "$PACKAGE" > /dev/null 2>&1   # wipe app data (tokens, cache)
sleep 1
$ADB shell am start -n "$ACTIVITY" > /dev/null 2>&1
wait_for_screen 7

# Log in through the UI
check_and_login

# --- 1. Dashboard ---
echo ""
echo "[1/8] Dashboard"
# Assert seeded cards are visible
assert_ui_contains "American Express Platinum" "dashboard" || true
assert_ui_contains --no-dump "Chase Sapphire Reserve" "dashboard" || true
screenshot "01_dashboard" "$dest"

# --- 2. All Credits - By Period ---
echo "[2/8] All Credits — By Period"
if find_and_tap "All Credits →" || find_and_tap "All Credits"; then
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
# Tap first card by name instead of blind coordinates
if find_and_tap "American Express Platinum"; then
  wait_for_screen 2
  assert_ui_contains "Uber Cash" "card detail" || true
  screenshot "05_card_detail" "$dest"
else
  echo "  FAILED: Could not find card to tap for detail view" >&2
  FAILED=$((FAILED + 1))
fi

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
# Profile avatar is the first letter of display name
dump_ui
AVATAR_LETTER="$(echo "${TEST_NAME:-CCB Tester}" | cut -c1)"
if find_and_tap "$AVATAR_LETTER"; then
  wait_for_screen 2
  assert_ui_contains "${TEST_NAME:-CCB Tester}" "profile" || true
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

  # Compare with baselines — required in compare mode
  if [[ ! -d "$BASELINE_DIR" ]] || ! ls "$BASELINE_DIR"/*.png &>/dev/null; then
    echo ""
    echo "ERROR: No baselines found. Create them first:" >&2
    echo "  ./scripts/adb-screenshot-test.sh --update" >&2
    exit 1
  fi

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

  FAILED=$((FAILED + mismatches))

  if [[ $mismatches -gt 0 ]]; then
    echo ""
    echo "$mismatches screen(s) changed. Review screenshots in $OUTPUT_DIR."
    echo "Run with --update to accept new baselines."
  else
    echo ""
    echo "All screens match baselines."
  fi
fi

exit $((FAILED > 125 ? 125 : FAILED))
