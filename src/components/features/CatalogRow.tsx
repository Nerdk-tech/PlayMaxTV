import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CatalogCard, { CatalogCardSkeleton } from './CatalogCard';
import type { CatalogItem } from '@/lib/catalog';

interface CatalogRowProps {
  title: string;
  items: CatalogItem[];
  isLoading?: boolean;
  viewAllPath?: string;
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
  onPlay?: (streamUrl: string, title: string) => void;
}

export default function CatalogRow({ title, items, isLoading, viewAllPath, accent = '#e50914', size = 'md', onPlay }: CatalogRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="w-[3px] h-6 rounded-full" style={{ background: accent }} />
          <h2 className="text-white text-lg sm:text-xl font-black tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllPath && (
            <Link to={viewAllPath} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 font-semibold mr-1">
              See all <ArrowRight size={12} />
            </Link>
          )}
          <button onClick={() => scroll('left')}
            className="w-8 h-8 rounded-xl bg-[#1a1a1a] border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-600 transition-all">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => scroll('right')}
            className="w-8 h-8 rounded-xl bg-[#1a1a1a] border border-gray-800/50 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-600 transition-all">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 pb-4" style={{ scrollSnapType: 'x mandatory' }}>
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ scrollSnapAlign: 'start', animationDelay: `${i * 60}ms` }}>
                <CatalogCardSkeleton size={size} />
              </div>
            ))
          : items.length > 0
            ? items.map((item, i) => (
                <div key={item.id || i} style={{ scrollSnapAlign: 'start' }}>
                  <CatalogCard item={item} size={size} onPlay={onPlay} />
                </div>
              ))
            : <p className="text-gray-700 text-sm py-8 italic">No content available</p>
        }
      </div>
    </section>
  );
}
