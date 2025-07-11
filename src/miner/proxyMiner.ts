import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface MinerStats {
  accepted: number;
  rejected: number;
  lastAcceptedAt?: number;
}

export interface MinerOptions {
  wallet: string;
  threads?: number;
  poolUrl?: string; // e.g. stratum+tcp://pool.usexfg.org:3333
}

/**
 * ProxyMiner wraps a cpuminer-compatible binary and emits 'stats' events.
 * It is intentionally lightweight; any PARA reward calculation happens elsewhere.
 */
export class ProxyMiner extends EventEmitter {
  private proc?: ChildProcess;
  private stats: MinerStats = { accepted: 0, rejected: 0 };

  start(opts: MinerOptions) {
    if (this.proc) return; // already running

    const {
      wallet,
      threads = 1,
      poolUrl = 'stratum+tcp://pool.usexfg.org:3333',
    } = opts;

    // In packaged builds the binary will reside in resources/bin
    const bin = process.platform === 'win32' ? 'xfg-cpuminer.exe' : 'xfg-cpuminer';
    const args = [
      '-a', 'auto',
      '-o', poolUrl,
      '-u', 'digmProxy',
      '-p', 'x',
      '--extranonce', wallet,
      '-t', String(threads),
    ];

    this.proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    this.proc.stdout?.on('data', buf => this.handleOutput(buf.toString()));
    this.proc.stderr?.on('data', buf => this.emit('error', buf.toString()));
    this.proc.on('close', code => {
      this.proc = undefined;
      this.emit('exit', code);
    });
  }

  stop() {
    if (!this.proc) return;
    this.proc.kill();
    this.proc = undefined;
  }

  private handleOutput(line: string) {
    if (/accepted/.test(line)) {
      this.stats.accepted += 1;
      this.stats.lastAcceptedAt = Date.now();
      this.emit('stats', { ...this.stats });
    } else if (/rejected/.test(line)) {
      this.stats.rejected += 1;
      this.emit('stats', { ...this.stats });
    }
  }
}

export default new ProxyMiner(); 