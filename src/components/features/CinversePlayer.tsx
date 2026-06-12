import { useState, useRef, useEffect } from 'react';
import { X, Download, Loader, ChevronDown, AlertTriangle } from 'lucide-react';
import { getCinverseSources, buildStreamUrl, type CinverseSourceResult, type CinverseSubtitle } from '@/lib/cinverse';
import VideoPlayer from './VideoPlayer';
import type { StreamQuality } from '@/types';

interface CinversePlayerProps {
  mediaId: string;
  title: string;
  poster?: string;
  onClose: () => void;
}

export default function CinversePlayer({ mediaId, title, poster, onClose }: CinversePlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<CinverseSourceResult[]>([]);
  const [subtitles, setSubtitles] = useState<CinverseSubtitle[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<CinverseSourceResult | null>(null);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCinverseSources(mediaId)
      .then(data => {
        if (cancelled) return;
        if (!data.success || !data.results?.length) {
          setError('No streams available for this title');
          return;
        }
        setSources(data.results);
        setSubtitles(data.subtitles || []);
        // Auto-select best quality: prefer 1080p → 720p → first
        const preferred = data.results.find(s => s.quality === '1080p')
          || data.results.find(s => s.quality === '720p')
          || data.results[0];
        setSelectedQuality(preferred);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load stream. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [mediaId]);

  // Build StreamQuality[] for VideoPlayer
  const streams: StreamQuality[] = sources.map(s => ({
    proxyUrl: buildStreamUrl(s.stream_url),
    quality: s.quality,
    resolutions: s.quality.replace('p', ''),
    format: s.format,
  }));

  const activeStreamIndex = selectedQuality
    ? sources.findIndex(s => s.quality === selectedQuality.quality)
    : 0;

  const englishSub = subtitles.find(s => s.lan === 'en' || s.lan === 'english');

  const handleDownload = () => {
    if (!selectedQuality) return;
    const url = buildStreamUrl(selectedQuality.download_url);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${selectedQuality.quality}.${selectedQuality.format}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md px-3 sm:px-6">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-white font-black text-base truncate">{title}</p>
            {selectedQuality && (
              <span className="flex-shrink-0 text-xs bg-white/10 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full font-bold">
                {selectedQuality.quality}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quality picker */}
            {sources.length > 1 && (
              <div className="relative">
                <button onClick={() => setShowQualityDropdown(v => !v)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  {selectedQuality?.quality || 'Quality'} <ChevronDown size={12} />
                </button>
                {showQualityDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[100px]">
                    {sources.map(s => (
                      <button key={s.quality}
                        onClick={() => { setSelectedQuality(s); setShowQualityDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${selectedQuality?.quality === s.quality ? 'bg-red-700 text-white' : 'text-gray-300 hover:bg-zinc-800'}`}>
                        {s.quality}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Download */}
            {selectedQuality && (
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                <Download size={12} /> Download
              </button>
            )}
            {/* Close */}
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Player area */}
        <div className="rounded-2xl overflow-hidden bg-black border border-zinc-800/50 shadow-2xl">
          {loading ? (
            <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-zinc-950">
              <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-red-500 animate-spin" />
              <p className="text-zinc-500 text-sm font-semibold">Loading stream…</p>
            </div>
          ) : error ? (
            <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-zinc-950">
              <AlertTriangle size={32} className="text-red-700/70" />
              <p className="text-zinc-400 font-bold text-sm">{error}</p>
            </div>
          ) : streams.length > 0 ? (
            <VideoPlayer
              streams={streams}
              title={title}
              poster={poster}
              subtitleUrl={englishSub?.url}
            />
          ) : null}
        </div>

        {/* Subtitle info */}
        {subtitles.length > 0 && !loading && !error && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-zinc-600 text-[11px] font-semibold">Subtitles:</span>
            {subtitles.slice(0, 4).map(s => (
              <span key={s.lan} className="text-[10px] bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 px-2 py-0.5 rounded-full font-bold uppercase">
                {s.lan}
              </span>
            ))}
            {subtitles.length > 4 && <span className="text-zinc-600 text-[10px]">+{subtitles.length - 4}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
