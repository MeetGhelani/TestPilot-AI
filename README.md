# TestPilot AI

AI-powered functional testing tool for **web* apps.
No coding required — describe tests in plain English, record interactions, or let the tool suggest what to test.

---

## Quick Start (Manual)

```bash
# 1. Install ALL dependencies (root, client, and server)
npm run install-all

# OR: Install everything and start the dev environment in one command
npm run setup

# 2. Install Playwright browsers (if first time)
npx playwright install chromium

# 3. Access UI
# http://localhost:5173
```

---

## 🐋 Running with Docker (Recommended)

Dockerization allows you to run the entire stack (Frontend + Backend + Playwright) with one command, ensuring all dependencies (like Linux browser binaries) are perfectly configured.

### 1. Install Docker
- **Windows/Mac**: Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
- **Linux**: Install `docker` and `docker-compose`.

### 2. Environment Setup
Create the required secrets files (if you haven't already):
```bash
# Frontend
cp client/.env.example client/.env

# Backend
cp server/.env.example server/.env
```
*Note: Open the `.env` files and enter your Supabase and Email credentials.*

### 3. Build & Start
Run the following command at the root of the project:
```bash
docker compose up --build
```

### 4. Access UI
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

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

**Replay & Execution:**
- Click **▶ REPLAY** — Chrome opens and executes all steps with a live, status-aware overlay
- **Structured Execution**: Supports both natural language steps (AI-parsed) and pre-structured JSON flows (instant)
- Watch the progress bar and real-time step results in the side panel
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
Deep-scans your site using a multi-strategy engine to generate **logical, execution-ready test flows**.

1. Enter a **site name** and target URL
2. Toggle Basic Auth if the site is behind a staging popup
3. Click **⌕ SCAN & SUGGEST**
4. The Smart Engine performs a **Deep Scan** to detect:
   - **Auth Flows**: Logical sequences for Login/Signup with success/failure paths.
   - **Search Flows**: Query input and result verification sequences.
   - **Form Flows**: Multi-field submission sequences with specific success assertions.
   - **Navigation Path**: Key landing pages and core menu links.
   - **Success Indicators**: Automatically detects "Logout", "Dashboard", or "Welcome" nodes to build reliable assertions.
5. Suggestions are ranked by **Priority** (High/Medium/Low) and **Confidence Breakdown**:
   - **DET (Detection)**: How likely this is a critical user flow.
   - **SEL (Selector)**: Stability score for the primary target element.
   - **OUT (Outcome)**: Reliability of the generated success assertion.
6. Each suggestion features:
   - **Flow Visualization**: Step-by-step breakdown of actions (Navigate, Fill, Click, Assert).
   - **Why Test This?**: Business context and impact of failure.
   - **▶ RUN TEST**: Executes the structured flow instantly with high reliability.
   - **COPY**: Export the raw JSON steps for use in custom scripts or documentation.
7. **Parameterized Data**: Supports `{{user.email}}` and `{{user.password}}` variables for immediate use with test accounts.
8. Scans are **persisted locally** — return anytime to re-run or review suggestions.

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

### Authentication & Security
Secure user management and project protection powered by Supabase.

1. **Email/Password Auth**: Secure signup and login flows.
2. **Google OAuth**: One-click login with Google integration.
3. **Password Reset Flow**: 
   - "Forgot Password" link in the login modal.
   - Secure magic link sent via email.
   - Dedicated `/reset-password` route with premium glassmorphism UI.
   - Real-time password strength and matching validation.
4. **Protected Dashboard**: Ensures only authenticated users can access sensitive audit data and test histories.

---

### UI/UX Enhancements
A premium, developer-first experience with modern design principles.

1. **Premium Navigation**: Persistent, glassmorphism Navbar with context-aware actions.
2. **Global Scroll-to-Top**: A dynamic, animated button appearing across all product pages for seamless navigation.
3. **Responsive Routing**: Instrumented with `react-router-dom` for fast, state-aware page transitions.
4. **Dark Mode Aesthetics**: Deep `#0B0F0C` surfaces with neon green `#c8f069` accents and subtle backdrop filters.

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
| `press Enter` | Simulates a keyboard 'Enter' press |
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

- **Multi-strategy Selector Engine** — generates primary and fallback selectors using ARIA roles, labels, text content, and stable CSS attributes.
- **Success Indicator Detection** — automatically identifies post-action state changes (like 'Logout' or success alerts) to generate concrete assertions.
- **Auto-healing** — if primary selectors fail, the engine fuzzy-matches elements based on proximity and semantic similarity.
- **Retry logic** — every step retried up to 3 times with exponential backoff.
- **Smart waits** — intelligently waits for network idle and DOM stability.
- **Framework detection** — optimized for React, Vue, and Angular controlled components.
- **Anti-bot** — real Chrome behavior simulation with random delays and automation-masking.

---

## Project Structure

```
ai-test-tool/
├── client/                   # Frontend React Application
│   ├── public/               # Static assets & images
│   │   └── blog/             # Blog post featured images
│   ├── src/                  
│   │   ├── components/       # Reusable UI components (Pages, Modals, Navbar)
│   │   ├── contexts/         # React Context providers (AuthContext)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── App.tsx           # Main application routing
│   │   └── main.tsx          # Application entry point
│   ├── Dockerfile.dev        # Development container setup for Vite
│   ├── package.json          # Frontend dependencies
│   └── .env.example          # Template for frontend environment variables
│
├── server/                   # Backend Node.js & Express API
│   ├── index.ts              # Main server entry & API routes
│   ├── reportTemplate.ts     # HTML templates for test reports
│   ├── Dockerfile.dev        # Development container (Playwright optimized)
│   ├── package.json          # Backend dependencies
│   └── .env.example          # Template for backend environment variables
│
├── src/                      # Core Test Automation & AI Engine
│   ├── ai/                   # AI logic (Natural language test generation)
│   ├── auditor/              # Deep site audit engine (Perf, A11y, SEO)
│   ├── drivers/              # Automation drivers (Playwright & Appium)
│   ├── engine/               # Smart multi-strategy element selector
│   ├── recorder/             # Live browser recording logic
│   ├── runner/               # Test execution orchestrator & reporter
│   ├── scanner/              # CSS selector auto-detection
│   ├── suggester/            # Smart test flow suggestion engine
│   └── types/                # Shared TypeScript definitions
│
├── lib/                      # Shared Library Code
│   └── supabase.js           # Secure Supabase client configuration
│
├── data/                     # Persistent Local Data Storage
│   └── .gitkeep              # Preserves structure (Git-ignored content)
│
├── reports/                  # Generated Test Assets
│   └── .gitkeep              # Stores HTML reports, screenshots (Git-ignored content)
│
├── .dockerignore             # Optimized build settings for Docker
├── .gitignore                # Security rules (protects data, reports, and .env files)
├── docker-compose.yml        # Orchestration for multi-container deployment
├── package.json              # Monorepo/Workspace dependencies & setup scripts
└── README.md                 # Project documentation

```

---

## Output Files

| File | Contents |
|---|---|
| `reports/history.json` | All test run results |
| `reports/recordings.json` | Saved recordings with steps |
| `reports/suggestions.json` | Saved smart test suggestions |
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
