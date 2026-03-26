import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

/** Manages the lifecycle of the MCP server child process within the VS Code extension. */
export class MCPServerManager implements vscode.Disposable {
  private serverProcess: ChildProcess | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.startServer();
  }

  private startServer(): void {
    try {
      const serverPath = join(__dirname, '../../mcp-server/server.js');
      this.serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.serverProcess.on('error', (error: Error) => {
        console.error('MCP Server error:', error);
        vscode.window.showErrorMessage(`MCP Server error: ${error.message}`);
      });

      this.serverProcess.on('exit', (code: number | null) => {
        console.log(`MCP Server exited with code ${code}`);
      });

      console.log('MCP Server started successfully');
    } catch (error) {
      console.error('Failed to start MCP Server:', error);
      vscode.window.showErrorMessage('Failed to start MCP Server');
    }
  }

  public dispose(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
    this.disposables.forEach(d => d.dispose());
  }
}
