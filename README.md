# TestPilot AI

AI-powered functional testing tool for **web**, **mobile**, and **desktop** apps.
No coding required — describe tests in plain English, record interactions, or let the tool suggest what to test.

---

## Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Install client dependencies
cd client
npm install --legacy-peer-deps
cd ..

# 4. Start the backend server (Terminal 1)
npx ts-node server/index.ts

# 5. Start the frontend (Terminal 2)
cd client
npm run dev

# 6. Run a test via CLI (Optional)
npx ts-node src/cli.ts -p web -u https://example.com -t "verify header is visible"

# 7. Open in browser
# http://localhost:5173
```

---

## Features

### Record & Replay
Record real browser interactions and replay them automatically.

1. Enter URL + optional Basic Auth credentials
2. Give the test a name
3. Click **● START RECORDING** — Chrome opens on your screen
4. Use the site normally — every click, fill, and navigation is captured live
5. Watch steps appear in real time in the UI
6. Click **■ STOP & SAVE** — steps are saved permanently

**Replay:**
- Click **▶ REPLAY** — Chrome opens and executes all steps with a live overlay
- Watch the progress bar and step-by-step results in the UI
- Click **■ STOP** to abort mid-replay

**Edit Steps:**
- Click **✎ EDIT** on any recording to open the step editor
- **Drag ⠿** steps to reorder
- **✎ Edit** any step — change action, selector, value, or description
- **✕ Delete** unwanted steps
- **+ Add step** — pick any action (click, fill, assert, wait, screenshot, etc.)
- **+ Screenshot** / **+ Wait** quick insert buttons
- Smart **validator** highlights errors and warnings before you replay
- Click **SAVE & CLOSE** to persist changes

---

### Smart Test Suggester
Scans your site and suggests exactly what to test — no guessing.

1. Enter a **site name** (optional label) and URL
2. Toggle Basic Auth if needed
3. Click **⌕ SCAN & SUGGEST**
4. Playwright visits up to 5 pages and detects:
   - Login forms, signup buttons
   - Navigation links (individual tests per link)
   - Search bars
   - Shopping cart, product grids
   - Contact / inquiry forms
   - CTA buttons
   - Hero banners, header, footer
5. Suggestions appear grouped by category with **HIGH / MED / LOW** priority
6. Each suggestion shows:
   - What to test and why it matters
   - The exact test description pre-written
   - **▶ RUN TEST** — runs inline, results appear under the card
   - **✎ EDIT** — customise the test description before running
   - **COPY** — copy to clipboard
7. Scans are **saved automatically** — reopen anytime without re-scanning
8. **Rename** any saved scan with the ✎ pencil icon
9. **Delete** saved scans with the × button (confirmation popup)

---

### Site Auditor
Deeply audit any site for performance, accessibility, SEO, and more.

1. Enter the site URL
2. Choose a **Persona** (Standard, Screen Reader, Low Vision, Keyboard Only)
3. Toggle **Compare across devices** to test on Desktop, Mobile, and Low-end Mobile simultaneously
4. Select individual profiles for CPU and Network throttling simulation:
   - **Desktop**: Unthrottled
   - **Mobile**: 4G + 2x CPU Slowdown
   - **Low-end Mobile**: 3G + 4x CPU Slowdown
5. Toggle **SEO Audit** if required
6. Click **▶ RUN FULL AUDIT**
7. View a side-by-side **Comparison Report** with scores for each device type
8. Analyze **Visual Performance Charts** (FCP, TBT, DOM Nodes)
9. Use **Interactive Highlighting** to instantly find failing elements on the live site
10. **Accessibility Detailed View**: Expand the Accessibility category to see grouped issues (Color & Contrast, Navigation, ARIA, etc.), actionable fix suggestions, WCAG documentation links, and DOM snippets powered by axe-core.
11. View detailed results across 7 categories:
   - **Functional**: Site uptime and auth status
   - **Performance**: FCP, TBT, CLS, and Memory usage
   - **Accessibility**: Deep WCAG scans via targeted rules (Alt-text, input labels, precise heading hierarchy validation, tab-tracking for keyboard nav)
   - **SEO**: Meta tags, canonicals, robots.txt, OG tags
   - **Links**: Scans for 404s and network errors
   - **Console**: Captures JS errors and uncaught exceptions
   - **UI**: Detects tap target sizing, text clipping, layout shifts, and fixed overlays
12. **PDF Reporting**: Generate rich, chart-enabled PDF reports directly from the dashboard, including Multi-Device Comparison Trend analysis.
13. Each category gets a **0-100 Score** and status (Passed/Warning/Failed)
14. Audit reports are saved to `data/audits.json` for later review

---

### CLI Tool
Run tests directly from your terminal.

```bash
npx ts-node src/cli.ts --platform <web|mobile|desktop> --url <target> --test "<description>"
```

**Common Flags:**
- `-p, --platform`: `web`, `mobile`, or `desktop`
- `-u, --url`: Site URL or App path
- `-t, --test`: Plain English test description
- `--no-headless`: Run with visible browser (web only)

---

### History
Every test run and audit is saved and viewable anytime.

- Click any test run in the list to see full step-by-step results
- View **Audits** history to track site health over time
- Screenshots shown inline — click to expand fullscreen
- Download the HTML report for any run
- **Clear all** with confirmation popup

---

## Basic Auth Support

For password-protected sites (nginx/Apache HTTP auth popup):

All tabs (Record & replay, Suggest tests, Site Audit) have a **"Site requires Basic Auth"** toggle.
Turn it on → username and password fields appear → credentials sent securely, never in the URL.

---

## Test Description Syntax

Write natural English — separate steps with commas:

| What you write | What it does |
|---|---|
| `verify header is visible` | Asserts header element is visible |
| `fill #email with 'user@test.com'` | Types into the email field |
| `click sign in button` | Clicks the sign in button |
| `scroll to bottom` | Scrolls page to bottom |
| `wait 2000` | Waits 2 seconds |
| `verify url contains 'dashboard'` | Asserts URL changed |
| `take screenshot` | Captures full-page screenshot |
| `verify footer is visible` | Asserts footer is visible |

