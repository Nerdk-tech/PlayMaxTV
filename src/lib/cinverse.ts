// ─── Cinverse API Layer ────────────────────────────────────────────────────────
// Base: https://cinverse.com.ng
// No raw API labels exposed to UI — all data massaged before rendering

const CINVERSE = 'https://cinverse.com.ng';

export interface CinverseMediaResult {
  id: string;
  title: string;
  poster?: string;
  year?: number;
  rating?: number;
  genre?: string;
  type?: string;
  description?: string;
}

export interface CinverseSourceResult {
  quality: string;        // "1080p" | "720p" | "480p"
  stream_url: string;     // relative, e.g. /api/stream/...
  download_url: string;   // relative, e.g. /api/dl/...
  format: string;         // "mp4"
}

export interface CinverseSubtitle {
  lan: string;   // "en"
  url: string;   // absolute
}

export interface CinverseSourcesResponse {
  success: boolean;
  results: CinverseSourceResult[];
  subtitles: CinverseSubtitle[];
}

// ─── Build absolute stream / download URLs ─────────────────────────────────────
export function buildStreamUrl(relativeOrAbsolute: string): string {
  if (relativeOrAbsolute.startsWith('http')) return relativeOrAbsolute;
  return `${CINVERSE}${relativeOrAbsolute}`;
}

// ─── Search ────────────────────────────────────────────────────────────────────
export async function searchCinverse(query: string): Promise<CinverseMediaResult[]> {
  try {
    const res = await fetch(`${CINVERSE}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json = await res.json();
    // Handle various response shapes
    const raw: unknown[] = Array.isArray(json) ? json : (json.results || json.data || json.items || []);
    return (raw as Record<string, unknown>[]).map((item, i) => ({
      id: String(item.id || item._id || item.mediaId || `item-${i}`),
      title: String(item.title || item.name || item.mediaTitle || ''),
      poster: item.poster || item.posterUrl || item.thumbnail || item.image || undefined,
      year: item.year ? Number(item.year) : undefined,
      rating: item.rating || item.imdb_rating || item.vote_average ? Number(item.rating || item.imdb_rating || item.vote_average) : undefined,
      genre: item.genre || item.genres || item.category || undefined,
      type: String(item.type || item.mediaType || 'movie'),
      description: item.description || item.overview || item.synopsis || undefined,
    } as CinverseMediaResult));
  } catch {
    return [];
  }
}

// ─── Sources ───────────────────────────────────────────────────────────────────
export async function getCinverseSources(mediaId: string): Promise<CinverseSourcesResponse> {
  const res = await fetch(`${CINVERSE}/api/sources?id=${encodeURIComponent(mediaId)}`);
  if (!res.ok) throw new Error('Failed to fetch sources');
  const json = await res.json();
  return json as CinverseSourcesResponse;
}

// ─── Sports matches ────────────────────────────────────────────────────────────
export type SportType = 'football' | 'basketball' | 'cricket';

export interface CinverseMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamLogo?: string;   // relative, prepend CINVERSE
  awayTeamLogo?: string;   // relative, prepend CINVERSE
  league?: string;
  startTime?: string;      // ISO / displayable string
  status: 'live' | 'upcoming' | 'finished';
  minute?: number | string; // e.g. 45, "45+2"
}

export async function getMatches(sport: SportType): Promise<CinverseMatch[]> {
  try {
    const res = await fetch(`${CINVERSE}/api/matches?sport=${sport}`);
    if (!res.ok) return [];
    const json = await res.json();
    const raw: unknown[] = Array.isArray(json) ? json : (json.matches || json.data || json.games || []);
    return (raw as Record<string, unknown>[]).map((m, i) => {
      const rawStatus = String(m.status || m.matchStatus || m.state || 'upcoming').toLowerCase();
      const status: CinverseMatch['status'] = rawStatus.includes('live') || rawStatus.includes('inplay') ? 'live'
        : rawStatus.includes('finish') || rawStatus.includes('ft') || rawStatus.includes('end') || rawStatus.includes('complet') ? 'finished'
        : 'upcoming';
      return {
        id: String(m.id || m.matchId || m.event_id || i),
        homeTeam: String(m.homeTeam || m.home_team || m.home || 'Home'),
        awayTeam: String(m.awayTeam || m.away_team || m.away || 'Away'),
        homeScore: m.homeScore !== undefined ? Number(m.homeScore) : m.home_score !== undefined ? Number(m.home_score) : null,
        awayScore: m.awayScore !== undefined ? Number(m.awayScore) : m.away_score !== undefined ? Number(m.away_score) : null,
        homeTeamLogo: m.homeTeamLogo || m.home_logo || m.homeLogo || undefined,
        awayTeamLogo: m.awayTeamLogo || m.away_logo || m.awayLogo || undefined,
        league: m.league || m.competition || m.tournament || undefined,
        startTime: m.startTime || m.start_time || m.kickoff || m.scheduledAt || undefined,
        status,
        minute: m.minute || m.matchMinute || undefined,
      } as CinverseMatch;
    });
  } catch { return []; }
}

// Prepend domain to relative logo URLs
export function resolveLogoUrl(rel?: string): string | undefined {
  if (!rel) return undefined;
  if (rel.startsWith('http')) return rel;
  return `${CINVERSE}${rel}`;
}

// Format start time for display
export function formatKickoff(startTime?: string): string {
  if (!startTime) return 'TBD';
  try {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return startTime;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return startTime; }
}

export { CINVERSE };
