import { useState } from 'react';
import { Play, Star, Download } from 'lucide-react';
import type { CinverseMediaResult } from '@/lib/cinverse';

interface CinverseCardProps {
  item: CinverseMediaResult;
  onPlay: (id: string, title: string, poster?: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function CinverseCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-36 sm:w-44">
      <div className="h-52 sm:h-64 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-pulse" style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite' }} />
      <div className="mt-2.5 h-3 w-3/4 rounded-full bg-zinc-800 animate-pulse" />
      <div className="mt-1.5 h-2.5 w-1/2 rounded-full bg-zinc-900 animate-pulse" />
    </div>
  );
}

export default function CinverseCard({ item, onPlay, size = 'md' }: CinverseCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);

  const hClass = size === 'lg' ? 'h-64 sm:h-80' : size === 'sm' ? 'h-44 sm:h-52' : 'h-52 sm:h-64';
  const posterSrc = !imgErr && item.poster
    ? item.poster
    : `https://placehold.co/300x450/18181b/3f3f46?text=${encodeURIComponent((item.title || '').slice(0, 12))}`;

  return (
    <div className="flex-shrink-0 w-36 sm:w-44 cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Poster */}
      <div className={`relative ${hClass} rounded-xl overflow-hidden bg-zinc-900 shadow-lg transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl group-hover:shadow-black/70`}>
        <img src={posterSrc} alt={item.title} onError={() => setImgErr(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />

        {/* Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

        {/* Rating */}
        {item.rating && item.rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/80 backdrop-blur-sm rounded-lg px-1.5 py-0.5">
            <Star size={9} fill="#f5c518" className="text-[#f5c518]" />
            <span className="text-[10px] font-black text-[#f5c518]">{Number(item.rating).toFixed(1)}</span>
          </div>
        )}

        {/* Year */}
        {item.year && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <span className="text-[10px] font-bold text-zinc-300">{item.year}</span>
          </div>
        )}

        {/* Hover actions */}
        <div className={`absolute inset-0 flex items-center justify-center gap-2.5 transition-all duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => onPlay(item.id, item.title, item.poster)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 shadow-xl shadow-red-900/60 transition-all scale-90 group-hover:scale-100">
            <Play size={22} fill="white" className="text-white ml-1" />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-2 px-0.5">
        <p className="text-zinc-100 text-[12px] font-bold leading-snug line-clamp-2 group-hover:text-red-400 transition-colors">{item.title}</p>
        {item.genre && <p className="text-zinc-600 text-[10px] mt-0.5 truncate">{String(item.genre).split(',')[0]}</p>}
      </div>
    </div>
  );
}
