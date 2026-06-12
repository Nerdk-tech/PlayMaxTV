import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings, Minimize } from 'lucide-react';
import type { StreamQuality } from '@/types';

interface VideoPlayerProps {
  streams?: StreamQuality[];
  src?: string;
  title: string;
  poster?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startTime?: number;
  subtitleUrl?: string;
}

// Landscape rotation icon
const LandscapeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M19 8l3 4-3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 12H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const PortraitIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect x="7" y="2" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M10 21l2 3 2-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 24V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export default function VideoPlayer({ streams = [], src, title, poster, onTimeUpdate, startTime = 0, subtitleUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [qualityIdx, setQualityIdx] = useState(() => {
    const idx = streams.findIndex(s => (s.resolutions || s.quality || '') === '720');
    return idx >= 0 ? idx : 0;
  });
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStream = streams[qualityIdx] ?? null;
  const activeSrc = activeStream?.proxyUrl || src || '';

  useEffect(() => {
    if (streams.length > 0) {
      const idx720 = streams.findIndex(s => (s.resolutions || s.quality || '').toString() === '720');
      setQualityIdx(idx720 >= 0 ? idx720 : 0);
    }
  }, [streams]);

  const qualityLabel = (s: StreamQuality) => {
    const r = String(s.resolutions || s.quality || '');
    if (!r) return 'Auto';
    const n = parseInt(r);
    if (n >= 1080) return '1080p HD';
    if (n >= 720) return '720p';
    if (n >= 480) return '480p';
    return r || 'Auto';
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${m}:${String(sec).padStart(2,'0')}`;
  };

  const resetControlsTimer = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    if (playing) controlsTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, [playing]);

  useEffect(() => { resetControlsTimer(); }, [playing, resetControlsTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;
    setError(false); setBuffering(true);
    let hlsInstance: { destroy: () => void } | null = null;
    const isHls = activeSrc.includes('.m3u8') || activeSrc.includes('hls') || activeSrc.includes('playlist');

    if (isHls) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = activeSrc; }
          else { setError(true); setBuffering(false); }
          return;
        }
        const hls = new Hls({ enableWorker: false, maxBufferLength: 30 });
        hlsInstance = hls;
        hls.loadSource(activeSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { setBuffering(false); video.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal?: boolean }) => { if (d.fatal) { setError(true); setBuffering(false); } });
      });
    } else {
      video.src = activeSrc;
      video.load();
    }
    return () => { hlsInstance?.destroy(); };
  }, [activeSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !startTime || startTime <= 0) return;
    const onLoaded = () => { if (video.duration > startTime) video.currentTime = startTime; };
    video.addEventListener('loadedmetadata', onLoaded);
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, [startTime, activeSrc]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const seek = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + secs));
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = (parseFloat(e.target.value) / 100) * (v.duration || 0);
    v.currentTime = t; setCurrentTime(t);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  };

  // ── Landscape rotation (Web Screen Orientation API) ──────────────────────
  const toggleLandscape = async () => {
    try {
      const el = containerRef.current;
      if (!isLandscape) {
        if (el && !document.fullscreenElement) {
          await el.requestFullscreen().catch(() => {});
        }
        try {
          await (screen.orientation as { lock(o: string): Promise<void> }).lock('landscape');
        } catch { /* not supported on desktop — fullscreen is enough */ }
        setIsLandscape(true);
      } else {
        try {
          (screen.orientation as { unlock(): void }).unlock?.();
        } catch { /* ignore */ }
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        setIsLandscape(false);
      }
    } catch { setIsLandscape(false); }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden rounded-2xl"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={e => { if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') { resetControlsTimer(); if (!showControls) setShowControls(true); } }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        playsInline
        crossOrigin="anonymous"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrentTime(v.currentTime);
          onTimeUpdate?.(v.currentTime, v.duration || 0);
        }}
        onLoadedMetadata={() => { const v = videoRef.current; if (v) setDuration(v.duration || 0); }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => { setBuffering(false); setError(false); }}
        onError={() => { setError(true); setBuffering(false); }}
      >
        {subtitleUrl && <track kind="subtitles" src={subtitleUrl} default />}
      </video>

      {/* Buffering ring */}
      {buffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-white/90 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90">
          <div className="w-14 h-14 rounded-full bg-red-950/50 border border-red-800/40 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className="text-white font-bold text-sm">Playback unavailable</p>
          <p className="text-gray-500 text-xs">Try switching quality or refresh the page</p>
        </div>
      )}

      {/* ── Controls overlay ──────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 select-none ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.92) 100%)' : 'none' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-3.5">
          <p className="text-white font-bold text-sm drop-shadow-lg truncate max-w-[55%] tracking-tight">{title}</p>
          <div className="flex items-center gap-2">
            {/* Quality selector */}
            {streams.length > 1 && (
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowQualityMenu(v => !v); }}
                  className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
                >
                  <Settings size={11} />
                  {qualityLabel(streams[qualityIdx])}
                </button>
                {showQualityMenu && (
                  <div className="absolute top-full right-0 mt-1.5 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[120px]">
                    {streams.map((s, i) => (
                      <button key={i}
                        onClick={e => { e.stopPropagation(); setQualityIdx(i); setShowQualityMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${i === qualityIdx ? 'bg-[#e50914] text-white' : 'text-gray-300 hover:bg-white/10'}`}
                      >
                        {qualityLabel(s)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: big play button */}
        <div className="flex items-center justify-center gap-10">
          <button onClick={e => { e.stopPropagation(); seek(-10); }} className="text-white/80 hover:text-white transition-colors">
            <SkipBack size={28} />
          </button>
          <button onClick={e => { e.stopPropagation(); togglePlay(); }}
            className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/25 transition-all hover:scale-105 active:scale-95">
            {playing ? <Pause size={26} className="text-white" /> : <Play size={26} className="text-white ml-1" fill="white" />}
          </button>
          <button onClick={e => { e.stopPropagation(); seek(10); }} className="text-white/80 hover:text-white transition-colors">
            <SkipForward size={28} />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-3.5 space-y-2.5">
          {/* Seekbar */}
          <input type="range" min={0} max={100} value={progress}
            onChange={handleSeekBar}
            onClick={e => e.stopPropagation()}
            className="w-full h-[3px] appearance-none rounded-full cursor-pointer"
            style={{ background: `linear-gradient(to right, #e50914 ${progress}%, rgba(255,255,255,0.15) ${progress}%)`, accentColor: '#e50914' }}
          />

          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center gap-3">
              <button onClick={e => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-red-400 transition-colors">
                {playing ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
              </button>
              <button onClick={e => { e.stopPropagation(); const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); }} className="text-white/80 hover:text-white transition-colors">
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={e => { const v = videoRef.current; const val = parseFloat(e.target.value); if (!v) return; v.volume = val; setVolume(val); if (val === 0) { v.muted = true; setMuted(true); } else { v.muted = false; setMuted(false); } }}
                onClick={e => e.stopPropagation()}
                className="w-16 sm:w-20 h-[3px] appearance-none rounded-full cursor-pointer hidden sm:block"
                style={{ background: `linear-gradient(to right, white ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%)` }}
              />
              <span className="text-white/60 text-xs font-mono hidden sm:inline">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* 📱 Landscape rotation button */}
              <button
                onClick={e => { e.stopPropagation(); toggleLandscape(); }}
                title={isLandscape ? 'Exit landscape' : 'Rotate to landscape'}
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                  isLandscape
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50'
                    : 'bg-black/50 border-white/10 text-white/80 hover:border-white/25 hover:text-white hover:bg-white/10'
                }`}
              >
                {isLandscape ? <PortraitIcon /> : <LandscapeIcon />}
                <span className="hidden sm:inline">{isLandscape ? 'Portrait' : 'Landscape'}</span>
              </button>
              {/* Fullscreen */}
              <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }} className="text-white/80 hover:text-white transition-colors p-1">
                {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
