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
npx expo start --dev-client --port 8081
```

Make sure the backend is also running:

```bash
cd backend
poetry run uvicorn ccbenefits.main:app --reload --port 8000
```

## ADB Screenshot Tests

Automated visual smoke tests that navigate through every screen and capture screenshots.

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

The script will:
1. Launch the app on the connected emulator
2. Navigate through: Dashboard, All Credits (3 tabs), Card Detail, Notifications, Add Card, Profile
3. Capture a screenshot of each screen
4. Compare file sizes against baselines and report changes

### What the Script Checks

| Screen | Navigation | What to Verify |
|--------|-----------|----------------|
| Dashboard | App launch | Cards load, summary stats visible |
| All Credits — By Period | Tap "All Credits" | Benefits grouped by period, "Log" buttons |
| All Credits — By Card | Tap "By Card" tab | Cards with fees/utilization |
| All Credits — Sheet | Tap "Sheet" tab | Table with readable column widths |
| Card Detail | Tap first card | Benefits, period dots, Delete at bottom |
| Notifications | Tap bell icon | Notification cards with icons |
| Add Card | Tap "+" FAB | Search bar, card template list |
| Profile | Tap avatar | Settings, notification toggles |

### Options

| Flag | Description |
|------|-------------|
| `--update` | Overwrite baselines with current screenshots |
| (none) | Capture and compare against baselines |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADB_PATH` | auto-detect | Path to `adb` binary |

### Requirements

- Running Android emulator with the app installed
- Metro dev server on port 8081
- Backend API on port 8000 (for data to display)
- Python 3 (for UI element coordinate parsing)

## Architecture Notes

- The test uses `uiautomator dump` to find UI elements by text, making it resilient to layout changes
- Screenshots are compared by file size (quick heuristic); for pixel-perfect diff, install ImageMagick and use `compare`
- The `screenshots/` directory is gitignored except for `baseline/`
