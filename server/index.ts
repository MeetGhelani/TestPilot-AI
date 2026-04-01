import { chromium } from 'playwright';
import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

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
import type { TestPlan, AuditResult, AuditIssue } from '../src/types/index';
import { runFullAudit } from '../src/auditor/siteAuditor';
import { deviceProfiles } from '../src/auditor/deviceProfiles';
import { generateReportHtml, generateComparisonReportHtml } from './reportTemplate';

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
  try { 
    const scans = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8'));
    return scans.map(normaliseScanSummary);
  } catch { return []; }
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

/** Ensure legacy suggestions have the new structured fields */
function normaliseScanSummary(summary: any): any {
  return {
    ...summary,
    suggestions: (summary.suggestions ?? []).map((sug: any) => {
      // If missing steps but has testDescription, it's a legacy suggestion
      const steps = sug.steps || (sug.testDescription ? [{
        action: 'manual',
        description: sug.testDescription,
        intent: 'legacy_suggestion'
      }] : []);

      return {
        ...sug,
        steps,
        isExecutable: !!sug.steps, // Only newly generated are executable
        confidence: sug.confidence || {
          detection: 0.8,
          selector: 0.8,
          outcome: 0.8
        },
        intent: sug.intent || 'legacy'
      };
    })
  };
}

/** Ensure recordings have the correct structure */
function normaliseRecording(rec: any): any {
  return {
    ...rec,
    steps: (rec.steps ?? []).map((s: any) => ({
      ...s,
      // Target could be string or object, driver handles both but let's ensure it's defined
      target: s.target || undefined
    }))
  };
}

// ─── Run Test ─────────────────────────────────────────────────────────────────

