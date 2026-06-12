import { MOVIE_API_BASE, MASTER_API_BASE } from '@/constants';
import type { Movie, StreamResponse, StreamQuality } from '@/types';

// All API calls now go through https://master-streaming-api.onrender.com/api
const API = MOVIE_API_BASE;

interface BrowseResponse {
  code: number;
  success: boolean;
  data: {
    pager: { hasMore: boolean; nextPage: string; page: string; perPage: number; totalCount: number };
    items: Movie[];
  };
}

interface TrendingResponse {
  code: number;
  success: boolean;
  data: { subjectList: Movie[] };
}

interface SearchResponse {
  code: number;
  success: boolean;
  data: {
    pager: { hasMore: boolean; nextPage: string; page: string };
    items: Movie[];
  };
}

export interface Episode {
  id: string;
  showboxId?: number;
  name: string;
  title?: string;
  episode: number;
  season: number;
  duration?: number;
  cover?: string;
  airDate?: string;
  synopsis?: string;
}

export interface SeasonData {
  season: number;
  episodes: Episode[];
}

interface ShowboxResult {
  id: number;
  box_type: number;
  title: string;
  description?: string;
  poster?: string;
  imdb_rating?: string;
  year?: number;
  last_episode?: { season: number; episode: number };
}

const showboxIdCache = new Map<string, number>();

// ─── Stream response shapes from master API ───────────────────────────────────
//
// movies   → { success, category:"movies",    type:"hls",      proxyUrl, targetUrl, headers, combinedUrl }
// tvshows  → { success, category:"tvshows",   type:"hls",      proxyUrl, targetUrl, headers, combinedUrl }
// sports   → { success, category:"sports",    type:"hls-live", decrypter, baseUrl, streamPath }
// anime    → { success, category:"anime",     type:"api-gateway", gatewayUrl, cdnTarget }
// wrestling→ { success, category:"wrestling", type:"embed",    url }
//
// pickBestStream maps any of these to a StreamQuality.proxyUrl the VideoPlayer can consume.

export function pickBestStream(response: unknown): StreamQuality | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;

  // ── HLS (movies / tvshows): use combinedUrl (proxy already baked in) ──
  if (r.combinedUrl && typeof r.combinedUrl === 'string') {
    return { proxyUrl: r.combinedUrl, resolutions: '720', quality: '720' };
  }

  // ── HLS-live (sports): assemble baseUrl + streamPath ──
  if (r.type === 'hls-live') {
    const base = typeof r.baseUrl === 'string' ? r.baseUrl.replace(/\/$/, '') : '';
    const path = typeof r.streamPath === 'string' ? r.streamPath : '';
    if (base && path) return { proxyUrl: `${base}${path}`, resolutions: '720', quality: '720' };
  }

  // ── API-gateway (anime): use gatewayUrl ──
  if (r.type === 'api-gateway' && typeof r.gatewayUrl === 'string') {
    return { proxyUrl: r.gatewayUrl, resolutions: '720', quality: '720' };
  }

  // ── Embed (wrestling): use url ──
  if (r.type === 'embed' && typeof r.url === 'string') {
    return { proxyUrl: r.url, resolutions: '720', quality: '720', isEmbed: true };
  }

  // ── Legacy / streams array ──
  const tryExtract = (obj: unknown): StreamQuality[] => {
    if (!obj || typeof obj !== 'object') return [];
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.streams)) {
      const valid = (o.streams as StreamQuality[]).filter(s => s?.proxyUrl);
      if (valid.length > 0) return valid;
    }
    if (o.data && typeof o.data === 'object') {
      const nested = tryExtract(o.data);
      if (nested.length > 0) return nested;
    }
    if (typeof o.proxyUrl === 'string' && o.proxyUrl) return [o as StreamQuality];
    for (const val of Object.values(o)) {
      if (val && typeof val === 'object') {
        const found = tryExtract(val);
        if (found.length > 0) return found;
      }
    }
    return [];
  };

  const streams = tryExtract(response);
  if (streams.length === 0) return null;
  const prefer = (res: string) => streams.find(s => String(s.resolutions || s.quality || '') === res);
  return prefer('1080') || prefer('720') || prefer('480') || prefer('360') || streams[0];
}

