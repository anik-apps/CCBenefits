# Mobile Testing Guide

## Prerequisites

### 1. Android SDK & Emulator (macOS with Homebrew)

```bash
# Install Android command-line tools
brew install --cask android-commandlinetools

# Accept licenses
yes | sdkmanager --licenses

# Install required SDK components
sdkmanager "platform-tools" "platforms;android-35" "system-images;android-35;google_apis;arm64-v8a" "emulator"

# Create an AVD (Android Virtual Device)
avdmanager create avd -n ccb_test -k "system-images;android-35;google_apis;arm64-v8a" --device "pixel_6"
```

### 2. Java (JDK 17)

```bash
brew install openjdk@17
```

### 3. Environment Variables

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

### 4. local.properties

Create `mobile/android/local.properties`:

```properties
sdk.dir=/opt/homebrew/share/android-commandlinetools
```

## Running the Emulator

```bash
# Start emulator (headless for CI, or remove -no-window for GUI)
emulator -avd ccb_test -no-audio

# Or with GUI (recommended for development)
emulator -avd ccb_test

# Verify device is connected
adb devices
# Should show: emulator-5554  device
```

## Building & Installing the App

```bash
cd mobile

# Install dependencies
npm install

# Build debug APK (arm64 for Apple Silicon emulator)
cd android
JAVA_HOME=/opt/homebrew/opt/openjdk@17 \
ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a

# Install on emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk
cd ..
```

## Starting the Dev Server

The debug APK requires a Metro bundler to serve JavaScript:

```bash
cd mobile

# For local development (API on localhost:8000):
CCB_API_URL=http://10.0.2.2:8000 npx expo start --dev-client --port 8081

# For production API (default):
npx expo start --dev-client --port 8081
```

> **Note:** `10.0.2.2` is the Android emulator's alias for the host machine's `localhost`.

Make sure the backend is also running:

```bash
cd backend
poetry run uvicorn ccbenefits.main:app --reload --port 8000
```

## ADB Screenshot Tests

Automated end-to-end smoke tests that start from a logged-out state, seed test data, navigate through every screen, verify content, and capture screenshots.

### First Run — Create Baselines

```bash
cd mobile
./scripts/adb-screenshot-test.sh --update
```

This captures screenshots of all 8 major screens and saves them to `screenshots/baseline/`.
Commit these baselines to track visual changes over time.

### Subsequent Runs — Compare Against Baselines

```bash
./scripts/adb-screenshot-test.sh
```

Exit code 0 means all checks passed. Non-zero = number of failures.

### What the Script Does

**Setup (before app launch):**

1. **Pre-flight checks** — verifies emulator connected and backend reachable (fails hard if not)
2. **Ensure test account** — registers test user via API, verifies API login works
3. **Seed test data** — creates 2 cards (Amex Platinum + Chase Sapphire Reserve) with usage across multiple months. Idempotent: skips if user already has cards.

**App launch (from clean state):**

4. **Clear app data** — `pm clear` wipes tokens/cache so every run starts logged out
5. **Launch app** — starts the activity, waits for UI
6. **Login via UI** — detects Sign In screen, types credentials, taps Sign In, verifies dashboard loads (fails hard if login doesn't succeed, saves `login_failure.png`)

**Screenshot capture + content assertions (8 screens):**

| # | Screen | Navigation | Content Assertions |
|---|--------|-----------|-------------------|
| 1 | Dashboard | App launch | "American Express Platinum", "Chase Sapphire Reserve" visible |
| 2 | All Credits — By Period | Tap "All Credits" | — |
| 3 | All Credits — By Card | Tap "By Card" tab | — |
| 4 | All Credits — Sheet | Tap "Sheet" tab | — |
| 5 | Card Detail | Tap card by name | "Uber Cash" visible |
| 6 | Notifications | Tap bell icon | — |
| 7 | Add Card | Tap "+" FAB | — |
| 8 | Profile | Tap avatar letter | Display name visible |

**Comparison (non-update mode):**

- Compares file sizes against baselines (>20% diff = CHANGED)
- Baseline mismatches count toward exit code
- Missing baselines in compare mode = hard error

### Options

| Flag | Description |
|------|-------------|
| `--update` | Overwrite baselines with current screenshots |
| (none) | Capture, assert content, compare against baselines |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADB_PATH` | auto-detect | Path to `adb` binary |
| `TEST_EMAIL` | `ccbtest_auto@test.com` | Email for auto-register/login |
| `TEST_PASSWORD` | `TestPass1234` | Password for auto-register/login |
| `TEST_NAME` | `CCB Tester` | Display name for auto-registration |
| `API_URL` | `http://localhost:8000` | Backend API URL for account creation and data seeding |

### Requirements

- Running Android emulator with the app installed
- Metro dev server on port 8081
- Backend API on port 8000 (required — test fails if unreachable)
- Python 3 (for UI element coordinate parsing)

### Failure Modes

| Failure | Behavior |
|---------|----------|
| Backend unreachable | Hard exit before launch |
| Account creation/login fails | Hard exit before launch |
| UI login doesn't reach dashboard | Hard exit, saves `login_failure.png` |
| Content assertion fails | Increments failure count, continues |
| Navigation fails (can't find element) | Increments failure count, continues |
| Baseline mismatch (compare mode) | Increments failure count |
| No baselines in compare mode | Hard exit |

## Architecture Notes

- The test uses `uiautomator dump` to find UI elements by text, making it resilient to layout changes
- Card Detail navigates by card name (not blind coordinates)
- Screenshots are compared by file size (quick heuristic); for pixel-perfect diff, install ImageMagick and use `compare`
- The `screenshots/` directory is gitignored except for `baseline/`