app.post('/api/run-test', async (req, res) => {
  const { platform, url, test, headless, authUser, authPass, isStructured } = req.body;
  if (!platform || !url || !test) {
    return res.status(400).json({ error: 'platform, url, and test are required' });
  }
  try {
    let plan: TestPlan;
    if (isStructured) {
      const steps = typeof test === 'string' ? JSON.parse(test) : test;
      plan = {
        title: 'Suggested Test Execution',
        platform: platform as any,
        naturalLanguageInput: 'Structured suggested test',
        steps,
        version: 1,
      };
    } else {
      plan = await generateTestPlan(test, platform, url);
    }
    
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

app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const history = loadHistory();
  const updated = history.filter((item: any) => (item.id || item.timestamp || item.startedAt) !== id);
  saveHistory(updated);
  res.json({ ok: true });
});

app.post('/api/history/delete-bulk', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const history = loadHistory();
  const updated = history.filter((item: any) => !ids.includes(item.id || item.timestamp || item.startedAt));
  saveHistory(updated);
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
  const { url, authUser, authPass, persona, includeSeo, includeAccessibility, compare } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const options = {
      auth: (authUser || authPass) ? { username: authUser, password: authPass } : undefined,
      persona,
      includeSeo: includeSeo !== false,
      includeAccessibility: includeAccessibility !== false
    };

    let auditData: any;

    if (compare) {
      const profiles = ['desktop', 'mobile', 'lowEndMobile'];
      const comparisons: Record<string, AuditResult> = {};

      for (const p of profiles) {
        comparisons[p] = await runFullAudit(url, { ...options, profile: p });
      }

      auditData = {
        id: Date.now().toString(),
        type: 'audit',
        title: `Comparison Audit: ${new URL(url).hostname}`,
        comparisons,
        // Use desktop as the primary result for top-level stats
        ...comparisons.desktop,
        totalScore: Math.round(Object.values(comparisons).reduce((acc, r) => acc + r.totalScore, 0) / profiles.length)
      };
    } else {
      const result = await runFullAudit(url, options);
      auditData = {
        ...result,
        id: Date.now().toString(),
        type: 'audit' as const,
        title: `Audit: ${new URL(url).hostname}`
      };
    }

    // Persist to dedicated audits file
    const audits = loadAudits();
    audits.unshift(auditData);
    saveAudits(audits.slice(0, 50)); // Keep only the latest 50 audits

    res.json(auditData);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Comparison Logic Helpers
function compareIssues(oldIssues: AuditIssue[], newIssues: AuditIssue[]) {
  const matchedNew = new Set<AuditIssue>();
  const fixed: AuditIssue[] = [];
  const persistent: AuditIssue[] = [];
  const added: AuditIssue[] = [];

  const getHash = (i: AuditIssue) => `${i.type}|${i.message}|${i.selector || ''}`;
  const oldHashes = new Map(oldIssues.map(i => [getHash(i), i]));

  newIssues.forEach(i => {
    const hash = getHash(i);
    if (oldHashes.has(hash)) {
      persistent.push(i);
      matchedNew.add(i);
    } else {
      added.push(i);
    }
  });

  oldIssues.forEach(i => {
    if (!newIssues.some(ni => getHash(ni) === getHash(i))) {
      fixed.push(i);
    }
  });

  return { added, fixed, persistent };
}

app.post('/api/audit/compare', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length < 2) {
    return res.status(400).json({ error: 'At least two audit IDs are required for comparison' });
  }

  try {
    const audits = loadAudits();
    const selectedAudits = ids.map(id => audits.find(a => a.id === id)).filter(Boolean) as AuditResult[];

    if (selectedAudits.length < 2) {
      return res.status(404).json({ error: 'One or more audits not found' });
    }

    // Sort by timestamp ascending to compare sequentially
    selectedAudits.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const results = [];
    for (let i = 1; i < selectedAudits.length; i++) {
      const prev = selectedAudits[i - 1];
      const curr = selectedAudits[i];

      const categoryDiffs: any = {};
      Object.keys(curr.categories).forEach(catKey => {
        const pCat = (prev.categories as any)[catKey];
        const cCat = (curr.categories as any)[catKey];
        if (pCat && cCat) {
          categoryDiffs[catKey] = {
            scoreDiff: cCat.score - pCat.score,
            issues: compareIssues(pCat.issues, cCat.issues)
          };
        }
      });

      results.push({
        fromId: prev.id,
        toId: curr.id,
        fromTimestamp: prev.timestamp,
        toTimestamp: curr.timestamp,
        scoreDiff: curr.totalScore - prev.totalScore,
        categoryDiffs
      });
    }

    res.json({
      audits: selectedAudits,
      comparisons: results,
      summary: {
        totalRuns: selectedAudits.length,
        overallTrend: selectedAudits[selectedAudits.length - 1].totalScore - selectedAudits[0].totalScore
      }
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/audit/download-pdf', async (req, res) => {
  const { auditId } = req.body;
  if (!auditId) return res.status(400).json({ error: 'auditId is required' });

  try {
    const audits = loadAudits();
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const html = generateReportHtml(audit);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const fileName = `audit-report-${new URL(audit.url).hostname}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();

    res.json({ pdfUrl: toWebPath(filePath) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
app.post('/api/audit/download-compare-pdf', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length < 2) {
    return res.status(400).json({ error: 'At least two audit IDs are required' });
  }

  try {
    const audits = loadAudits();
    const selectedAudits = ids.map(id => audits.find(a => a.id === id)).filter(Boolean) as AuditResult[];
    if (selectedAudits.length < 2) return res.status(404).json({ error: 'Audits not found' });

    selectedAudits.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const comparisons = [];
    for (let i = 1; i < selectedAudits.length; i++) {
        const prev = selectedAudits[i - 1];
        const curr = selectedAudits[i];
        const categoryDiffs: any = {};
        Object.keys(curr.categories).forEach(catKey => {
            const pCat = (prev.categories as any)[catKey];
            const cCat = (curr.categories as any)[catKey];
            if (pCat && cCat) {
                categoryDiffs[catKey] = {
                    scoreDiff: cCat.score - pCat.score,
                    issues: compareIssues(pCat.issues, cCat.issues)
                };
            }
          });
        comparisons.push({ fromId: prev.id, toId: curr.id, categoryDiffs });
    }

    const overallTrend = selectedAudits[selectedAudits.length - 1].totalScore - selectedAudits[0].totalScore;
    const html = generateComparisonReportHtml(selectedAudits, comparisons, overallTrend);
    
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' }); // Changed from networkidle for reliability

      const fileName = `comparison-report-${Date.now()}.pdf`;
      const filePath = path.join(REPORTS_DIR, fileName);

      // Wait a bit for Chart.js to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });

      res.json({ pdfUrl: toWebPath(filePath) });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('PDF Generation Error:', err); // Log for server-side debugging
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

app.post('/api/audits/delete-bulk', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const updatedAudits = loadAudits().filter(audit => !ids.includes(audit.id));
  saveAudits(updatedAudits);
  res.json({ ok: true });
});

app.post('/api/audit/highlight', async (req, res) => {
  const { url, selector, message } = req.body;
  if (!url || !selector) return res.status(400).json({ error: 'url and selector are required' });

  try {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle' });

    await page.evaluate(({ sel, msg }: { sel: string, msg: string }) => {
      const el = document.querySelector(sel);
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Wait a bit for scroll to finish
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        const highlight = document.createElement('div');
        highlight.id = 'ai-test-highlight';
        highlight.style.position = 'absolute';
        highlight.style.border = '4px solid #f87171';
        highlight.style.background = 'rgba(248, 113, 113, 0.2)';
        highlight.style.zIndex = '1000000';
        highlight.style.pointerEvents = 'none';
        highlight.style.boxShadow = '0 0 30px rgba(248, 113, 113, 0.5)';
        highlight.style.borderRadius = '6px';
        highlight.style.top = (rect.top + scrollTop) + 'px';
        highlight.style.left = (rect.left + scrollLeft) + 'px';
        highlight.style.width = rect.width + 'px';
        highlight.style.height = rect.height + 'px';

        // Add a label
        const label = document.createElement('div');
        label.innerText = (msg || 'AUDIT ISSUE ELEMENT').toUpperCase();
        label.style.position = 'absolute';
        label.style.top = '-32px';
        label.style.left = '0';
        label.style.background = '#f87171';
        label.style.color = '#fff';
        label.style.fontSize = '11px';
        label.style.fontWeight = '900';
        label.style.padding = '4px 12px';
        label.style.borderRadius = '4px';
        label.style.whiteSpace = 'nowrap';
        label.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        highlight.appendChild(label);

        document.body.appendChild(highlight);

        // Pulsing effect
        highlight.animate([
          { opacity: 0.6, transform: 'scale(1)' },
          { opacity: 1, transform: 'scale(1.02)' },
          { opacity: 0.6, transform: 'scale(1)' }
        ], {
          duration: 1500,
          iterations: Infinity
        });
      }, 500);
    }, { sel: selector, msg: message });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
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
  const { url, suggestionId, testDescription, steps } = req.body;
  if (!url || !suggestionId) return res.status(400).json({ error: 'url and suggestionId are required' });
  const all = loadSuggestions().map(s => {
    if (s.url !== url) return s;
    return {
      ...s,
      suggestions: s.suggestions.map(sg =>
        sg.id === suggestionId ? { 
          ...sg, 
          testDescription: testDescription ?? sg.testDescription, 
          steps: steps ?? sg.steps,
          isExecutable: steps ? true : sg.isExecutable
        } : sg
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
  const recordings = loadRecordings(REPORTS_DIR);
  res.json(recordings.map(normaliseRecording));
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

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_DESTINATION || 'support@testpilot.ai',
      subject: `[Contact Form] ${subject || 'New Inquiry'} from ${name}`,
      text: `
        New message from the TestPilot AI contact form:
        
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
      `,
      replyTo: email
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    res.json({ ok: true });
  } catch (err) {
    console.error('Email Error:', err);
    res.status(500).json({ error: 'Failed to send email. Please try again later.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ TestPilot AI server running on http://localhost:${PORT}`);
});