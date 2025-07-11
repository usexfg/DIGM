import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import path from 'path';
import { isDev } from '../shared/utils';

export interface FuegoConfig {
  rpcPort?: number; // default 8888
  dataDir?: string;
}

export class FuegoBridge extends EventEmitter {
  private proc?: ChildProcess;
  private config: Required<FuegoConfig> = { rpcPort: 8888, dataDir: '' };

  start(cfg: FuegoConfig = {}) {
    if (this.proc) return;
    this.config = { ...this.config, ...cfg } as Required<FuegoConfig>;

    const binary = this.resolveBinaryPath();

    const args = [
      `--rpcport=${this.config.rpcPort}`,
      ...(this.config.dataDir ? [`--datadir=${this.config.dataDir}`] : []),
    ];

    this.proc = spawn(binary, args, { stdio: 'ignore' });

    this.proc.on('exit', code => {
      this.proc = undefined;
      this.emit('exit', code);
    });
  }

  stop() {
    if (!this.proc) return;
    this.proc.kill();
    this.proc = undefined;
  }

  async getBalance(): Promise<number> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/balance`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      // assuming response: { balance: number }
      return json.balance ?? 0;
    } catch {
      return 0;
    }
  }

  private resolveBinaryPath(): string {
    if (isDev()) {
      // Expect fuego-node to be installed globally or in PATH during development
      return 'fuego-node';
    }
    // In production, include packaged binary under resources/bin
    return path.join(process.resourcesPath, 'bin', process.platform === 'win32' ? 'fuego-node.exe' : 'fuego-node');
  }
}

export default new FuegoBridge(); 