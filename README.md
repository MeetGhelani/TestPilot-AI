# AI Test Tool

AI-powered functional testing for **web**, **mobile**, and **desktop** apps.  
Describe your test in plain English — Claude generates the steps and runs them automatically.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers (web + desktop)
npx playwright install chromium

# 3. Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...
```

For **mobile** testing, also install and start Appium:
```bash
npm install -g appium
appium driver install uiautomator2   # Android
appium driver install xcuitest       # iOS
appium                               # starts server on port 4723
```

---

## Usage

```bash
# Web
npx ts-node src/cli.ts \
  --platform web \
  --url https://yourapp.com \
  --test "Log in with valid credentials and verify the dashboard loads"

# Mobile (Android)
npx ts-node src/cli.ts \
  --platform mobile \
  --url /path/to/app.apk \
  --test "Open the app and verify the welcome screen is visible"

# Desktop (Electron)
npx ts-node src/cli.ts \
  --platform desktop \
  --url /Applications/MyApp.app/Contents/MacOS/MyApp \
  --test "Open the preferences window and change the theme to dark"

# Run headlessly (default for web)
npx ts-node src/cli.ts --platform web --url https://example.com \
  --test "Check the page title" --headless

# Show browser UI
npx ts-node src/cli.ts --platform web --url https://example.com \
  --test "Check the page title" --no-headless
```

---

## Output

- **Terminal** — coloured pass/fail summary with per-step timing
- **HTML report** — saved to `./reports/report-<timestamp>.html`
- **Screenshots** — saved to `./reports/screenshots/` on failure (and when steps request them)

---

## Project structure

```
src/
├── ai/
│   └── testGenerator.ts    # Claude API → test steps
├── drivers/
│   ├── webDriver.ts        # Playwright (Chrome)
│   ├── mobileDriver.ts     # WebdriverIO + Appium
│   └── desktopDriver.ts    # Playwright Electron
├── runner/
│   └── testRunner.ts       # Orchestrator + HTML reporter
├── types/
│   └── index.ts            # Shared types
└── cli.ts                  # Entry point
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. Your Claude API key. |
| `APPIUM_HOST` | `localhost` | Appium server host (mobile) |
| `APPIUM_PORT` | `4723` | Appium server port (mobile) |
| `APPIUM_PLATFORM` | `Android` | `Android` or `iOS` (mobile) |

---

## CI integration (GitHub Actions example)

```yaml
- name: Run AI functional tests
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    npx ts-node src/cli.ts \
      --platform web \
      --url ${{ env.STAGING_URL }} \
      --test "Complete the checkout flow and verify the confirmation page"
```
