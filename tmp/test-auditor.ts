import { runFullAudit } from '../src/auditor/siteAuditor';

async function test() {
  console.log('Starting audit...');
  try {
    const result = await runFullAudit('https://example.com', { includeSeo: true });
    console.log('Audit completed successfully.');
    console.log('UI issues count:', result.categories.ui.issues.length);
    console.log('UI issues:', JSON.stringify(result.categories.ui.issues, null, 2));
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
}

test();
