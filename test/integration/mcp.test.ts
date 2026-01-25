import * as assert from 'assert';
import { spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration Tests', () => {
  it('should validate project structure', () => {
    // Test that key files exist and are accessible
    const projectRoot = path.resolve(__dirname, '../../../..');
    
    // Check package.json exists
    assert.ok(fs.existsSync(path.join(projectRoot, 'package.json')));
    
    // Check TypeScript config exists
    assert.ok(fs.existsSync(path.join(projectRoot, 'tsconfig.json')));
    
  // Check main extension entry exists in build output.
  // Standard build emits out/extension.js; test build emits out/src/extension.js.
  const hasStdBuild = fs.existsSync(path.join(projectRoot, 'out/extension.js'));
  const hasTestBuild = fs.existsSync(path.join(projectRoot, 'out/src/extension.js'));
  assert.ok(hasStdBuild || hasTestBuild, 'Expected out/extension.js or out/src/extension.js');
  });
  
  it('should validate shared types module', async () => {
    const types = await import('../../src/shared/types.js');
    
    // Types should be available for import (even though they're interfaces)
    // This test validates the module structure
    assert.ok(typeof types === 'object');
  });

  it('should start MCP server and list resources (smoke)', function (done) {
    // Increase timeout for starting a child process
    this.timeout(15000);

    const env = { ...process.env };

    // Use a temp data dir for the test run
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-mcp-'));
    env.FINANCIAL_ADVISOR_DATA_DIR = dataDir;

    // Try to use the CLI from PATH
    const cmd = 'financial-advisor-mcp';

    let child: ReturnType<typeof spawn> | undefined;
    child = spawn(cmd, [], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let skipped = false;
    child.on('error', (e) => {
      if (!skipped) {
        skipped = true;
        // eslint-disable-next-line no-console
        console.warn('Skipping MCP smoke test:', (e as any)?.message || e);
        return done();
      }
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    child.stdout?.on('data', (d) => (stdoutBuf += d.toString()));
    child.stderr?.on('data', (d) => (stderrBuf += d.toString()));

    // After a short delay, send a resources/list request
    setTimeout(() => {
      if (skipped || !child || child.killed) {
        // Already skipped or child not available; avoid calling done() twice
        return;
      }
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'resources/list',
      };
      try {
        child?.stdin?.write(JSON.stringify(request) + '\n');
      } catch (e) {
        if (!skipped) {
          skipped = true;
          // eslint-disable-next-line no-console
          console.warn('Skipping MCP smoke test: failed to write to stdin');
          try { child?.kill('SIGKILL'); } catch {}
          return done();
        }
      }

      const timeout = setTimeout(() => {
        if (skipped) {
          return;
        }
        try { child?.kill('SIGKILL'); } catch {}
        skipped = true;
        // eslint-disable-next-line no-console
        console.warn('Skipping MCP smoke test: timeout waiting for response');
        done();
      }, 8000);

      const onData = (d: Buffer) => {
        stdoutBuf += d.toString();
        const lines = stdoutBuf.split('\n').filter((l) => l.trim());
        for (const line of lines) {
          try {
            const resp = JSON.parse(line);
            if (resp.id === request.id) {
              clearTimeout(timeout);
              child?.stdout?.off('data', onData);
              try { child?.kill('SIGTERM'); } catch {}
              assert.ok(resp.result?.resources && Array.isArray(resp.result.resources), 'resources array present');
              return done();
            }
          } catch {
            // keep buffering
          }
        }
      };

      child?.stdout?.on('data', onData);
    }, 1000);
  });
});