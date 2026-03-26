/**
 * MCP Server Manager for VSCode Extension
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

/**
 * Manages the lifecycle of the MCP (Model Context Protocol) server process,
 * including starting, stopping, and communicating with it via JSON-RPC over stdio.
 */
export class MCPServerManager {
  private process?: ChildProcess;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async start(): Promise<void> {
    if (this.process) {
      await this.stop();
    }

    const config = vscode.workspace.getConfiguration('financialAdvisor');
    const dataDir = config.get<string>('mcpServer.dataDir');
    const serverPath = config.get<string>('mcpServer.path');

    if (!dataDir) {
      throw new Error('MCP server data directory not configured');
    }

    // Use the server from the extension bundle or system PATH
    const mcpServerCommand = serverPath || 'financial-advisor-mcp';

    try {
      this.process = spawn(mcpServerCommand, [], {
        env: {
          ...process.env,
          FINANCIAL_ADVISOR_DATA_DIR: dataDir,
          FINANCIAL_ADVISOR_ENCRYPTION_KEY: this.getEncryptionKey()
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.on('error', (error) => {
        console.error('MCP Server error:', error);
        vscode.window.showErrorMessage(`MCP Server error: ${error.message}`);
      });

      this.process.on('exit', (code) => {
        console.log(`MCP Server exited with code ${code}`);
        this.process = undefined;
      });

      // Wait a bit for the server to start
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      throw new Error(`Failed to start MCP server: ${error}`);
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        if (this.process) {
          this.process.on('exit', () => resolve());
          setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
        } else {
          resolve();
        }
      });
      
      this.process = undefined;
    }
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.process) {
      throw new Error('MCP server is not running');
    }

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      const requestStr = JSON.stringify(request) + '\n';
      
      let responseData = '';
      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        // Check if we have a complete JSON response
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              this.process?.stdout?.off('data', onData);
              
              if (response.error) {
                reject(new Error(response.error.message));
              } else {
                resolve(response.result);
              }
              return;
            }
          }
        } catch {
          // Not complete JSON yet, continue waiting
        }
      };

      this.process?.stdout?.on('data', onData);
      
      // Set timeout
      setTimeout(() => {
        this.process?.stdout?.off('data', onData);
        reject(new Error('MCP server request timeout'));
      }, 10000);

      this.process?.stdin?.write(requestStr);
    });
  }

  async listResources(): Promise<any> {
    if (!this.process) {
      throw new Error('MCP server is not running');
    }

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'resources/list'
      };

      const requestStr = JSON.stringify(request) + '\n';
      
      let responseData = '';
      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              this.process?.stdout?.off('data', onData);
              
              if (response.error) {
                reject(new Error(response.error.message));
              } else {
                resolve(response.result);
              }
              return;
            }
          }
        } catch {
          // Not complete JSON yet
        }
      };

      this.process.stdout?.on('data', onData);
      
      setTimeout(() => {
        this.process?.stdout?.off('data', onData);
        reject(new Error('MCP server request timeout'));
      }, 10000);

      this.process.stdin?.write(requestStr);
    });
  }

  async readResource(uri: string): Promise<any> {
    if (!this.process) {
      throw new Error('MCP server is not running');
    }

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'resources/read',
        params: { uri }
      };

      const requestStr = JSON.stringify(request) + '\n';
      
      let responseData = '';
      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              this.process?.stdout?.off('data', onData);
              
              if (response.error) {
                reject(new Error(response.error.message));
              } else {
                resolve(response.result);
              }
              return;
            }
          }
        } catch {
          // Not complete JSON yet
        }
      };

      this.process.stdout?.on('data', onData);
      
      setTimeout(() => {
        this.process?.stdout?.off('data', onData);
        reject(new Error('MCP server request timeout'));
      }, 10000);

      this.process.stdin?.write(requestStr);
    });
  }

  isRunning(): boolean {
    return !!this.process;
  }

  private getEncryptionKey(): string {
    const config = vscode.workspace.getConfiguration('financialAdvisor');
    const encryptionEnabled = config.get<boolean>('security.encryptionEnabled');
    
    if (!encryptionEnabled) {
      return '';
    }

    // In a real implementation, this should be securely managed
    // For now, generate a simple key based on workspace
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return Buffer.from(workspaceFolder.uri.fsPath).toString('base64').substring(0, 32);
    }
    
    return 'default-financial-advisor-key';
  }
}