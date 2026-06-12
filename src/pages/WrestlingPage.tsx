import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// ─── WWE Embed only ─────────────────────────────────────────────────────────
// Source: Dailymotion official WWE channel

const WWE_EMBED_URL = 'https://www.dailymotion.com/embed/video/xac03pg?autoplay=1&ui-theme=dark&controls=1';

export default function WrestlingPage() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Atmospheric glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] bg-red-950/7 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-900/5 rounded-full blur-[120px]" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-20 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-700 to-red-950 flex items-center justify-center shadow-lg shadow-red-900/40 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="white" strokeWidth="1.8"/>
                <path d="M8 9c0 0 1-2 4-2s4 2 4 2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M7 14l2-2 3 3 3-3 2 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight">WWE</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400/70 text-[11px] font-black uppercase tracking-widest">On Air</span>
              </div>
            </div>
          </div>

          {/* Player */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800/30 shadow-2xl shadow-black/70 bg-black">
            {/* Subtle inner glow ring */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-red-500/8 pointer-events-none z-10" />
            <iframe
              src={WWE_EMBED_URL}
              className="w-full aspect-video border-0 block"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              title="WWE"
            />
          </div>

          {/* Footer label */}
          <div className="flex items-center justify-center gap-2 mt-4 opacity-40">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Live Wrestling</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
