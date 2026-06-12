import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// ─── Static channel dictionary ────────────────────────────────────────────────
const liveTvChannels = [
  { name: 'SABC 1',      link: 'https://sabconeta.cdn.mangomolo.com/sabc1/smil:sabc1.stream.smil/master.m3u8',          logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/SABC_1_logo_2022.png',                      category: 'SABC' },
  { name: 'SABC 2',      link: 'https://sabctwota.cdn.mangomolo.com/sabc2/smil:sabc2.stream.smil/master.m3u8',           logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/SABC_2_logo.png',                           category: 'SABC' },
  { name: 'SABC 3',      link: 'https://sabctreta.cdn.mangomolo.com/sabc3/smil:sabc3.stream.smil/master.m3u8',           logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/SABC_3_logo.png',                           category: 'SABC' },
  { name: 'SABC News',   link: 'https://sabconetanw.cdn.mangomolo.com/news/smil:news.stream.smil/master.m3u8',           logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/SABC_News_logo.png',                       category: 'SABC' },
  { name: 'SABC Lehae',  link: 'https://sabctretalh.cdn.mangomolo.com/lehae/smil:lehae.stream.smil/master.m3u8',         logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=SABC+Lehae',                                   category: 'SABC' },
  { name: 'LN24SA',      link: 'https://cdnstack.internetmultimediaonline.org/ln24/ln24.stream/playlist.m3u8',           logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=LN24SA',                                       category: 'News' },
  { name: 'BOKTV',       link: 'https://livestream2.bokradio.co.za/hls/Bok5c.m3u8',                                     logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=BOKTV',                                        category: 'News' },
  { name: 'Hope Channel Africa',     link: 'https://jstre.am/live/jsl:i1onRBELcGV.m3u8',                               logoUrl: 'https://upload.wikimedia.org/wikipedia/en/3/3a/Hope_Channel_logo.png',                         category: 'Religious' },
  { name: 'LoveworldSAT',            link: 'https://cdnstack.internetmultimediaonline.org/lwsat/lwsat.stream/index.m3u8', logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=LoveworldSAT',                               category: 'Religious' },
  { name: 'Seraphim TV',             link: 'https://restream.churchtv247.co.za/Apostle/Hggc@24/1.m3u8',                 logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Seraphim+TV',                                  category: 'Religious' },
  { name: 'Redemption TV Ministry',  link: 'https://live.nixsat.com/play/rtm/index.m3u8',                              logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Redemption+TV',                                 category: 'Religious' },
  { name: 'Faith TV',                link: 'https://cdn.freevisiontv.co.za/sttv/smil:faith.stream.smil/playlist.m3u8', logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Faith+TV',                                     category: 'Religious' },
  { name: 'WildEarth',               link: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01290-wildearth-oando/playlist.m3u8',   logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=WildEarth',                            category: 'Documentary' },
  { name: 'WildEarth (Alt 1)',        link: 'https://wildearth-ono.amagi.tv/playlist/amg01290-wildearth-oando/playlist.m3u8',    logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=WildEarth+Alt',                         category: 'Documentary' },
  { name: 'WildEarth (Alt 2)',        link: 'https://wildearth-xumo.amagi.tv/master.m3u8',                              logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=WildEarth+Alt+2',                               category: 'Documentary' },
  { name: '1KZN TV',       link: 'https://cdn.freevisiontv.co.za/sttv/smil:1kzn.stream.smil/playlist.m3u8',             logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=1KZN+TV',                                      category: 'Local' },
  { name: 'Cape Town TV',  link: 'https://cdn.freevisiontv.co.za/sttv/smil:ctv.stream.smil/playlist.m3u8',              logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Cape+Town+TV',                                  category: 'Local' },
  { name: 'Soweto TV',     link: 'https://cdn.freevisiontv.co.za/sttv/smil:soweto.stream.smil/playlist.m3u8',           logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Soweto+TV',                                     category: 'Local' },
  { name: 'Tshwane TV',    link: 'https://cdn.freevisiontv.co.za/sttv/smil:tshwane.stream.smil/playlist.m3u8',          logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Tshwane+TV',                                    category: 'Local' },
  { name: 'TV BRICS Africa', link: 'https://cdn.freevisiontv.co.za/sttv/smil:brics.stream.smil/playlist.m3u8',          logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=TV+BRICS',                                     category: 'Local' },
  { name: 'Homebase TV',     link: 'https://webstreaming-2.viewmedia.tv/web_022/Stream/playlist.m3u8',                  logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Homebase+TV',                                   category: 'Local' },
  { name: 'Homebase TV (Alt)', link: 'https://viewmedia7219.bozztv.com/wmedia/viewmedia100/web_022/Stream/playlist.m3u8', logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=Homebase+Alt',                               category: 'Local' },
  { name: 'NuView TV',     link: 'https://viewmedia7219.bozztv.com/wmedia/viewmedia100/web_002/Stream/playlist.m3u8',   logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=NuView+TV',                                     category: 'Local' },
  { name: 'RLW TV',        link: 'https://webstreaming-8.viewmedia.tv/web_119/Stream/playlist.m3u8',                    logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=RLW+TV',                                       category: 'Local' },
  { name: 'ROV TV',        link: 'https://viewmedia7219.bozztv.com/wmedia/viewmedia100/web_012/Stream/playlist.m3u8',   logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=ROV+TV',                                       category: 'Local' },
  { name: 'GNF TV',        link: 'https://oqgdrb8my4rm-hls-live.5centscdn.com/GNF02/bcea197d8b00f79cb716c6288a861000.sdp/playlist.m3u8', logoUrl: 'https://placehold.co/120x120/18181b/71717a?text=GNF+TV', category: 'Local' },
];

type Channel = typeof liveTvChannels[0];
const CATEGORIES = ['All', ...Array.from(new Set(liveTvChannels.map(c => c.category)))];

// ─── Category accent colors ───────────────────────────────────────────────────
const CAT_ACCENTS: Record<string, string> = {
  SABC: 'from-blue-800 to-blue-950',
  News: 'from-slate-700 to-slate-900',
  Religious: 'from-amber-700 to-amber-950',
  Documentary: 'from-emerald-800 to-emerald-950',
  Local: 'from-violet-800 to-violet-950',
};

const CAT_BADGES: Record<string, string> = {
  SABC: 'bg-blue-900/40 border-blue-700/30 text-blue-300',
  News: 'bg-slate-800/50 border-slate-700/30 text-slate-400',
  Religious: 'bg-amber-900/30 border-amber-700/30 text-amber-300',
  Documentary: 'bg-emerald-900/30 border-emerald-700/30 text-emerald-300',
  Local: 'bg-violet-900/30 border-violet-700/30 text-violet-300',
};

// ─── HLS player component ─────────────────────────────────────────────────────
function HLSChannelPlayer({ channel }: { channel: Channel }) {
  const vRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    setLoading(true); setErr(false);
    let hls: { destroy(): void } | null = null;

    import('hls.js').then(({ default: Hls }) => {
      if (!Hls.isSupported()) {
        if (v.canPlayType('application/vnd.apple.mpegurl')) {
          v.src = channel.link;
          v.load();
        } else { setErr(true); setLoading(false); }
        return;
      }
      const h = new Hls({ enableWorker: false, maxBufferLength: 30 });
      hls = h;
      h.loadSource(channel.link);
      h.attachMedia(v);
      h.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); v.play().catch(() => {}); });
      h.on(Hls.Events.ERROR, (_: unknown, d: { fatal?: boolean }) => {
        if (d.fatal) { setErr(true); setLoading(false); }
      });
    });

    return () => { hls?.destroy(); };
  }, [channel.link]);

  return (
    <div className="relative w-full bg-black rounded-2xl overflow-hidden border border-zinc-800/40 shadow-2xl shadow-black/60" style={{ aspectRatio: '16/9' }}>
      <video ref={vRef} className="w-full h-full object-contain" playsInline autoPlay muted
        onPlaying={() => setLoading(false)}
        onError={() => { setErr(true); setLoading(false); }} />
      {loading && !err && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/90">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-red-500 animate-spin" />
          <p className="text-zinc-600 text-sm font-semibold">Connecting to {channel.name}…</p>
        </div>
      )}
      {err && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/95">
          <img src={channel.logoUrl} alt={channel.name} className="w-16 h-16 object-contain opacity-30" />
          <p className="text-zinc-500 text-sm font-bold">{channel.name}</p>
          <p className="text-zinc-700 text-xs">Signal unavailable — try another channel</p>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LiveTVPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeChannel, setActiveChannel] = useState<Channel>(liveTvChannels[0]);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const filtered = activeCategory === 'All'
    ? liveTvChannels
    : liveTvChannels.filter(c => c.category === activeCategory);

  const handleChannelClick = (ch: Channel) => {
    setActiveChannel(ch);
    // Smooth scroll to player on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-blue-950/6 rounded-full blur-[140px]" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-20 pb-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center gap-4 pb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="13" rx="2" stroke="white" strokeWidth="1.8"/><path d="M16 2l-4 5M8 2l4 5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tight">Live TV</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400/60 text-[11px] font-black uppercase tracking-widest">{liveTvChannels.length} Channels</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

            {/* ── Left: Player + Now Playing ──────────────────────────────────── */}
            <div className="lg:col-span-2 xl:col-span-3 space-y-4">
              <HLSChannelPlayer key={activeChannel.link} channel={activeChannel} />

              {/* Now playing bar */}
              <div className="flex items-center gap-3 px-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700/40">
                  <img src={activeChannel.logoUrl} alt={activeChannel.name}
                    onError={() => setImgErrors(e => ({ ...e, [activeChannel.name]: true }))}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-black truncate">{activeChannel.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Live</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${CAT_BADGES[activeChannel.category] || 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                      {activeChannel.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Channel sidebar ───────────────────────────────────────── */}
            <div className="space-y-3">
              {/* Category filter pills */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                      activeCategory === cat
                        ? `bg-gradient-to-r ${CAT_ACCENTS[cat] || 'from-zinc-700 to-zinc-900'} border-transparent text-white shadow-lg`
                        : 'bg-zinc-900/60 border-zinc-800/40 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Channel list */}
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto scrollbar-hide pr-1">
                {filtered.map(ch => {
                  const isActive = ch.link === activeChannel.link;
                  return (
                    <button key={ch.link} onClick={() => handleChannelClick(ch)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                        isActive
                          ? 'bg-zinc-800/80 border-zinc-600/50'
                          : 'bg-zinc-900/40 border-zinc-800/20 hover:border-zinc-700/50 hover:bg-zinc-900/70'
                      }`}>
                      {/* Logo */}
                      <div className="w-11 h-11 rounded-xl bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-700/30 flex items-center justify-center">
                        {!imgErrors[ch.name] ? (
                          <img src={ch.logoUrl} alt={ch.name}
                            onError={() => setImgErrors(e => ({ ...e, [ch.name]: true }))}
                            className="w-full h-full object-contain p-1.5" />
                        ) : (
                          <span className="text-zinc-500 text-[10px] font-black text-center px-1 leading-tight">{ch.name.slice(0, 6)}</span>
                        )}
                      </div>
                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>{ch.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold mt-0.5 inline-block ${CAT_BADGES[ch.category] || 'bg-zinc-800 text-zinc-600 border-zinc-700'}`}>
                          {ch.category}
                        </span>
                      </div>
                      {/* Live indicator */}
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <p className="text-zinc-700 text-[10px] text-center font-semibold pt-1">{filtered.length} of {liveTvChannels.length} channels</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
