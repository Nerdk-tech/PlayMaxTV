import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdBanner from '@/components/features/AdBanner';
import CinverseCard, { CinverseCardSkeleton } from '@/components/features/CinverseCard';
import CinversePlayer from '@/components/features/CinversePlayer';
import { fetchTMDBAnime, tmdbToMovie, MASTER_API_BASE, normalizeCatalog } from '@/lib/catalog';
import type { CatalogItem } from '@/lib/catalog';
import { searchCinverse } from '@/lib/cinverse';
import type { CinverseMediaResult } from '@/lib/cinverse';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const GENRE_TABS = ['All', 'Action', 'Romance', 'Comedy', 'Fantasy', 'Horror', 'Sports', 'Mecha', 'Slice of Life'];

// AniList type
interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; extraLarge: string };
  episodes: number | null;
  averageScore: number | null;
  genres: string[];
  status: string;
  seasonYear: number | null;
  format: string;
}

async function fetchAniListAnime(genre: string, page: number): Promise<{ media: AniListMedia[]; hasNext: boolean }> {
  const genreFilter = genre !== 'All' ? `, genre_in: ["${genre}"]` : '';
  const query = `query { Page(page: ${page}, perPage: 24) { pageInfo { hasNextPage } media(type: ANIME, sort: POPULARITY_DESC, status_not: NOT_YET_RELEASED ${genreFilter}) { id title { romaji english } coverImage { large extraLarge } episodes averageScore genres status seasonYear format } } }`;
  const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const json = await res.json();
  return { media: json.data?.Page?.media || [], hasNext: json.data?.Page?.pageInfo?.hasNextPage || false };
}

function SkeletonCard() {
  return (
    <div>
      <div className="h-64 sm:h-72 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800/60 to-zinc-900 animate-pulse"
        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite' }} />
      <div className="mt-2.5 h-3 rounded-full bg-zinc-800/80 w-3/4 animate-pulse" />
      <div className="mt-1.5 h-2.5 rounded-full bg-zinc-900/80 w-1/2 animate-pulse" />
    </div>
  );
}

// Convert AniList → CinverseMediaResult-like shape for CinverseCard
function aniListToCinverse(m: AniListMedia): CinverseMediaResult {
  return {
    id: String(m.id),
    title: m.title.english || m.title.romaji,
    poster: m.coverImage.extraLarge || m.coverImage.large,
    year: m.seasonYear || undefined,
    rating: m.averageScore ? m.averageScore / 10 : undefined,
    genre: m.genres.slice(0, 2).join(', '),
    type: 'anime',
  };
}

export default function AnimePage() {
  const [genre, setGenre] = useState('All');
  const [page, setPage] = useState(1);
  const [playerState, setPlayerState] = useState<{ id: string; title: string; poster?: string } | null>(null);

  // Cinverse anime row (primary)
  const { data: cinverseAnime = [], isLoading: loadingCinverse } = useQuery({
    queryKey: ['cinverse-anime'],
    queryFn: () => searchCinverse('Anime'),
    staleTime: 10 * 60 * 1000,
  });

  // AniList grid (display only, streams from cinverse by id)
  const { data: aniData, isLoading: loadingAni } = useQuery({
    queryKey: ['anilist', genre, page],
    queryFn: () => fetchAniListAnime(genre, page),
    staleTime: 10 * 60 * 1000,
  });

  const gridItems: CinverseMediaResult[] = (aniData?.media || []).map(aniListToCinverse);

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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-900 flex items-center justify-center shadow-xl shadow-pink-900/40">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C7 2 3 6 3 11s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="white" strokeWidth="1.8"/><circle cx="9" cy="11" r="1" fill="white"/><circle cx="15" cy="11" r="1" fill="white"/><path d="M9 14.5c1 1 3 1.5 6 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight">Anime</h1>
              <p className="text-zinc-600 text-sm mt-0.5">Tap any title to stream instantly</p>
            </div>
          </div>

          {/* Cinverse Featured Anime Row */}
          {(loadingCinverse || cinverseAnime.length > 0) && (
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-0.5 h-6 rounded-full bg-pink-500" />
                <h2 className="text-white text-lg font-black">Featured Anime</h2>
              </div>
              {loadingCinverse ? (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {Array.from({ length: 8 }).map((_, i) => <CinverseCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {cinverseAnime.map(item => (
                    <CinverseCard key={item.id} item={item}
                      onPlay={(id, title, poster) => setPlayerState({ id, title, poster })} />
                  ))}
                </div>
              )}
            </section>
          )}

          <AdBanner variant="leaderboard" />

          {/* Genre tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-4 mt-2">
            {GENRE_TABS.map(g => (
              <button key={g} onClick={() => { setGenre(g); setPage(1); }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  genre === g
                    ? 'bg-pink-700 border-transparent text-white shadow-lg shadow-pink-900/40'
                    : 'bg-zinc-900/80 border-zinc-800/50 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
                }`}>
                {g}
              </button>
            ))}
          </div>

          {/* AniList browseable grid */}
          {loadingAni ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-2">
              {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-2">
              {gridItems.map(item => (
                <CinverseCard key={item.id} item={item}
                  onPlay={(id, title, poster) => setPlayerState({ id, title, poster })} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loadingAni && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 text-sm font-bold transition-all">
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-zinc-600 text-sm font-bold px-2">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!aniData?.hasNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 text-sm font-bold transition-all">
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
