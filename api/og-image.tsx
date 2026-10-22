import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

async function loadFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 700 | 800 | 900; style: 'normal' }[]
> {
  try {
    const [display, body] = await Promise.all([
      fetch(
        'https://fonts.gstatic.com/s/unbounded/v12/Yq6F-LOTXCb04q32xlpat-6uR42XTqtG67H2040.ttf',
      ).then((r) => (r.ok ? r.arrayBuffer() : null)),
      fetch('https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx2Xm0.woff').then((r) =>
        r.ok ? r.arrayBuffer() : null,
      ),
    ]);
    const fonts: { name: string; data: ArrayBuffer; weight: 700 | 800 | 900; style: 'normal' }[] =
      [];
    if (display) fonts.push({ name: 'Unbounded', data: display, weight: 900, style: 'normal' });
    if (body) fonts.push({ name: 'Outfit', data: body, weight: 700, style: 'normal' });
    return fonts;
  } catch {
    return [];
  }
}

function ReelPoster(colors: [string, string]) {
  return (
    <div
      style={{
        width: 118,
        height: 168,
        borderRadius: 14,
        border: '2px solid rgba(192, 132, 252, 0.45)',
        background: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        boxShadow: '0 8px 28px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 10,
      }}
    >
      <div
        style={{
          width: '78%',
          height: 8,
          borderRadius: 4,
          background: 'rgba(0,0,0,0.35)',
        }}
      />
    </div>
  );
}

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const countRaw = searchParams.get('count');
  const count = countRaw ? Number(countRaw) : NaN;
  const hasFavCount = Number.isFinite(count) && count > 0;

  const gamesRaw = searchParams.get('games');
  const games = gamesRaw ? Number(gamesRaw) : NaN;
  const hasGames = Number.isFinite(games) && games > 0;

  const subtitle = hasFavCount
    ? `${Math.floor(count)} shared favorite${Math.floor(count) === 1 ? '' : 's'}`
    : hasGames
      ? `${Math.floor(games).toLocaleString()} jam games · spin · star · play`
      : 'Spin · star · play October Jam games on RUN';

  const fonts = await loadFonts();
  const displayFont = fonts.some((f) => f.name === 'Unbounded')
    ? 'Unbounded, system-ui, sans-serif'
    : 'system-ui, sans-serif';
  const bodyFont = fonts.some((f) => f.name === 'Outfit')
    ? 'Outfit, system-ui, sans-serif'
    : 'system-ui, sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(168, 85, 247, 0.42), transparent), radial-gradient(ellipse 70% 50% at 100% 80%, rgba(251, 191, 36, 0.14), transparent), #050508',
          fontFamily: bodyFont,
          padding: 48,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 620 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(196, 181, 253, 0.85)',
              }}
            >
              RUN · October Jam
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 88,
                fontWeight: 900,
                fontFamily: displayFont,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: '#f9a8d4',
                textShadow: '0 0 40px rgba(244, 114, 182, 0.45), 0 2px 0 #831843',
                lineHeight: 1,
              }}
            >
              JamSlots
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: 34,
                fontWeight: 700,
                color: '#fef3c7',
                lineHeight: 1.25,
                maxWidth: 560,
              }}
            >
              {subtitle}
            </div>
            <div style={{ display: 'flex', marginTop: 28, gap: 12 }}>
              {['Slots', 'Library', 'Favorites'].map((label) => (
                <div
                  key={label}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 999,
                    border: '1px solid rgba(244, 114, 182, 0.35)',
                    background: 'rgba(88, 28, 135, 0.35)',
                    color: '#fae8ff',
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 14,
                padding: 20,
                borderRadius: 24,
                border: '1px solid rgba(192, 132, 252, 0.35)',
                background:
                  'linear-gradient(180deg, rgba(76, 29, 149, 0.55) 0%, rgba(12, 10, 18, 0.92) 100%)',
                boxShadow: 'inset 0 0 48px rgba(168, 85, 247, 0.18), 0 12px 40px rgba(0,0,0,0.5)',
              }}
            >
              <ReelPoster colors={['#4c1d95', '#831843']} />
              <ReelPoster colors={['#0e7490', '#164e63']} />
              <ReelPoster colors={['#b45309', '#7c2d12']} />
            </div>
            {hasFavCount ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 22px',
                  borderRadius: 999,
                  border: '1px solid rgba(251, 191, 36, 0.5)',
                  background: 'rgba(30, 20, 8, 0.9)',
                  color: '#fde68a',
                  fontSize: 26,
                  fontWeight: 800,
                }}
              >
                <span style={{ color: '#f472b6', fontSize: 30 }}>★</span>
                {Math.floor(count)} favorites
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 18,
            color: '#71717a',
            fontSize: 22,
          }}
        >
          <span>jamslots-run.vercel.app</span>
          <span style={{ color: '#67e8f9', fontWeight: 700 }}>▲ Vote on RUN</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );
}
