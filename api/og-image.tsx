import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const countRaw = searchParams.get('count');
  const count = countRaw ? Number(countRaw) : NaN;
  const hasCount = Number.isFinite(count) && count > 0;

  const subtitle = hasCount
    ? `${Math.floor(count)} shared favorite${Math.floor(count) === 1 ? '' : 's'}`
    : 'Spin · star · play October Jam games';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #050508 0%, #1a0a2e 42%, #0c1929 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: '#f9a8d4',
          }}
        >
          JamSlots
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 40,
            fontWeight: 700,
            color: '#fef3c7',
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </div>
        <div style={{ marginTop: 18, fontSize: 26, color: '#a1a1aa' }}>RUN.world October Jam</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
