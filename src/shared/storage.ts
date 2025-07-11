import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as https from 'https';

/**
 * Returns the absolute path on disk where a chunk with the given CID should be cached.
 */
export function getChunkPath(cid: string): string {
  const base = path.join(os.homedir(), '.digm', 'cache');
  return path.join(base, cid);
}

/**
 * Ensure cache directory exists.
 */
async function ensureCacheDir() {
  const base = path.dirname(getChunkPath('placeholder'));
  try {
    await fs.mkdir(base, { recursive: true });
  } catch {
    /* ignore */
  }
}

/**
 * Fetch a chunk from Elder Nodes using Helia/IPFS.
 * Falls back to HTTP endpoints for development.
 */
export async function fetchChunk(cid: string, elderNodes: string[] = []): Promise<Buffer> {
  await ensureCacheDir();
  const local = getChunkPath(cid);
  
  // Try local cache first
  try {
    return await fs.readFile(local);
  } catch {
    /* not cached */
  }

  // In production, we'll use Helia to fetch from IPFS network
  // For now, fallback to HTTP from Elder Nodes
  for (const nodeUrl of elderNodes) {
    try {
      const data = await downloadFromElderNode(nodeUrl, cid);
      await fs.writeFile(local, data);
      return data;
    } catch {
      // try next node
    }
  }
  
  throw new Error(`Chunk ${cid} not found on provided Elder Nodes`);
}

/**
 * Download chunk from Elder Node HTTP endpoint
 */
function downloadFromElderNode(nodeUrl: string, cid: string): Promise<Buffer> {
  const url = `${nodeUrl.replace(/\/$/, '')}/chunks/${cid}`;
  return download(url);
}

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

/**
 * Initialize Helia node for P2P content fetching
 * This will be called from the main process
 */
export async function initializeHeliaNode() {
  try {
    // Dynamic import to avoid issues in renderer process
    const { createHelia } = await import('helia');
    const { unixfs } = await import('@helia/unixfs');
    
    const helia = await createHelia();
    const fs = unixfs(helia);
    
    return { helia, fs };
  } catch (error) {
    console.warn('Failed to initialize Helia node:', error);
    return null;
  }
} 