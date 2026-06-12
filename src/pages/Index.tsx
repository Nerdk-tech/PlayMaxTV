import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/features/HeroSection';
import CategoryRow from '@/components/features/CategoryRow';
import CatalogRow from '@/components/features/CatalogRow';
import AdBanner from '@/components/features/AdBanner';
import PWAInstallPrompt from '@/components/features/PWAInstallPrompt';
import VideoPlayer from '@/components/features/VideoPlayer';
import { fetchTrending, fetchBrowse } from '@/lib/api';
import {
  fetchTMDBTrending, fetchTMDBPopular, fetchTMDBAnime,
  normalizeCatalog, tmdbToMovie,
  MASTER_API_BASE,
  type CatalogItem,
} from '@/lib/catalog';
import type { Movie, StreamQuality } from '@/types';
import { Link } from 'react-router-dom';
import { Crown, Play, Zap, Shield, Wifi, Download, Clock, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES } from '@/constants';
import { useWatchHistory } from '@/hooks/useWatchHistory';

// ─── Category icon map ──────────────────────────────────────────────────────
const CategoryIcon = ({ id }: { id: string }) => {
  const icons: Record<string, JSX.Element> = {
    movies: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9l4 3-4 3V9z" fill="currentColor"/></svg>,
    tvshows: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2l-4 5M8 2l4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    sports: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2c0 0-3 4-3 10s3 10 3 10M12 2c0 0 3 4 3 10s-3 10-3 10M2 12h20" stroke="currentColor" strokeWidth="1.5"/></svg>,
    wrestling: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9c0 0 1-2 4-2s4 2 4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M7 14l2-2 3 3 3-3 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    livetv: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 9h3v11h14V9h3L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><rect x="9" y="13" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
    cartoons: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M9 15c1 1.5 5 1.5 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    anime: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C7 2 3 6 3 11s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/><path d="M9 14.5c1 1 3 1.5 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  };
  return icons[id] || null;
};

const LIVE_CATS = new Set(['sports', 'wrestling', 'livetv']);
const CAT_ACCENTS: Record<string, string> = {
  sports: 'text-green-400 border-green-500/30 hover:border-green-500/60 hover:bg-green-950/20',
  wrestling: 'text-red-400 border-red-700/30 hover:border-red-600/60 hover:bg-red-950/20',
  livetv: 'text-blue-400 border-blue-700/30 hover:border-blue-500/60 hover:bg-blue-950/20',
};

// ─── Mini player modal ──────────────────────────────────────────────────────
function MiniPlayer({ streamUrl, title, onClose }: { streamUrl: string; title: string; onClose: () => void }) {
  const streams: StreamQuality[] = [{ proxyUrl: streamUrl, resolutions: '720', quality: '720' }];
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold text-sm truncate max-w-[80%]">{title}</p>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <VideoPlayer streams={streams} title={title} />
      </div>
    </div>
  );
}

// ─── Convert TMDB result to CatalogItem ────────────────────────────────────
function tmdbMovieToCatalog(item: ReturnType<typeof tmdbToMovie>): CatalogItem {
  return item as CatalogItem;
}

