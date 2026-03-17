import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

import { generateTestPlan } from '../src/ai/testGenerator';
import { runTest, getLiveReplayState, abortReplay } from '../src/runner/testRunner';
import { scanAndSuggest } from '../src/suggester/testSuggester';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  getRecordingStatus,
  loadRecordings,
  deleteRecording,
} from '../src/recorder/testRecorder';
import type { ScanSummary } from '../src/suggester/testSuggester';
import type { TestPlan, AuditResult } from '../src/types/index';
import { runFullAudit } from '../src/auditor/siteAuditor';

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(process.cwd(), 'data'); // New data directory
const REPORTS_DIR = path.join(DATA_DIR, 'reports');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const AUDITS_FILE = path.join(DATA_DIR, 'audits.json');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'suggestions.json');

app.use(cors());
app.use(express.json());
// Serve screenshots and HTML reports as static files
app.use('/reports', express.static(REPORTS_DIR));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, '[]');
  if (!fs.existsSync(AUDITS_FILE)) fs.writeFileSync(AUDITS_FILE, '[]');
  if (!fs.existsSync(SUGGESTIONS_FILE)) fs.writeFileSync(SUGGESTIONS_FILE, '[]');
}

function loadHistory() {
  ensureDataFiles();
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
}

function saveHistory(history: any[]) {
  ensureDataFiles();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function loadSuggestions(): ScanSummary[] {
  ensureDataFiles();
  try { return JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8')); } catch { return []; }
}

function saveSuggestions(scans: ScanSummary[]) {
  ensureDataFiles();
  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(scans, null, 2));
}

function loadAudits(): AuditResult[] {
  ensureDataFiles();
  try { return JSON.parse(fs.readFileSync(AUDITS_FILE, 'utf8')); } catch { return []; }
}

function saveAudits(audits: AuditResult[]) {
  ensureDataFiles();
  fs.writeFileSync(AUDITS_FILE, JSON.stringify(audits, null, 2));
}

/** Convert an absolute file path inside REPORTS_DIR to a /reports/... URL path */
function toWebPath(absPath: string | undefined): string | undefined {
  if (!absPath) return undefined;
  const rel = path.relative(REPORTS_DIR, absPath).replace(/\\/g, '/');
  return `/reports/${rel}`;
}

/** Normalise all screenshot/report paths in a TestResult to web URLs */
function normaliseResult(result: any): any {
  return {
    ...result,
    reportPath: toWebPath(result.reportPath),
    stepResults: (result.stepResults ?? []).map((sr: any) => ({
      ...sr,
      screenshotPath: toWebPath(sr.screenshotPath),
    })),
  };
}

// ─── Run Test ─────────────────────────────────────────────────────────────────

app.post('/api/run-test', async (req, res) => {
  const { platform, url, test, headless, authUser, authPass } = req.body;
  if (!platform || !url || !test) {
    return res.status(400).json({ error: 'platform, url, and test are required' });
  }
  try {
    const plan: TestPlan = await generateTestPlan(test, platform, url);
    const result = await runTest(plan, url, {
      outputDir: REPORTS_DIR,
      headless: headless ?? true,
      authUser,
      authPass,
    });

    const normResult = normaliseResult(result);

    // Persist to history
    const history = loadHistory();
    history.push(normResult);
    if (history.length > 100) history.splice(0, history.length - 100);
    saveHistory(history);

    res.json(normResult);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── History ──────────────────────────────────────────────────────────────────

app.get('/api/history', (_req, res) => {
  res.json(loadHistory());
});

app.delete('/api/history', (_req, res) => {
  saveHistory([]);
  res.json({ ok: true });
});

// ─── Replay status / abort (used by RecordReplay UI) ─────────────────────────

app.get('/api/replay/status', (_req, res) => {
  res.json(getLiveReplayState());
});

app.post('/api/replay/abort', (_req, res) => {
  abortReplay();
  res.json({ ok: true });
});

// Replay a recorded test
app.post('/api/replay', async (req, res) => {
  const { steps, url, title, headless, authUser, authPass } = req.body;
  if (!steps || !url) {
    return res.status(400).json({ error: 'steps and url are required' });
  }
  try {
    const plan: TestPlan = {
      title: title ?? 'Recorded Test',
      platform: 'web',
      naturalLanguageInput: title ?? 'Recorded Test',
      steps,
    };
    const result = await runTest(plan, url, {
      outputDir: REPORTS_DIR,
      headless: headless ?? true,
      authUser,
      authPass,
    });

    const normResult = normaliseResult(result);

    // Persist to history
    const history = loadHistory();
    history.push(normResult);
    if (history.length > 100) history.splice(0, history.length - 100);
    saveHistory(history);

    res.json(normResult);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Smart Suggester ──────────────────────────────────────────────────────────

app.post('/api/suggest', async (req, res) => {
  const { url, siteName, authUser, authPass } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const summary = await scanAndSuggest(url, authUser, authPass);
    if (siteName) summary.siteName = siteName;

    // Persist / overwrite for this URL
    const all = loadSuggestions();
    const idx = all.findIndex(s => s.url === summary.url);
    if (idx >= 0) all[idx] = summary; else all.push(summary);
    saveSuggestions(all);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Site Audit ──────────────────────────────────────────────────────────────

app.post('/api/audit', async (req, res) => {
  const { url, authUser, authPass, persona, includeSeo } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const result = await runFullAudit(url, { 
      auth: (authUser || authPass) ? { username: authUser, password: authPass } : undefined, 
      persona,
      includeSeo: includeSeo !== false // Default to true if not provided
    });
    
    const auditData = {
      ...result,
      id: Date.now().toString(),
      type: 'audit' as const,
      title: `Audit: ${new URL(url).hostname}`
    };

    // Persist to dedicated audits file
    const audits = loadAudits();
    audits.unshift(auditData);
    saveAudits(audits.slice(0, 50)); // Keep only the latest 50 audits
    
    res.json(auditData);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/audits', (_req, res) => {
  res.json(loadAudits());
});

app.delete('/api/audits', (_req, res) => {
  saveAudits([]);
  res.json({ ok: true });
});

app.delete('/api/audits/:id', (req, res) => {
  const { id } = req.params;
  const updatedAudits = loadAudits().filter(audit => audit.id !== id);
  saveAudits(updatedAudits);
  res.json({ ok: true });
});

app.get('/api/suggestions', (_req, res) => {
  res.json(loadSuggestions());
});

app.delete('/api/suggestions', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const updated = loadSuggestions().filter(s => s.url !== url);
  saveSuggestions(updated);
  res.json({ ok: true });
});

app.post('/api/suggestions/rename', (req, res) => {
  const { url, siteName } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const all = loadSuggestions().map(s => s.url === url ? { ...s, siteName } : s);
  saveSuggestions(all);
  res.json({ ok: true });
});

app.post('/api/suggestions/update', (req, res) => {
  const { url, suggestionId, testDescription } = req.body;
  if (!url || !suggestionId) return res.status(400).json({ error: 'url and suggestionId are required' });
  const all = loadSuggestions().map(s => {
    if (s.url !== url) return s;
    return {
      ...s,
      suggestions: s.suggestions.map(sg =>
        sg.id === suggestionId ? { ...sg, testDescription } : sg
      ),
    };
  });
  saveSuggestions(all);
  res.json({ ok: true });
});

// ─── Recorder ─────────────────────────────────────────────────────────────────

app.post('/api/record/start', async (req, res) => {
  const { url, authUser, authPass } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    await startRecording(url, authUser, authPass);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/record/stop', async (req, res) => {
  const { title } = req.body;
  try {
    const recording = await stopRecording(title ?? 'Recording', REPORTS_DIR);
    res.json(recording);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/record/status', (_req, res) => {
  res.json(getRecordingStatus());
});

app.post('/api/record/cancel', async (_req, res) => {
  try {
    await cancelRecording();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Recordings CRUD ──────────────────────────────────────────────────────────

app.get('/api/recordings', (_req, res) => {
  res.json(loadRecordings(REPORTS_DIR));
});

app.delete('/api/recordings/:id', (req, res) => {
  deleteRecording(req.params.id, REPORTS_DIR);
  res.json({ ok: true });
});

app.post('/api/recordings/:id/update', (req, res) => {
  const { id } = req.params;
  const { steps } = req.body;
  const recordingsFile = path.join(REPORTS_DIR, 'recordings.json');
  const all = loadRecordings(REPORTS_DIR).map(r =>
    r.id === id ? { ...r, steps } : r
  );
  fs.writeFileSync(recordingsFile, JSON.stringify(all, null, 2));
  res.json({ ok: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ TestPilot AI server running on http://localhost:${PORT}`);
});