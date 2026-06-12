import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MovieCard from '@/components/features/MovieCard';
import AdBanner from '@/components/features/AdBanner';
import CinverseCard, { CinverseCardSkeleton } from '@/components/features/CinverseCard';
import CinversePlayer from '@/components/features/CinversePlayer';
import { fetchBrowse } from '@/lib/api';
import { searchCinverse } from '@/lib/cinverse';
import { ChevronLeft, ChevronRight, Tv } from 'lucide-react';

function SkeletonCard() {
  return (
    <div>
      <div className="h-56 sm:h-72 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800/60 to-zinc-900 animate-pulse" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite' }} />
      <div className="mt-2.5 h-3 rounded-full bg-zinc-800/80 w-3/4 animate-pulse" />
      <div className="mt-1.5 h-2.5 rounded-full bg-zinc-900/80 w-1/2 animate-pulse" />
    </div>
  );
}

const TV_CATEGORIES = ['Drama', 'Crime', 'Anime', 'Thriller', 'Fantasy'];

export default function TVShowsPage() {
  const [page, setPage] = useState('1');
  const [activeCategory, setActiveCategory] = useState<string>('Drama');
  const [playerState, setPlayerState] = useState<{ id: string; title: string; poster?: string } | null>(null);

  const { data, isLoading: loadingBrowse } = useQuery({
    queryKey: ['tvshows', page],
    queryFn: () => fetchBrowse('tv', page),
    staleTime: 5 * 60 * 1000,
  });

  const { data: cinverseShows = [], isLoading: loadingCinverse } = useQuery({
    queryKey: ['cinverse-tv', activeCategory],
    queryFn: () => searchCinverse(activeCategory),
    staleTime: 10 * 60 * 1000,
  });

  const shows = data?.items || [];
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-900 flex items-center justify-center shadow-xl shadow-purple-900/40">
              <Tv size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight">TV Shows & Series</h1>
              <p className="text-zinc-600 text-sm mt-0.5">Drama, crime, thrillers — all in one place</p>
            </div>
          </div>

          {/* Cinverse genre rows */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-0.5 h-6 rounded-full bg-violet-500" />
                <h2 className="text-white text-lg font-black">Curated Series</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {TV_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      activeCategory === cat
                        ? 'bg-violet-700 border-transparent text-white shadow-lg shadow-violet-900/40'
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
            ) : cinverseShows.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {cinverseShows.map(item => (
                  <CinverseCard key={item.id} item={item}
                    onPlay={(id, title, poster) => setPlayerState({ id, title, poster })} />
                ))}
              </div>
            ) : (
              <p className="text-zinc-700 text-sm italic py-6">No results for this genre</p>
            )}
          </section>

          <AdBanner variant="leaderboard" />

          {/* All TV browse grid */}
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-0.5 h-6 rounded-full bg-violet-500" />
              <h2 className="text-white text-lg font-black">All Series</h2>
            </div>
            {loadingBrowse ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {shows.map(show => <MovieCard key={show.subjectId} movie={show} />)}
              </div>
            )}

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