// ─── Search showbox catalog (used for TV episode lists) ──────────────────────
async function findShowboxId(title: string, type: 'movie' | 'tv'): Promise<number | null> {
  const cacheKey = `${type}:${title.toLowerCase()}`;
  if (showboxIdCache.has(cacheKey)) return showboxIdCache.get(cacheKey)!;

  try {
    const keywords = [
      title,
      title.split(' ').slice(0, 3).join(' '),
      title.split(' ')[0],
    ].filter((k, i, arr) => k && arr.indexOf(k) === i);

    for (const keyword of keywords) {
      const url = `${API}/showbox/search?keyword=${encodeURIComponent(keyword)}&type=${type}`;
      const res = await fetch(url);
      const json = await res.json();
      const items: ShowboxResult[] = json.data || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      const titleLower = title.toLowerCase();
      const match =
        items.find(i => i.title.toLowerCase() === titleLower) ||
        items.find(i => titleLower.includes(i.title.toLowerCase()) || i.title.toLowerCase().includes(titleLower)) ||
        items[0];

      if (match?.id) {
        showboxIdCache.set(cacheKey, match.id);
        return match.id;
      }
    }
  } catch (e) {
    console.error('[findShowboxId] error:', e);
  }
  return null;
}

// ─── Core stream fetcher ──────────────────────────────────────────────────────
// Routes to the correct master API endpoint based on category/type
export async function fetchStreamForId(
  id: string,
  type: string = 'movie',
  episodeId?: string,
  title?: string,
  episodeNum?: number,
  seasonNum?: number
): Promise<StreamQuality | null> {
  const category = type === '2' || type === 'tv' ? 'tvshows' : 'movies';
  console.log('[fetchStreamForId]', { id, category, title, episodeNum, seasonNum });

  // Build candidate URLs using master API
  const tryUrls: string[] = [];

  if (category === 'tvshows' && seasonNum !== undefined && episodeNum !== undefined) {
    tryUrls.push(`${API}/stream?id=${id}&type=tv&season=${seasonNum}&episode=${episodeNum}`);
    tryUrls.push(`${API}/showbox/streams?id=${id}&type=tv&season=${seasonNum}&episode=${episodeNum}`);
  } else if (category === 'tvshows') {
    tryUrls.push(`${API}/stream?id=${id}&type=tv&season=1&episode=1`);
    tryUrls.push(`${API}/showbox/streams?id=${id}&type=tv`);
  } else {
    tryUrls.push(`${API}/stream?id=${id}&type=movie`);
    tryUrls.push(`${API}/showbox/streams?id=${id}&type=movie`);
    tryUrls.push(`${API}/bff/stream?id=${id}&type=movie`);
    tryUrls.push(`${API}/play?id=${id}&type=movie`);
  }

  for (const url of tryUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.trim() === '[]' || text.trim() === 'null' || text.trim() === '{}') continue;
      let json: unknown;
      try { json = JSON.parse(text); } catch { continue; }
      const stream = pickBestStream(json);
      if (stream?.proxyUrl) return stream;
    } catch (e) {
      console.error('[Stream] Failed:', url, e);
    }
  }

  console.warn('[Stream] ❌ No stream found for', id, title);
  return null;
}

// ─── Fetch TV episodes ────────────────────────────────────────────────────────
export async function fetchEpisodes(id: string, title?: string, season?: number): Promise<SeasonData[]> {
  try {
    let showboxId: number | null = null;
    if (title) showboxId = await findShowboxId(title, 'tv');

    const resolvedId = showboxId || id;
    const url = `${API}/showbox/tv?id=${resolvedId}`;
    const res = await fetch(url);
    const json = await res.json();

    const data = json.data || json;
    const episodeList: Record<string, unknown>[] = data.episode || data.episodes || [];
    if (!Array.isArray(episodeList) || episodeList.length === 0) return [];

    const seasonMap = new Map<number, Episode[]>();
    for (const ep of episodeList) {
      const s = Number(ep.season || 1);
      if (season !== undefined && s !== season) continue;
      const episodeObj: Episode = {
        id: String(ep.id),
        showboxId: showboxId || undefined,
        name: String(ep.title || `Episode ${ep.episode}`),
        episode: Number(ep.episode || 0),
        season: s,
        duration: Number(ep.runtime || 0),
        cover: String(ep.thumbs || ep.thumbs_org || ''),
        airDate: String(ep.released || ''),
        synopsis: String(ep.synopsis || ''),
      };
      if (!seasonMap.has(s)) seasonMap.set(s, []);
      seasonMap.get(s)!.push(episodeObj);
    }

    const result: SeasonData[] = Array.from(seasonMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([s, eps]) => ({
        season: s,
        episodes: eps.sort((a, b) => a.episode - b.episode),
      }));

    if (result.length === 0) {
      const epUrl = season
        ? `${API}/episodes?id=${id}&season=${season}`
        : `${API}/episodes?id=${id}`;
      const epRes = await fetch(epUrl);
      const epJson = await epRes.json();
      if (epJson.data?.episodes && Array.isArray(epJson.data.episodes)) {
        return [{ season: season || 1, episodes: (epJson.data.episodes as Record<string, unknown>[]).map((e, i) => ({
          id: String(e.id || i),
          name: String(e.name || e.title || `Episode ${i + 1}`),
          episode: Number(e.episode || i + 1),
          season: Number(e.season || season || 1),
          duration: Number(e.duration || 0),
          cover: String(e.cover || e.thumbnail || ''),
          airDate: String(e.airDate || ''),
        })) }];
      }
    }

    return result;
  } catch (err) {
    console.error('[fetchEpisodes] error:', err);
    return [];
  }
}

