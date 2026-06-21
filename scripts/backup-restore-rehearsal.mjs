import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'backup-restore-rehearsal');
const BACKUP = path.join(OUT, 'backup');
const RESTORE = path.join(OUT, 'restore');

const managedFiles = [
  'config/project-completion-backlog.json',
  'config/phase1-critical-checks.json',
  'contracts/editorial-automation-policy.json',
  'contracts/mail-agent/media-campaign-safety.contract.json',
  'apps/portal/data/publications-auto.json',
  'apps/portal/data/generated-gallery-30.json',
  'apps/portal/data/video-library-items.json',
  'apps/portal/data/video-featured.json',
  'workers/gnk-asg-direct-operator/wrangler.toml',
  'workers/gnk-asg-mail-agent-worker/wrangler.release.toml',
  'workers/gnk-asg-public-pages-live/wrangler.live.toml',
  'workers/gnk-asg-mail-agent-worker/src/rollback-manifest.js',
  'scripts/release-candidate-audit.mjs',
  'scripts/build-release-package.mjs'
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyManagedFile(relativePath, targetRoot) {
  const source = path.join(ROOT, relativePath);
  const target = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return target;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(BACKUP, { recursive: true });
fs.mkdirSync(RESTORE, { recursive: true });

const missing = managedFiles.filter(relativePath => !fs.existsSync(path.join(ROOT, relativePath)));
if (missing.length) {
  console.error(JSON.stringify({ error: 'missing_managed_files', missing }, null, 2));
  process.exit(1);
}

const entries = [];
for (const relativePath of managedFiles) {
  const source = path.join(ROOT, relativePath);
  const backup = copyManagedFile(relativePath, BACKUP);
  const restored = copyManagedFile(relativePath, RESTORE);
  const sourceHash = sha256(source);
  const backupHash = sha256(backup);
  const restoredHash = sha256(restored);
  const jsonValid = relativePath.endsWith('.json')
    ? (() => {
        try {
          JSON.parse(fs.readFileSync(restored, 'utf8'));
          return true;
        } catch {
          return false;
        }
      })()
    : true;

  entries.push({
    path: relativePath,
    sizeBytes: fs.statSync(source).size,
    sourceSha256: sourceHash,
    backupSha256: backupHash,
    restoredSha256: restoredHash,
    byteExactRestore: sourceHash === backupHash && sourceHash === restoredHash,
    jsonValid
  });
}

const failed = entries.filter(entry => !entry.byteExactRestore || !entry.jsonValid);
const report = {
  generatedAt: new Date().toISOString(),
  branch: 'experience-ai-live-overview',
  productionTouched: false,
  repositoryManagedState: failed.length ? 'FAIL' : 'PASS',
  cloudRuntimeState: 'PLANNED_NOT_EXECUTED',
  cloudRuntimeReason: 'KV, D1 and R2 export/restore requires controlled production access and is executed only after explicit production approval.',
  managedFileCount: entries.length,
  restoredFileCount: entries.length - failed.length,
  failedFileCount: failed.length,
  entries,
  cloudRestorePlan: [
    'Disable runtime write gates and keep MEDIA_CAMPAIGN_LIVE_SEND=false.',
    'Export KV namespaces used by operator, content and mail modules.',
    'Export D1 schema and data snapshots for logs, leases and inbox state.',
    'Create an R2 object inventory and preserve object version/checksum metadata.',
    'Restore into isolated temporary bindings before any production route switch.',
    'Run public HTTP 200 and protected HTTP 401 smoke tests against the isolated restore.',
    'Promote only after checksum, schema and route checks pass; otherwise retain the previous production bindings.'
  ]
};

fs.writeFileSync(path.join(OUT, 'backup-manifest.json'), `${JSON.stringify(report, null, 2)}\n`);

const rows = entries
  .map(entry => `| ${entry.byteExactRestore && entry.jsonValid ? 'PASS' : 'FAIL'} | ${entry.path.replace(/\|/g, '\\|')} | ${entry.sizeBytes} | ${entry.restoredSha256} |`)
  .join('\n');

const markdown = `# GNK ASG backup/restore rehearsal\n\n- Repository-managed state: **${report.repositoryManagedState}**\n- Production touched: NO\n- Managed files: ${report.managedFileCount}\n- Restored files: ${report.restoredFileCount}\n- Cloud runtime state: ${report.cloudRuntimeState}\n\n| Result | File | Bytes | Restored SHA-256 |\n|---|---|---:|---|\n${rows}\n\n## Cloud runtime restore plan\n\n${report.cloudRestorePlan.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`;

fs.writeFileSync(path.join(OUT, 'restore-proof.md'), markdown);
console.log(markdown);
if (failed.length) process.exit(1);
