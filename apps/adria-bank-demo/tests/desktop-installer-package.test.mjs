import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGER = path.join(ROOT, 'scripts', 'package-windows-installer.py');
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const packageConfig = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function writePeFixture(filePath, includeSignature = true) {
  const executable = Buffer.alloc(1024 * 1024);
  executable.write('MZ', 0, 'ascii');
  executable.writeUInt32LE(64, 0x3c);
  if (includeSignature) executable.write('PE\0\0', 64, 'binary');
  writeFileSync(filePath, executable);
}

test('Windows installer target is a self-contained per-user NSIS build with desktop shortcuts', () => {
  assert.deepEqual(packageConfig.build.win.target, [{ target: 'nsis', arch: ['x64'] }]);
  assert.equal(packageConfig.build.nsis.oneClick, true);
  assert.equal(packageConfig.build.nsis.perMachine, false);
  assert.equal(packageConfig.build.nsis.createDesktopShortcut, true);
  assert.equal(packageConfig.build.nsis.createStartMenuShortcut, true);
  for (const file of ['index.html', 'welcome.html', 'client.html', 'exchange.html', 'electron/**/*', 'src/**/*', 'assets/**/*']) {
    assert.ok(packageConfig.build.files.includes(file), `installer must package ${file}`);
  }
});

test('Windows installer ZIP packager validates PE input and embeds matching checksum and instructions', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'adria-installer-package-'));
  try {
    const installer = path.join(temp, 'Adria-Banka-Demo-Setup-1.2.0-x64.exe');
    const output = path.join(temp, 'Adria-Bank-Demo-Windows-Setup-1.2.0-x64.zip');
    writePeFixture(installer);

    const result = spawnSync(PYTHON, [PACKAGER, '--installer', installer, '--output', output], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /CRC-tested/);
    const zipEntries = spawnSync(PYTHON, ['-c', 'import sys, zipfile; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', output], { encoding: 'utf8' });
    assert.equal(zipEntries.status, 0, zipEntries.stderr);
    assert.match(zipEntries.stdout, /Adria-Bank-Demo-Windows-Setup\/Adria-Banka-Demo-Setup-1\.2\.0-x64\.exe/);
    assert.match(zipEntries.stdout, /Adria-Bank-Demo-Windows-Setup\/INSTALL-WINDOWS-11-HR\.txt/);
    assert.match(zipEntries.stdout, /Adria-Bank-Demo-Windows-Setup\/SHA256SUMS\.txt/);
    assert.match(readFileSync(path.join(ROOT, 'INSTALL-WINDOWS-11-HR.txt'), 'utf8'), /bez Node\.js-a, npm-a/i);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('Windows installer ZIP packager refuses non-PE files', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'adria-invalid-installer-'));
  try {
    const installer = path.join(temp, 'invalid.exe');
    const output = path.join(temp, 'invalid.zip');
    writePeFixture(installer, false);
    const result = spawnSync(PYTHON, [PACKAGER, '--installer', installer, '--output', output], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /valid Windows PE executable/i);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
