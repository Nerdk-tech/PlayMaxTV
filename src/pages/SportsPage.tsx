import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { RefreshCw, Clock, Play, AlertTriangle, Zap } from 'lucide-react';
import { getMatches, getCinverseSources, buildStreamUrl, resolveLogoUrl, formatKickoff, type CinverseMatch, type SportType } from '@/lib/cinverse';

// ─── Sport tab config ─────────────────────────────────────────────────────────
const SPORT_TABS: { key: SportType; label: string; icon: string; gradient: string }[] = [
  { key: 'football',   label: 'Football',   icon: '⚽', gradient: 'from-emerald-800 to-emerald-950' },
  { key: 'basketball', label: 'Basketball', icon: '🏀', gradient: 'from-orange-700 to-orange-950' },
  { key: 'cricket',    label: 'Cricket',    icon: '🏏', gradient: 'from-sky-800 to-sky-950' },
];

// ─── Badge colors ─────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<CinverseMatch['status'], string> = {
  live:     'bg-red-600/20 text-red-300 border-red-700/40',
  upcoming: 'bg-sky-900/30 text-sky-300 border-sky-700/30',
  finished: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/30',
};

// ─── HLS live player ──────────────────────────────────────────────────────────
function HLSPlayer({ src }: { src: string }) {
  const vRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const v = vRef.current;
    if (!v || !src) return;
    setLoading(true); setErr(false);
    let hls: { destroy(): void } | null = null;
    const isHls = src.includes('.m3u8') || src.includes('hls') || src.includes('playlist');

    if (isHls) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          if (v.canPlayType('application/vnd.apple.mpegurl')) v.src = src;
          else { setErr(true); setLoading(false); }
          return;
        }
        const h = new Hls({ enableWorker: false });
        hls = h; h.loadSource(src); h.attachMedia(v);
        h.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); v.play().catch(() => {}); });
        h.on(Hls.Events.ERROR, (_: unknown, d: { fatal?: boolean }) => { if (d.fatal) { setErr(true); setLoading(false); } });
      });
    } else { v.src = src; v.load(); setLoading(false); }

    return () => { hls?.destroy(); };
  }, [src]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-zinc-800/40" style={{ aspectRatio: '16/9' }}>
      <video ref={vRef} className="w-full h-full object-contain" playsInline autoPlay muted
        onPlaying={() => setLoading(false)} onError={() => { setErr(true); setLoading(false); }} />
      {loading && !err && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-red-500 animate-spin" />
        </div>
      )}
      {err && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
          <Zap size={28} className="text-zinc-700" />
          <p className="text-zinc-500 text-sm font-semibold">Stream unavailable</p>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function MatchSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-36 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse"
          style={{ backgroundSize: '200% 100%', animation: `shimmer 1.8s ${i * 0.07}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ match, onPlay, loadingId }: {
  match: CinverseMatch;
  onPlay: (m: CinverseMatch) => void;
  loadingId: string | null;
}) {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isLoading = loadingId === match.id;

  return (
    <div
      onClick={() => isLive && onPlay(match)}
      className={`relative rounded-2xl border p-4 transition-all duration-200 ${isLive ? 'cursor-pointer' : 'cursor-default'} ${isLive
        ? 'bg-gradient-to-br from-[#0f0000] to-[#0a0a0c] border-red-900/30 hover:border-red-700/50'
        : 'bg-zinc-900/40 border-zinc-800/30'}`}>

      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] px-2.5 py-1 rounded-full border font-black uppercase tracking-wider flex items-center gap-1.5 ${STATUS_BADGE[match.status]}`}>
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          {match.status === 'live' ? `LIVE ${match.minute ? `· ${match.minute}'` : ''}` : match.status === 'finished' ? 'FT' : 'Upcoming'}
        </span>
        {match.league && (
          <span className="text-zinc-600 text-[10px] font-semibold truncate max-w-[120px]">{match.league}</span>
        )}
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-2">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-start gap-1.5 min-w-0">
          {resolveLogoUrl(match.homeTeamLogo) && (
            <img src={resolveLogoUrl(match.homeTeamLogo)} alt="" className="w-7 h-7 rounded object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <p className="text-white text-sm font-bold truncate leading-tight">{match.homeTeam}</p>
        </div>

        {/* Score / Time */}
        <div className="text-center flex-shrink-0 px-2">
          {match.status === 'upcoming' ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-zinc-600 text-xs font-bold">vs</span>
              <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                <Clock size={9} /> {formatKickoff(match.startTime)}
              </span>
            </div>
          ) : (
            <p className={`text-xl font-black tabular-nums ${isLive ? 'text-white' : 'text-zinc-400'}`}>
              {match.homeScore ?? '–'}<span className="text-zinc-700 mx-1">:</span>{match.awayScore ?? '–'}
            </p>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-end gap-1.5 min-w-0">
          {resolveLogoUrl(match.awayTeamLogo) && (
            <img src={resolveLogoUrl(match.awayTeamLogo)} alt="" className="w-7 h-7 rounded object-contain ml-auto"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <p className="text-white text-sm font-bold truncate leading-tight text-right">{match.awayTeam}</p>
        </div>
      </div>

      {/* Live watch row */}
      {isLive && (
        <div className="mt-3 pt-3 border-t border-zinc-800/30 flex items-center justify-between">
          <span className="text-red-400/80 text-[11px] font-semibold">Streaming now</span>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            isLoading
              ? 'bg-red-700/30 text-red-300'
              : 'bg-red-700/20 text-red-300 hover:bg-red-700 hover:text-white'
          }`}>
            {isLoading
              ? <div className="w-3 h-3 rounded-full border border-red-400 border-t-transparent animate-spin" />
              : <Play size={10} fill="currentColor" />
            }
            {isLoading ? 'Loading…' : 'Watch Live'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SportsPage() {
  const [activeSport, setActiveSport] = useState<SportType>('football');
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<CinverseMatch | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: matches = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['cinverse-matches', activeSport],
    queryFn: () => getMatches(activeSport),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  const handlePlay = async (match: CinverseMatch) => {
    try {
      setLoadingId(match.id);
      const sources = await getCinverseSources(match.id);
      if (sources.success && sources.results.length > 0) {
        // For live streams, prefer .m3u8 sources
        const best = sources.results.find(s => s.stream_url?.includes('m3u8'))
          || sources.results.find(s => s.quality === '1080p')
          || sources.results[0];
        setActiveStream(buildStreamUrl(best.stream_url));
        setActiveMatch(match);
      }
    } catch { /* silent */ } finally {
      setLoadingId(null);
    }
  };

  const live = matches.filter(m => m.status === 'live');
  const upcoming = matches.filter(m => m.status === 'upcoming');
  const finished = matches.filter(m => m.status === 'finished');

  return (
    <div className="min-h-screen bg-[#09090b]">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <Navbar />

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-emerald-950/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-orange-950/6 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 pt-20 pb-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center shadow-lg shadow-emerald-900/30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8"/><path d="M12 2c0 0-3 4-3 10s3 10 3 10M12 2c0 0 3 4 3 10s-3 10-3 10M2 12h20" stroke="white" strokeWidth="1.5"/></svg>
              </div>
              <div>
                <h1 className="text-white text-2xl font-black tracking-tight">Sports Hub</h1>
                <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest">Live Matches & Events</p>
              </div>
            </div>
            <button onClick={() => refetch()} disabled={isFetching}
              className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-all">
              <RefreshCw size={14} className={isFetching ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>

          {/* Active player */}
          {activeStream && activeMatch && (
            <div className="space-y-2">
              <HLSPlayer src={activeStream} />
              <div className="flex items-center gap-2 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <p className="text-zinc-300 text-sm font-bold">{activeMatch.homeTeam} vs {activeMatch.awayTeam}</p>
                {activeMatch.league && <span className="text-[10px] text-zinc-600 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800/30">{activeMatch.league}</span>}
              </div>
            </div>
          )}

          {/* Sport tabs */}
          <div className="flex gap-2.5">
            {SPORT_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveSport(tab.key)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  activeSport === tab.key
                    ? `bg-gradient-to-r ${tab.gradient} border-transparent text-white shadow-lg`
                    : 'bg-zinc-900/60 border-zinc-800/40 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
                }`}>
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? <MatchSkeleton /> : isError ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <AlertTriangle size={30} className="text-zinc-700" />
              <p className="text-zinc-500 font-semibold">Could not load matches</p>
              <button onClick={() => refetch()} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm border border-zinc-700">Retry</button>
            </div>
          ) : (
            <>
              {/* Live */}
              {live.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h2 className="text-white font-black text-xs uppercase tracking-widest">Live Now</h2>
                    <span className="text-[10px] bg-red-900/30 border border-red-800/20 text-red-400 font-black px-2 py-0.5 rounded-full">{live.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {live.map(m => <MatchCard key={m.id} match={m} onPlay={handlePlay} loadingId={loadingId} />)}
                  </div>
                </section>
              )}

              {/* Upcoming */}
              {upcoming.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={13} className="text-sky-400" />
                    <h2 className="text-white font-black text-xs uppercase tracking-widest">Upcoming</h2>
                    <span className="text-[10px] bg-sky-900/20 border border-sky-800/15 text-sky-400 font-black px-2 py-0.5 rounded-full">{upcoming.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcoming.map(m => <MatchCard key={m.id} match={m} onPlay={handlePlay} loadingId={loadingId} />)}
                  </div>
                </section>
              )}

              {/* Finished */}
              {finished.length > 0 && (
                <section className="opacity-50">
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-zinc-600 font-black text-xs uppercase tracking-widest">Finished</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {finished.map(m => <MatchCard key={m.id} match={m} onPlay={handlePlay} loadingId={loadingId} />)}
                  </div>
                </section>
              )}

              {matches.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-4xl mb-3">{SPORT_TABS.find(t => t.key === activeSport)?.icon}</p>
                  <p className="text-zinc-600 font-semibold">No matches scheduled right now</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
