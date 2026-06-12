import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdBanner from '@/components/features/AdBanner';
import MovieCard from '@/components/features/MovieCard';
import CinverseCard, { CinverseCardSkeleton } from '@/components/features/CinverseCard';
import CinversePlayer from '@/components/features/CinversePlayer';
import { fetchBrowse } from '@/lib/api';
import { searchCinverse } from '@/lib/cinverse';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Glassmorphism skeleton card
function SkeletonCard() {
  return (
    <div>
      <div className="h-56 sm:h-72 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800/60 to-zinc-900 animate-pulse"
        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite' }} />
      <div className="mt-2.5 h-3 rounded-full bg-zinc-800/80 w-3/4 animate-pulse" />
      <div className="mt-1.5 h-2.5 rounded-full bg-zinc-900/80 w-1/2 animate-pulse" />
    </div>
  );
}

const CINVERSE_CATEGORIES = ['Crime', 'Drama', 'Action', 'Thriller', 'Comedy', 'Horror'];

export default function MoviesPage() {
  const [page, setPage] = useState('1');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<{ id: string; title: string; poster?: string } | null>(null);

  // Showbox browse (main grid)
  const { data, isLoading: loadingBrowse } = useQuery({
    queryKey: ['movies', page],
    queryFn: () => fetchBrowse('movie', page),
    staleTime: 5 * 60 * 1000,
  });

  // Cinverse category rows
  const { data: cinverseMovies = [], isLoading: loadingCinverse } = useQuery({
    queryKey: ['cinverse-movies', activeCategory || 'Crime'],
    queryFn: () => searchCinverse(activeCategory || 'Crime'),
    staleTime: 10 * 60 * 1000,
  });

  const movies = data?.items || [];
  const hasMore = data?.pager?.hasMore || false;
  const currentPage = parseInt(data?.pager?.page || '1');

  return (
    <div className="min-h-screen bg-[#09090b]">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <Navbar />

      {playerState && (
        <CinversePlayer
          mediaId={playerState.id}
          title={playerState.title}
          poster={playerState.poster}
          onClose={() => setPlayerState(null)}
        />
      )}

      <main className="pt-[68px] pb-16">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center gap-4 py-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-xl shadow-blue-900/40">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="14" rx="2.5" stroke="white" strokeWidth="1.8"/><path d="M8 4v14M16 4v14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><path d="M2 9h6M16 9h6M2 15h6M16 15h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight">Movies</h1>
              <p className="text-zinc-600 text-sm mt-0.5">Thousands of films, tap to stream instantly</p>
            </div>
          </div>

          {/* ── Cinverse Category Rows ──────────────────────────────────────────── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-0.5 h-6 rounded-full bg-red-500" />
                <h2 className="text-white text-lg font-black">Featured by Genre</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {CINVERSE_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      (activeCategory || 'Crime') === cat
                        ? 'bg-red-700 border-transparent text-white shadow-lg shadow-red-900/40'
                        : 'bg-zinc-900/80 border-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loadingCinverse ? (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {Array.from({ length: 10 }).map((_, i) => <CinverseCardSkeleton key={i} />)}
              </div>
            ) : cinverseMovies.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {cinverseMovies.map(item => (
                  <CinverseCard key={item.id} item={item}
                    onPlay={(id, title, poster) => setPlayerState({ id, title, poster })} />
                ))}
              </div>
            ) : (
              <p className="text-zinc-700 text-sm italic py-6">No results for this genre</p>
            )}
          </section>

          <AdBanner variant="leaderboard" />

          {/* ── Main browse grid ─────────────────────────────────────────────────── */}
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-0.5 h-6 rounded-full bg-blue-500" />
              <h2 className="text-white text-lg font-black">All Movies</h2>
            </div>

            {loadingBrowse ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movies.map(movie => <MovieCard key={movie.subjectId} movie={movie} />)}
              </div>
            )}

            {/* Pagination */}
            {!loadingBrowse && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button onClick={() => setPage(String(Math.max(1, currentPage - 1)))} disabled={currentPage <= 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 text-sm font-bold transition-all">
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-zinc-600 text-sm font-bold px-2">Page {currentPage}</span>
                <button onClick={() => setPage(String(currentPage + 1))} disabled={!hasMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 text-sm font-bold transition-all">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
