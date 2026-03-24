import { runFullAudit } from '../src/auditor/siteAuditor';

async function test() {
  console.log('Starting audit...');
  try {
    const result = await runFullAudit('https://example.com', { includeSeo: true });
    console.log('Audit completed successfully.');
    const perfIssues = result.categories.performance.issues;
    console.log('\n🔥 Performance Issues (Integrated):');
    
    if (perfIssues.length === 0) {
      console.log('✅ No major issues detected.');
    } else {
      perfIssues.forEach((issue: any, idx: number) => {
        console.log(`${idx + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
        console.log(`   Selector: ${issue.selector}`);
        console.log(`   Fix: ${issue.recommendation}`);
      });
    }
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
}

test();