// ─── Browse / search endpoints ────────────────────────────────────────────────
export async function fetchTrending(): Promise<Movie[]> {
  try {
    const res = await fetch(`${API}/trending`);
    const json: TrendingResponse = await res.json();
    return json.data?.subjectList || [];
  } catch (err) { console.error('fetchTrending error:', err); return []; }
}

export async function fetchBrowse(category: string = 'movie', page: string = '1'): Promise<BrowseResponse['data']> {
  try {
    const res = await fetch(`${API}/browse?category=${category}&page=${page}`);
    const json: BrowseResponse = await res.json();
    return json.data || { pager: { hasMore: false, nextPage: '1', page: '1', perPage: 24, totalCount: 0 }, items: [] };
  } catch (err) { console.error('fetchBrowse error:', err); return { pager: { hasMore: false, nextPage: '1', page: '1', perPage: 24, totalCount: 0 }, items: [] }; }
}

export async function searchMovies(keyword: string, page: string = '1'): Promise<SearchResponse['data']> {
  try {
    const res = await fetch(`${API}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
    const json: SearchResponse = await res.json();
    return json.data || { pager: { hasMore: false, nextPage: '1', page: '1' }, items: [] };
  } catch (err) { console.error('searchMovies error:', err); return { pager: { hasMore: false, nextPage: '1', page: '1' }, items: [] }; }
}

export async function fetchHot(): Promise<Movie[]> {
  try {
    const res = await fetch(`${API}/hot`);
    const json: TrendingResponse = await res.json();
    return json.data?.subjectList || [];
  } catch (err) { console.error('fetchHot error:', err); return []; }
}

export async function fetchMovieDetail(id: string): Promise<Movie | null> {
  try {
    const res = await fetch(`${API}/rich-detail?id=${id}`);
    const json = await res.json();
    return json.data || null;
  } catch (err) { console.error('fetchMovieDetail error:', err); return null; }
}

export async function fetchRecommended(id: string): Promise<Movie[]> {
  try {
    const res = await fetch(`${API}/recommend?id=${id}`);
    const json = await res.json();
    return json.data?.subjectList || json.data?.items || [];
  } catch { return []; }
}

export async function fetchSearchSuggest(keyword: string): Promise<string[]> {
  try {
    const res = await fetch(`${API}/search/suggest?keyword=${encodeURIComponent(keyword)}`);
    const json = await res.json();
    if (Array.isArray(json.data)) {
      return json.data.map((item: unknown) =>
        typeof item === 'string' ? item : (item as { keyword?: string; title?: string })?.keyword || (item as { title?: string })?.title || ''
      ).filter(Boolean).slice(0, 6);
    }
    return [];
  } catch { return []; }
}

// ─── ShowBox detail ───────────────────────────────────────────────────────────
export interface ShowboxDetail {
  id: number;
  title: string;
  description?: string;
  director?: string;
  writer?: string;
  actors?: string;
  poster?: string;
  imdb_rating?: string;
  cats?: string;
  year?: number;
  runtime?: number;
  quality_tag?: string;
  max_season?: number;
  max_episode?: number;
  season?: number[];
  episode?: unknown[];
  recommend?: Array<{ mid: number; title: string; poster?: string; poster_min?: string; imdb_rating?: string; year?: number; cats?: string }>;
}

const showboxDetailCache = new Map<string, ShowboxDetail>();

export async function fetchShowboxDetail(title: string, type: 'movie' | 'tv'): Promise<ShowboxDetail | null> {
  const cacheKey = `${type}:${title.toLowerCase()}`;
  if (showboxDetailCache.has(cacheKey)) return showboxDetailCache.get(cacheKey)!;

  try {
    const sbId = await findShowboxId(title, type);
    if (!sbId) return null;

    const url = `${API}/showbox/${type}?id=${sbId}`;
    const res = await fetch(url);
    const json = await res.json();
    const detail: ShowboxDetail = json.data || {};
    if (detail.id) {
      showboxDetailCache.set(cacheKey, detail);
      return detail;
    }
    return null;
  } catch (e) {
    console.error('[fetchShowboxDetail] error:', e);
    return null;
  }
}

// ─── Legacy compat ────────────────────────────────────────────────────────────
export async function fetchStreamUrl(id: string, type: string = 'movie'): Promise<StreamResponse> {
  try {
    const res = await fetch(`${API}/showbox/streams?id=${id}&type=${type}`);
    return await res.json();
  } catch { return {}; }
}

export async function fetchStreamFallback(id: string, type: string = 'movie'): Promise<StreamResponse> {
  try {
    const res = await fetch(`${API}/stream?id=${id}&type=${type}`);
    return await res.json();
  } catch { return {}; }
}

export function buildEmbedUrl(id: string, type: string = 'movie'): string {
  return `${API}/embed?id=${id}&type=${type}`;
}

// ─── Download links ───────────────────────────────────────────────────────────
export interface DownloadFile {
  id: string;
  title: string;
  size?: string;
  quality?: string;
  format?: string;
  downloadUrl: string;
}

export async function fetchDownloadLinks(title: string): Promise<DownloadFile[]> {
  try {
    const searchRes = await fetch(`${API}/newtoxic/search?keyword=${encodeURIComponent(title)}`);
    const searchJson = await searchRes.json();
    const items = searchJson.data || [];
    if (!Array.isArray(items) || items.length === 0) return [];

    const first = items[0] as { id?: string; slug?: string };
    const slug = first?.slug || first?.id;
    if (!slug) return [];

    const filesRes = await fetch(`${API}/newtoxic/files?id=${slug}`);
    const filesJson = await filesRes.json();
    const files = filesJson.data || [];
    if (!Array.isArray(files)) return [];

    return (files as Record<string, unknown>[]).map((f, i) => ({
      id: String(f.id || i),
      title: String(f.title || f.name || `File ${i + 1}`),
      size: String(f.size || ''),
      quality: String(f.quality || f.resolution || ''),
      format: String(f.format || f.ext || 'mp4'),
      downloadUrl: String(f.url || f.download_url || f.link || ''),
    })).filter(f => f.downloadUrl);
  } catch (e) {
    console.error('[fetchDownloadLinks] error:', e);
    return [];
  }
}

// ─── Master API: category-specific stream fetchers ───────────────────────────
// These call the master API endpoints directly and return normalized StreamQuality objects.

/** Movies: GET /api/movies?id=... → { combinedUrl, proxyUrl, targetUrl, headers } */
export async function fetchMovieStream(id: string, title?: string): Promise<StreamQuality | null> {
  try {
    const params = new URLSearchParams({ id });
    if (title) params.set('title', title);
    const res = await fetch(`${MASTER_API_BASE}/api/movies?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[master/movies]', JSON.stringify(json).slice(0, 200));
    return pickBestStream(json);
  } catch (e) {
    console.error('[fetchMovieStream]', e);
    return null;
  }
}

/** TV Shows: GET /api/tvshows?id=...&season=...&episode=... */
export async function fetchTVShowStream(id: string, season: number, episode: number, title?: string): Promise<StreamQuality | null> {
  try {
    const params = new URLSearchParams({ id, season: String(season), episode: String(episode) });
    if (title) params.set('title', title);
    const res = await fetch(`${MASTER_API_BASE}/api/tvshows?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[master/tvshows]', JSON.stringify(json).slice(0, 200));
    return pickBestStream(json);
  } catch (e) {
    console.error('[fetchTVShowStream]', e);
    return null;
  }
}

/** Sports: GET /api/sports?id=... → { baseUrl, streamPath, decrypter } */
export async function fetchSportsStream(id?: string): Promise<StreamQuality | null> {
  try {
    const url = id
      ? `${MASTER_API_BASE}/api/sports?id=${encodeURIComponent(id)}`
      : `${MASTER_API_BASE}/api/sports`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[master/sports]', JSON.stringify(json).slice(0, 200));
    return pickBestStream(json);
  } catch (e) {
    console.error('[fetchSportsStream]', e);
    return null;
  }
}

/** Anime: GET /api/anime?id=... → { gatewayUrl, cdnTarget } */
export async function fetchAnimeStream(id: string | number): Promise<StreamQuality | null> {
  try {
    const res = await fetch(`${MASTER_API_BASE}/api/anime?id=${encodeURIComponent(String(id))}`);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[master/anime]', JSON.stringify(json).slice(0, 200));
    return pickBestStream(json);
  } catch (e) {
    console.error('[fetchAnimeStream]', e);
    return null;
  }
}

/** Wrestling: GET /api/wrestling → { url } (embed) */
export async function fetchWrestlingStream(): Promise<StreamQuality | null> {
  try {
    const res = await fetch(`${MASTER_API_BASE}/api/wrestling`);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[master/wrestling]', JSON.stringify(json).slice(0, 200));
    return pickBestStream(json);
  } catch (e) {
    console.error('[fetchWrestlingStream]', e);
    return null;
  }
}
