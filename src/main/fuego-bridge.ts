import { spawn, ChildProcess } from "child_process";
import fetch from "node-fetch";
import { EventEmitter } from "events";
import path from "path";
import { isDev } from "../shared/utils";

export interface FuegoConfig {
  rpcPort?: number; // default 8888
  dataDir?: string;
}

export class FuegoBridge extends EventEmitter {
  private proc?: ChildProcess;
  private config: Required<FuegoConfig> = { rpcPort: 8888, dataDir: "" };

  start(cfg: FuegoConfig = {}) {
    if (this.proc) return;
    this.config = { ...this.config, ...cfg } as Required<FuegoConfig>;

    const binary = this.resolveBinaryPath();

    const args = [
      `--rpcport=${this.config.rpcPort}`,
      ...(this.config.dataDir ? [`--datadir=${this.config.dataDir}`] : []),
    ];

    this.proc = spawn(binary, args, { stdio: "ignore" });

    this.proc.on("exit", (code) => {
      this.proc = undefined;
      this.emit("exit", code);
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

  /**
   * Create a 0x0B Album License transaction on Fuego
   * @param licensePayload JSON-serializable 0x0B extra data
   * @returns the new transaction hash
   */
  async createAlbumLicense(
    licensePayload: Record<string, any>,
  ): Promise<string> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/create_album_license`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(licensePayload),
      });
      if (!res.ok) throw new Error(`RPC error ${res.status}`);
      const json = await res.json();
      return json.txHash;
    } catch (e) {
      throw new Error(`createAlbumLicense failed: ${e}`);
    }
  }

  /**
   * Get album licenses for a buyer
   * @param buyerKey Public key of the buyer
   * @param albumId Optional album ID to filter licenses
   * @returns Array of license transaction hashes
   */
  async getAlbumLicenses(
    buyerKey: string,
    albumId?: string,
  ): Promise<string[]> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/get_album_licenses`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerKey, albumId: albumId || "" }),
      });
      if (!res.ok) throw new Error(`RPC error ${res.status}`);
      const json = await res.json();
      return json.licenseTxHashes || [];
    } catch (e) {
      throw new Error(`getAlbumLicenses failed: ${e}`);
    }
  }

  private resolveBinaryPath(): string {
    if (isDev()) {
      // Expect fuego-node to be installed globally or in PATH during development
      return "fuego-node";
    }
    // In production, include packaged binary under resources/bin
    return path.join(
      process.resourcesPath,
      "bin",
      process.platform === "win32" ? "fuego-node.exe" : "fuego-node",
    );
  }

  /**
   * Check if user has premium status based on XFG balance
   * @param address XFG wallet address
   * @param threshold Minimum XFG required for premium status
   * @returns boolean indicating premium status
   */
  async checkPremiumStatus(
    address: string,
    threshold: number = 0.0008,
  ): Promise<boolean> {
    try {
      const balance = await this.getBalance(address);
      return balance >= threshold;
    } catch (error) {
      console.error("Failed to check premium status:", error);
      return false;
    }
  }

  /**
   * Get XFG balance for a wallet address
   * @param address XFG wallet address
   * @returns balance in XFG
   */
  async getBalance(address: string): Promise<number> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/getbalance`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) throw new Error(`RPC error ${res.status}`);
      const json = await res.json();
      return json.balance || 0;
    } catch (error) {
      console.error("Failed to get balance:", error);
      return 0;
    }
  }

  /**
   * Send XFG transaction
   * @param from Sender's wallet address
   * @param to Recipient's wallet address
   * @param amount Amount to send in XFG
   * @param memo Optional memo
   * @returns transaction hash
   */
  async sendTransaction(
    from: string,
    to: string,
    amount: number,
    memo?: string,
  ): Promise<string> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/send_transaction`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, amount, memo }),
      });
      if (!res.ok) throw new Error(`RPC error ${res.status}`);
      const json = await res.json();
      return json.hash;
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
  }

  /**
   * Get transaction history for an address
   * @param address XFG wallet address
   * @param limit Maximum number of transactions to return
   * @returns Array of transactions
   */
  async getTransactionHistory(
    address: string,
    limit: number = 100,
  ): Promise<any[]> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/get_transfers`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, limit }),
      });
      if (!res.ok) throw new Error(`RPC error ${res.status}`);
      const json = await res.json();
      return json.transfers || [];
    } catch (error) {
      console.error("Failed to get transaction history:", error);
      return [];
    }
  }

  /**
   * Generate new wallet address
   * @returns New wallet address and private key
   */
  async generateWallet(): Promise<{ address: string; privateKey: string }> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/create_address`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`RPC error ${res.status}`);
      const json = await res.json();
      return {
        address: json.address,
        privateKey: json.private_key,
      };
    } catch (error) {
      console.error("Failed to generate wallet:", error);
      throw error;
    }
  }

  /**
   * Import wallet from private key
   * @param privateKey Private key in hex format
   * @returns Wallet address
   */
  async importWallet(privateKey: string): Promise<string> {
    const url = `http://localhost:${this.config.rpcPort}/api/v1/import_address`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ private_key: privateKey }),
      });
      if (!res.ok) throw new Error(`RPC error ${res.status}`);
      const json = await res.json();
      return json.address;
    } catch (error) {
      console.error("Failed to import wallet:", error);
      throw error;
    }
  }

  /**
   * Get current mining pool information
   * @returns Pool statistics and status
   */
  async getPoolInfo(): Promise<{
    connected: boolean;
    hashrate: number;
    workers: number;
    difficulty: number;
  }> {
    // This would connect to the actual mining pool API
    // For now, return mock data
    return {
      connected: true,
      hashrate: 1000000, // Hashes per second
      workers: 50,
      difficulty: 100000,
    };
  }

  /**
   * Calculate PARA rewards for mining contribution
   * @param hashrate Current mining hashrate
   * @param uptime Mining session uptime in seconds
   * @param isPremium Whether user has premium status
   * @returns Estimated PARA rewards
   */
  calculatePARARewards(
    hashrate: number,
    uptime: number,
    isPremium: boolean,
  ): number {
    const baseRate = 0.001; // Base PARA per hash
    const timeMultiplier = Math.min(1 + (uptime / 3600) * 0.1, 2); // Up to 2x for long sessions
    const premiumMultiplier = isPremium ? 1.5 : 1.0;

    // Simplified calculation - in reality would use actual mining shares
    const estimatedHashes = hashrate * uptime;
    return estimatedHashes * baseRate * timeMultiplier * premiumMultiplier;
  }
}

export default new FuegoBridge();
