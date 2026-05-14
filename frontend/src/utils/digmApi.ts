const API_BASE = 'http://localhost:8889/api/digm';

export interface BalanceResponse {
  para: number;
  vox: number;
  cura: number;
}

export interface SinglePool {
  track_id: string;
  album_id: string;
  total_para: number;
  votes: number;
}

export interface AlbumRanking {
  album_id: string;
  title: string;
  total_sales: number;
  rank: number;
}

export async function getAddress(): Promise<string> {
  const res = await fetch(`${API_BASE}/address`);
  const data = await res.json();
  return data.address;
}

export async function getBalance(address: string): Promise<BalanceResponse> {
  const res = await fetch(`${API_BASE}/balance/${address}`);
  return res.json();
}

export async function getSinglePools(): Promise<SinglePool[]> {
  const res = await fetch(`${API_BASE}/single-pools`);
  return res.json();
}

export async function getAlbumRankings(): Promise<AlbumRanking[]> {
  const res = await fetch(`${API_BASE}/album-rankings`);
  return res.json();
}

export async function stakeAlbum(address: string, albumId: string, amount: number): Promise<void> {
  await fetch(`${API_BASE}/stake-album`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, album_id: albumId, amount }),
  });
}

export async function purchaseAlbum(address: string, albumId: string, amount: number): Promise<void> {
  await fetch(`${API_BASE}/purchase-album`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, album_id: albumId, amount }),
  });
}
