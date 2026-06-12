import { useState } from 'react';
import { Play, Star, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import type { CatalogItem, CatalogEpisode } from '@/lib/catalog';
import { triggerXcasperStream } from '@/lib/catalog';

interface CatalogCardProps {
  item: CatalogItem;
  onPlay?: (streamUrl: string, title: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

function Shimmer() {
  return (
    <div className="w-full h-full rounded-xl bg-gradient-to-r from-[#1a1a1a] via-[#252525] to-[#1a1a1a] animate-pulse"
      style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite' }} />
  );
}

export function CatalogCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-72 sm:h-80' : size === 'sm' ? 'h-44 sm:h-52' : 'h-56 sm:h-64';
  return (
    <div className="flex-shrink-0 w-36 sm:w-44 lg:w-48">
      <div className={`${h} rounded-xl overflow-hidden`}><Shimmer /></div>
      <div className="mt-2.5 h-3 w-4/5 rounded-full bg-[#1e1e1e] animate-pulse" />
      <div className="mt-1.5 h-2.5 w-1/2 rounded-full bg-[#1a1a1a] animate-pulse" />
    </div>
  );
}

export default function CatalogCard({ item, onPlay, size = 'md' }: CatalogCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showEps, setShowEps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [epLoading, setEpLoading] = useState<string | null>(null);

  const isSeries = item.type === 'tvshow' || item.type === 'anime';
  const hasEps = isSeries && item.episodes && item.episodes.length > 0;

  const poster = !imgErr && item.poster
    ? item.poster
    : `https://placehold.co/300x450/111/333?text=${encodeURIComponent((item.title || '').slice(0, 10))}`;

  const hClass = size === 'lg' ? 'h-64 sm:h-80' : size === 'sm' ? 'h-44 sm:h-52' : 'h-52 sm:h-64';

  const handlePlayMain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPlay) return;
    if (item.streamUrl) { onPlay(item.streamUrl, item.title); return; }
    if (item.embedUrl) { onPlay(item.embedUrl, item.title); return; }
    const tmdbId = item.tmdbId || item.subjectId;
    if (!tmdbId) return;
    setLoading(true);
    const url = await triggerXcasperStream(tmdbId, item.type === 'tvshow' ? 'tv' : 'movie');
    setLoading(false);
    if (url) onPlay(url, item.title);
  };

  const handlePlayEpisode = async (ep: CatalogEpisode) => {
    if (!onPlay) return;
    if (ep.streamUrl) { onPlay(ep.streamUrl, `${item.title} — S${ep.season}E${ep.episode}`); return; }
    const tmdbId = item.tmdbId || item.subjectId;
    if (!tmdbId) return;
    setEpLoading(ep.id);
    const url = await triggerXcasperStream(tmdbId, 'tv', ep.season, ep.episode);
    setEpLoading(null);
    if (url) onPlay(url, `${item.title} — S${ep.season}E${ep.episode}`);
  };

  return (
    <div className="flex-shrink-0 w-36 sm:w-44 lg:w-48 cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Poster */}
      <div className={`relative ${hClass} rounded-xl overflow-hidden bg-[#111] shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-black/60`}>
        <img src={poster} alt={item.title} onError={() => setImgErr(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 to-transparent" />

        {/* Rating badge */}
        {item.rating && item.rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/75 backdrop-blur-sm rounded-lg px-1.5 py-0.5">
            <Star size={9} fill="#f5c518" className="text-[#f5c518]" />
            <span className="text-[10px] font-black text-[#f5c518]">{Number(item.rating).toFixed(1)}</span>
          </div>
        )}

        {/* Year badge */}
        {item.year && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <span className="text-[10px] font-bold text-gray-300">{item.year}</span>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          {/* Play / Episodes button */}
          <div className={`flex gap-1.5 transition-all duration-200 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            {/* Main play */}
            <button onClick={handlePlayMain}
              className="flex-1 flex items-center justify-center gap-1 bg-[#e50914] hover:bg-red-500 text-white text-[11px] font-black py-1.5 rounded-lg transition-colors shadow-lg shadow-red-900/50">
              {loading ? <Loader size={11} className="animate-spin" /> : <Play size={11} fill="white" />}
              {isSeries ? 'Play' : 'Watch'}
            </button>
            {/* Episodes toggle */}
            {hasEps && (
              <button onClick={e => { e.stopPropagation(); setShowEps(v => !v); }}
                className="px-2 bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white rounded-lg transition-colors border border-white/10">
                {showEps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Title + genre */}
      <div className="mt-2 px-0.5">
        <p className="text-white text-[12px] font-bold leading-snug line-clamp-2 group-hover:text-[#e50914] transition-colors">{item.title}</p>
        {item.genre && <p className="text-gray-600 text-[10px] mt-0.5 truncate">{item.genre}</p>}
      </div>

      {/* Episodes dropdown */}
      {showEps && hasEps && (
        <div className="mt-2 bg-[#111] border border-gray-800/60 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-3 py-2 border-b border-gray-800/40">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Episodes</p>
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-hide divide-y divide-gray-800/30">
            {item.episodes!.map(ep => (
              <button key={ep.id} onClick={() => handlePlayEpisode(ep)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 text-left transition-colors group/ep">
                <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 group-hover/ep:bg-[#e50914]/20 transition-colors">
                  {epLoading === ep.id
                    ? <Loader size={11} className="animate-spin text-[#e50914]" />
                    : <Play size={10} fill="currentColor" className="text-gray-500 group-hover/ep:text-[#e50914] ml-0.5" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[11px] font-bold truncate">
                    {ep.season > 0 ? `S${ep.season}E${ep.episode}` : `Ep ${ep.episode}`}
                    {ep.title ? ` · ${ep.title}` : ''}
                  </p>
                  {ep.duration && (
                    <p className="text-gray-600 text-[9px] mt-0.5">{Math.floor(ep.duration / 60)}m</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
