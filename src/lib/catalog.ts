// ─── Catalog API + TMDB fallback ──────────────────────────────────────────────
// Primary: https://master-streaming-api.onrender.com/api/catalog
// Fallback display: TMDB (https://api.themoviedb.org/3)
// Xcasper: used to trigger streams on tap

export const MASTER_API_BASE = 'https://master-streaming-api.onrender.com';
export const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';
// Public read-only TMDB key (safe for frontend)
export const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';

export interface CatalogItem {
  id: string;
  title: string;
  poster?: string;
  backdrop?: string;
  year?: number;
  rating?: number;
  genre?: string;
  type: 'movie' | 'tvshow' | 'anime' | 'wrestling' | 'sport';
  episodes?: CatalogEpisode[];
  streamUrl?: string;
  embedUrl?: string;
  tmdbId?: number;
  subjectId?: string;
  league?: string;
  teams?: string;
  kickoff?: string;
  sport?: string;
}

export interface CatalogEpisode {
  id: string;
  episode: number;
  season: number;
  title: string;
  thumbnail?: string;
  duration?: number;
  streamUrl?: string;
}

export interface CatalogResponse {
  movies?: CatalogItem[];
  tvshows?: CatalogItem[];
  anime?: CatalogItem[];
  wrestling?: CatalogItem[];
  sports?: CatalogItem[];
  // flat structure fallback
  items?: CatalogItem[];
}

// Normalize any catalog shape the server returns
export function normalizeCatalog(raw: unknown): CatalogResponse {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;

  const pick = (keys: string[]): CatalogItem[] => {
    for (const k of keys) {
      if (Array.isArray(r[k]) && (r[k] as unknown[]).length > 0) return r[k] as CatalogItem[];
    }
    return [];
  };

  // If the server nests under data{}
  const root = (r.data && typeof r.data === 'object' ? r.data : r) as Record<string, unknown>;
  const rr = root as Record<string, unknown>;

  return {
    movies:    (Array.isArray(rr.movies) ? rr.movies : pick(['movies', 'film', 'films'])) as CatalogItem[],
    tvshows:   (Array.isArray(rr.tvshows) ? rr.tvshows : pick(['tvshows', 'series', 'shows'])) as CatalogItem[],
    anime:     (Array.isArray(rr.anime) ? rr.anime : pick(['anime'])) as CatalogItem[],
    wrestling: (Array.isArray(rr.wrestling) ? rr.wrestling : pick(['wrestling', 'wwe', 'wresling'])) as CatalogItem[],
    sports:    (Array.isArray(rr.sports) ? rr.sports : pick(['sports', 'matches', 'events'])) as CatalogItem[],
  };
}

// ─── TMDB fallback fetchers ────────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  overview?: string;
  media_type?: string;
}

export async function fetchTMDBTrending(type: 'movie' | 'tv' | 'all' = 'all'): Promise<TMDBMovie[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/trending/${type}/week?api_key=${TMDB_KEY}`);
    const json = await res.json();
    return json.results || [];
  } catch { return []; }
}

export async function fetchTMDBPopular(type: 'movie' | 'tv'): Promise<TMDBMovie[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/popular?api_key=${TMDB_KEY}&page=1`);
    const json = await res.json();
    return json.results || [];
  } catch { return []; }
}

export async function fetchTMDBAnime(): Promise<TMDBMovie[]> {
  try {
    // Animation genre=16, origin_country=JP
    const res = await fetch(`${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=1`);
    const json = await res.json();
    return json.results || [];
  } catch { return []; }
}

export function tmdbPoster(path: string | undefined | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}

export function tmdbToMovie(item: TMDBMovie, type: 'movie' | 'tvshow' | 'anime' = 'movie') {
  return {
    id: String(item.id),
    title: item.title || item.name || 'Untitled',
    poster: tmdbPoster(item.poster_path, 'w342'),
    backdrop: tmdbPoster(item.backdrop_path, 'original'),
    year: parseInt((item.release_date || item.first_air_date || '').split('-')[0]) || undefined,
    rating: item.vote_average,
    type,
    tmdbId: item.id,
  } as CatalogItem;
}

// ─── Xcasper stream trigger ────────────────────────────────────────────────────
// Called when user taps a movie card to start streaming
export async function triggerXcasperStream(tmdbId: number | string, type: 'movie' | 'tv' = 'movie', season?: number, episode?: number): Promise<string | null> {
  try {
    const base = `${MASTER_API_BASE}/api`;
    let url: string;
    if (type === 'tv' && season !== undefined && episode !== undefined) {
      url = `${base}/tvshows?id=${tmdbId}&season=${season}&episode=${episode}`;
    } else {
      url = `${base}/movies?id=${tmdbId}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    // Extract best playable URL
    if (json.combinedUrl) return json.combinedUrl;
    if (json.proxyUrl) return json.proxyUrl;
    if (json.url) return json.url;
    if (json.gatewayUrl) return json.gatewayUrl;
    if (json.baseUrl && json.streamPath) return `${json.baseUrl.replace(/\/$/, '')}${json.streamPath}`;
    return null;
  } catch { return null; }
}
