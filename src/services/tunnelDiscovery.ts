export interface StudioInfo {
  studio_id: string;
  websocket_url: string;
  port: number;
  updated?: string;
}

const TUNNEL_JSON_URL = 'https://mapmedia.nl/tfttunnel/tunnels.json';
const CACHE_TTL_MS = 5 * 60 * 1000;

let _cache: StudioInfo[] | null = null;
let _cacheTime = 0;

export async function fetchStudios(forceRefresh = false): Promise<StudioInfo[]> {
  const now = Date.now();
  if (!forceRefresh && _cache && now - _cacheTime < CACHE_TTL_MS) {
    return _cache;
  }

  const url = `${TUNNEL_JSON_URL}?cb=${now}`;
  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
      'User-Agent': 'DSP-Core-Android/1.0',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const studios: StudioInfo[] = json.studios ?? [];
  _cache = studios;
  _cacheTime = now;
  return studios;
}

export function makeWsUrl(studio: StudioInfo): string {
  let url = studio.websocket_url;
  if (url.startsWith('https://')) return 'wss://' + url.slice(8);
  if (url.startsWith('http://'))  return 'ws://'  + url.slice(7);
  return url;
}