**Login example:**
```
fill #username with 'student', fill #password with 'Password123', click #submit, wait 2000, verify url contains 'logged-in-successfully', take screenshot
```

---

## Robustness Engine

Every test step uses a smart execution engine:

- **Multi-selector fallback** — tries 5–8 selector strategies per element (id → data-testid → aria-label → name → placeholder → text → xpath)
- **Auto-healing** — if all selectors fail, scans the DOM and fuzzy-matches the closest element
- **Retry logic** — every step retried up to 3 times with backoff before failing
- **Smart waits** — waits for network idle after navigation, not fixed timeouts
- **Framework detection** — detects React/Vue/Angular and uses native input events for controlled components
- **Anti-bot** — real Chrome user-agent, `navigator.webdriver` removed, random click delays

---

## Project Structure

```
ai-test-tool/
├── server/
│   └── index.ts              — Express API server
├── src/
│   ├── ai/
│   │   └── testGenerator.ts  — NL → test steps parser
│   ├── auditor/
│   │   └── siteAuditor.ts    — Deep audit engine (Perf, A11y, SEO)
│   ├── cli.ts                — Command line interface
│   ├── engine/
│   │   └── smartSelector.ts  — Multi-strategy selector + auto-heal + retry
│   ├── drivers/
│   │   ├── webDriver.ts      — Playwright web driver
│   │   ├── mobileDriver.ts   — Appium mobile driver
│   │   └── desktopDriver.ts  — Playwright Electron driver
│   ├── runner/
│   │   └── testRunner.ts     — Orchestrator + HTML reporter
│   ├── recorder/
│   │   └── testRecorder.ts   — Live browser recorder
│   ├── scanner/
│   │   └── siteScanner.ts    — CSS selector auto-detector
│   ├── suggester/
│   │   └── testSuggester.ts  — Smart test suggestion engine
│   └── types/
│       └── index.ts          — Shared TypeScript types
├── client/                   — React + Vite frontend
│   └── src/
│       ├── App.tsx
│       └── components/
│           ├── AuditPanel.tsx
│           ├── TestForm.tsx
│           ├── ResultPanel.tsx
│           ├── HistoryPanel.tsx
│           ├── RecordReplay.tsx
│           ├── StepEditor.tsx
│           ├── SmartSuggester.tsx
│           ├── SiteScanner.tsx
│           └── ScreenshotViewer.tsx
├── reports/                  — Auto-generated reports + screenshots
├── data/                     — Persistent storage for scans and audits
└── package.json
```

---

## Output Files

| File | Contents |
|---|---|
| `reports/history.json` | All test run results |
| `reports/recordings.json` | Saved recordings with steps |
| `reports/suggestions.json` | Saved smart test suggestions |
| `reports/selectors.json` | Auto-detected site selectors |
| `reports/screenshots/` | Per-step screenshots |
| `reports/report-*.html` | Downloadable HTML reports |
| `data/audits.json` | Deep site audit results |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APPIUM_HOST` | `localhost` | Appium server host (mobile) |
| `APPIUM_PORT` | `4723` | Appium server port (mobile) |
| `APPIUM_PLATFORM` | `Android` | `Android` or `iOS` |

---

## Ports

| Service | Port |
|---|---|
| Backend API | `3001` |
| Frontend (Vite) | `5173` |

---

## Mobile Testing Setup

Mobile requires Appium (web testing works out of the box):

```bash
npm install -g appium
appium driver install uiautomator2   # Android
appium driver install xcuitest       # iOS
appium                               # starts on port 4723
```