export default function Index() {
  const { session } = useAuth();
  const { history: watchHistory } = useWatchHistory();

  // Mini player state
  const [playerState, setPlayerState] = useState<{ url: string; title: string } | null>(null);

  const handlePlay = (url: string, title: string) => setPlayerState({ url, title });
  const handleClose = () => setPlayerState(null);

  // ── Master catalog (primary) ──────────────────────────────────────────────
  const { data: catalogRaw } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const res = await fetch(`${MASTER_API_BASE}/api/catalog`);
      if (!res.ok) throw new Error('Catalog unavailable');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const catalog = catalogRaw ? normalizeCatalog(catalogRaw) : null;
  const hasCatalogMovies = (catalog?.movies?.length ?? 0) > 0;
  const hasCatalogTV = (catalog?.tvshows?.length ?? 0) > 0;
  const hasCatalogAnime = (catalog?.anime?.length ?? 0) > 0;

  // ── TMDB fallbacks (display-only, stream triggered via xcasper) ──────────
  const { data: tmdbMovies = [], isLoading: loadTmdbMovies } = useQuery({
    queryKey: ['tmdb-movies'],
    queryFn: () => fetchTMDBPopular('movie'),
    enabled: !hasCatalogMovies,
    staleTime: 10 * 60 * 1000,
  });

  const { data: tmdbTV = [], isLoading: loadTmdbTV } = useQuery({
    queryKey: ['tmdb-tv'],
    queryFn: () => fetchTMDBPopular('tv'),
    enabled: !hasCatalogTV,
    staleTime: 10 * 60 * 1000,
  });

  const { data: tmdbAnime = [], isLoading: loadTmdbAnime } = useQuery({
    queryKey: ['tmdb-anime'],
    queryFn: fetchTMDBAnime,
    enabled: !hasCatalogAnime,
    staleTime: 10 * 60 * 1000,
  });

  // ── Xcasper/showbox trending for hero ────────────────────────────────────
  const { data: trending = [], isLoading: loadingTrending } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 5 * 60 * 1000,
  });

  const { data: moviesData, isLoading: loadingMovies } = useQuery({
    queryKey: ['browse', 'movie'],
    queryFn: () => fetchBrowse('movie'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tvData, isLoading: loadingTv } = useQuery({
    queryKey: ['browse', 'tv'],
    queryFn: () => fetchBrowse('tv'),
    staleTime: 5 * 60 * 1000,
  });

  // ── Build CatalogItem arrays ─────────────────────────────────────────────
  const movieItems: CatalogItem[] = hasCatalogMovies
    ? catalog!.movies!
    : tmdbMovies.map(m => tmdbMovieToCatalog(tmdbToMovie(m, 'movie')));

  const tvItems: CatalogItem[] = hasCatalogTV
    ? catalog!.tvshows!
    : tmdbTV.map(m => tmdbMovieToCatalog(tmdbToMovie(m, 'tvshow')));

  const animeItems: CatalogItem[] = hasCatalogAnime
    ? catalog!.anime!
    : tmdbAnime.map(m => tmdbMovieToCatalog(tmdbToMovie(m, 'anime')));

  const heroMovies: Movie[] = [
    ...trending.filter(m => m.stills?.url),
    ...trending,
  ].filter((m, i, arr) => arr.findIndex(x => x.subjectId === m.subjectId) === i).slice(0, 6);

  // Continue watching
  const continueItems: Movie[] = watchHistory.slice(0, 8).map(h => ({
    subjectId: h.subjectId,
    title: h.title,
    cover: { url: h.cover, width: 300, height: 450 },
    subjectType: h.subjectType,
    imdbRatingValue: '',
    imdbRatingCount: 0,
    genre: '',
    duration: h.duration,
    releaseDate: '',
    countryName: '',
    subtitles: '',
    hasResource: true,
    detailPath: '',
    staffList: [],
    description: '',
  } as Movie));

  return (
    <div className="min-h-screen bg-[#080808]">
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, #111 25%, #1e1e1e 50%, #111 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
      `}</style>

      <Navbar />
      <PWAInstallPrompt />

      {/* Mini player modal */}
      {playerState && <MiniPlayer streamUrl={playerState.url} title={playerState.title} onClose={handleClose} />}

      <main>
        {/* Hero */}
        <div className="pt-[68px]">
          {loadingTrending
            ? <div className="w-full h-[60vh] sm:h-[68vh] lg:h-[84vh] shimmer-bg" />
            : <HeroSection movies={heroMovies} />
          }
        </div>

        {/* Category pill scroll */}
        <div className="flex gap-2.5 px-4 sm:px-6 lg:px-8 py-5 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => {
            const isLive = LIVE_CATS.has(cat.id);
            const accent = CAT_ACCENTS[cat.id] || 'text-gray-300 border-gray-800/50 hover:border-gray-600 hover:text-white hover:bg-[#1a1a1a]';
            return (
              <Link key={cat.id} to={cat.path}
                className={`flex-shrink-0 flex items-center gap-2 text-sm font-bold bg-[#141414] px-4 py-2.5 rounded-xl border transition-all ${accent}`}>
                <CategoryIcon id={cat.id} />
                {cat.label}
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse ml-0.5" />}
                <ChevronRight size={13} className="text-gray-700" />
              </Link>
            );
          })}
        </div>

        {/* Continue Watching */}
        {session && continueItems.length > 0 && (
          <section className="mb-10 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[3px] h-6 rounded-full bg-[#e50914]" />
              <h2 className="text-white text-lg sm:text-xl font-black">Continue Watching</h2>
              <Clock size={15} className="text-gray-600" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {continueItems.map(movie => {
                const hist = watchHistory.find(h => h.subjectId === movie.subjectId);
                const pct = hist && hist.duration ? Math.min((hist.timestamp / hist.duration) * 100, 100) : 0;
                const watchUrl = `/watch/${movie.subjectId}?type=${movie.subjectType}&title=${encodeURIComponent(movie.title)}&cover=${encodeURIComponent(movie.cover?.url || '')}`;
                return (
                  <Link key={movie.subjectId} to={watchUrl} className="group block">
                    <div className="relative h-32 sm:h-40 rounded-xl overflow-hidden bg-gray-900 group-hover:-translate-y-1 transition-transform duration-300 shadow-lg">
                      {movie.cover?.url && <img src={movie.cover.url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-[#e50914] flex items-center justify-center shadow-xl">
                          <Play size={20} fill="white" className="text-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/60">
                        <div className="h-full bg-[#e50914] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="text-gray-300 text-xs font-bold mt-2 line-clamp-1 group-hover:text-white transition-colors">{movie.title}</p>
                    {pct > 1 && <p className="text-gray-700 text-[10px] mt-0.5">{Math.round(pct)}% watched</p>}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Trending (showbox/xcasper) */}
        <CategoryRow title="Trending Now" movies={trending} isLoading={loadingTrending} size="lg" accent="#e50914" viewAllPath="/movies" />

        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <AdBanner variant="leaderboard" />
        </div>

        {/* Movies — catalog first, TMDB fallback */}
        {hasCatalogMovies ? (
          <CatalogRow title="Movies" items={movieItems} accent="#3b82f6" viewAllPath="/movies" onPlay={handlePlay} />
        ) : (
          <CatalogRow title="Popular Movies" items={movieItems} isLoading={loadTmdbMovies} accent="#3b82f6" viewAllPath="/movies" onPlay={handlePlay} />
        )}

        {/* TV Shows */}
        {hasCatalogTV ? (
          <CatalogRow title="TV Shows & Series" items={tvItems} accent="#8b5cf6" viewAllPath="/tvshows" onPlay={handlePlay} />
        ) : (
          <CatalogRow title="TV Shows & Series" items={tvItems} isLoading={loadTmdbTV} accent="#8b5cf6" viewAllPath="/tvshows" onPlay={handlePlay} />
        )}

        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <AdBanner variant="inline" />
        </div>

        {/* Anime */}
        {hasCatalogAnime ? (
          <CatalogRow title="Anime" items={animeItems} accent="#ec4899" viewAllPath="/anime" onPlay={handlePlay} />
        ) : (
          <CatalogRow title="Anime" items={animeItems} isLoading={loadTmdbAnime} accent="#ec4899" viewAllPath="/anime" onPlay={handlePlay} />
        )}

        {/* Showbox grid rows */}
        <CategoryRow title="All Movies" movies={moviesData?.items || []} isLoading={loadingMovies} accent="#f59e0b" viewAllPath="/movies" />
        <CategoryRow title="All Series" movies={tvData?.items || []} isLoading={loadingTv} accent="#10b981" viewAllPath="/tvshows" />

        {/* Premium CTA */}
        <div className="mx-4 sm:mx-6 lg:mx-8 my-12 rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] via-[#2d0000] to-[#0d0d0d]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e50914]/10 rounded-full blur-3xl" />
          <div className="relative px-8 py-12 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={22} className="text-[#f5c518]" />
                <span className="text-[#f5c518] font-black text-sm uppercase tracking-widest">PlayMax+ Premium</span>
              </div>
              <h2 className="text-white text-3xl sm:text-4xl font-black mb-3 leading-tight">
                Unlimited Streaming.<br />
                <span className="text-[#e50914]">Zero Ads. Pure Cinema.</span>
              </h2>
              <p className="text-gray-400 text-sm mb-6 max-w-lg leading-relaxed">
                Experience movies in stunning HD, download for offline viewing, and stream ad-free.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
                {([<Zap size={14} className="text-[#e50914]" />, <Shield size={14} className="text-[#e50914]" />, <Wifi size={14} className="text-[#e50914]" />, <Download size={14} className="text-[#e50914]" />] as const).map((icon, i) => (
                  <span key={i} className="flex items-center gap-2">{icon} {['Ad-Free', 'HD / 4K', '4 Devices', 'Offline'][i]}</span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 text-center">
              <Link to="/premium" className="inline-block bg-white text-black font-black px-10 py-4 rounded-2xl text-base hover:bg-gray-100 transition-all shadow-2xl hover:-translate-y-0.5">
                Get PlayMax+
              </Link>
              <p className="text-gray-600 text-xs mt-3">From ₦2,000/week · Cancel anytime</p>
            </div>
          </div>
        </div>

        <div className="text-center pb-4 px-4">
          <p className="text-gray-700 text-xs">Made with care by <span className="text-gray-500 font-semibold">Damini × Nicky Tech</span></p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
