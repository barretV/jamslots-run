import React from 'react';
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400';

const pill = (label: string) => (
  <div
    style={{
      display: 'flex',
      padding: '10px 20px',
      borderRadius: 999,
      border: '1px solid rgba(244, 114, 182, 0.35)',
      background: 'rgba(88, 28, 135, 0.45)',
      color: '#fae8ff',
      fontSize: 20,
      fontWeight: 700,
    }}
  >
    {label}
  </div>
);

function parseSubtitle(request: Request): { subtitle: string; favCount: number | null } {
  const { searchParams } = new URL(request.url);
  const countRaw = searchParams.get('count');
  const count = countRaw ? Number(countRaw) : NaN;
  const hasFavCount = Number.isFinite(count) && count > 0;

  const gamesRaw = searchParams.get('games');
  const games = gamesRaw ? Number(gamesRaw) : NaN;
  const hasGames = Number.isFinite(games) && games > 0;

  if (hasFavCount) {
    const n = Math.floor(count);
    return {
      subtitle: `${n} shared favorite${n === 1 ? '' : 's'}`,
      favCount: n,
    };
  }
  if (hasGames) {
    const n = Math.floor(games);
    const gamesLabel = n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n);
    return {
      subtitle: `${gamesLabel} jam games · spin · star · play`,
      favCount: null,
    };
  }
  return {
    subtitle: 'Spin · star · play October Jam games on RUN',
    favCount: null,
  };
}

function buildOgElement(subtitle: string, favCount: number | null) {
  const showFav = favCount != null && favCount > 0;
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(145deg, #050508 0%, #1a0a2e 48%, #0c1929 100%)',
        fontFamily: 'system-ui, sans-serif',
        padding: 48,
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 620 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(196, 181, 253, 0.9)',
            }}
          >
            RUN October Jam
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 10,
              fontSize: 88,
              fontWeight: 900,
              color: '#f9a8d4',
            }}
          >
            JamSlots
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              fontSize: 34,
              fontWeight: 700,
              color: '#fef3c7',
              maxWidth: 560,
            }}
          >
            {subtitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', marginTop: 28, gap: 12 }}>
            {pill('Slots')}
            {pill('Library')}
            {pill('Favorites')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 12,
              padding: 18,
              borderRadius: 20,
              border: '1px solid rgba(192, 132, 252, 0.35)',
              background: 'linear-gradient(180deg, #4c1d95 0%, #0c0a12 100%)',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 100,
                height: 148,
                borderRadius: 12,
                background: 'linear-gradient(160deg, #4c1d95 0%, #831843 100%)',
              }}
            />
            <div
              style={{
                display: 'flex',
                width: 100,
                height: 148,
                borderRadius: 12,
                background: 'linear-gradient(160deg, #0e7490 0%, #164e63 100%)',
              }}
            />
            <div
              style={{
                display: 'flex',
                width: 100,
                height: 148,
                borderRadius: 12,
                background: 'linear-gradient(160deg, #b45309 0%, #7c2d12 100%)',
              }}
            />
          </div>
          <div
            style={{
              display: showFav ? 'flex' : 'none',
              flexDirection: 'row',
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
            {showFav ? `${Math.floor(favCount!)} favorites` : ''}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 18,
          color: '#71717a',
          fontSize: 22,
        }}
      >
        <div style={{ display: 'flex' }}>jamslots-run.vercel.app</div>
        <div style={{ display: 'flex', color: '#67e8f9', fontWeight: 700 }}>Vote on RUN</div>
      </div>
    </div>
  );
}

async function renderOg(element: React.ReactElement): Promise<Response> {
  const image = new ImageResponse(element, {
    width: 1200,
    height: 630,
  });
  const headers = new Headers(image.headers);
  headers.set('Cache-Control', CACHE_CONTROL);
  return new Response(image.body, { status: image.status, headers });
}

export default async function handler(request: Request): Promise<Response> {
  const { subtitle, favCount } = parseSubtitle(request);
  try {
    return await renderOg(buildOgElement(subtitle, favCount));
  } catch {
    try {
      return await renderOg(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(145deg, #050508 0%, #1a0a2e 48%, #0c1929 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 900, color: '#f9a8d4' }}>JamSlots</div>
          <div style={{ display: 'flex', marginTop: 20, fontSize: 36, fontWeight: 700, color: '#fef3c7' }}>
            {subtitle}
          </div>
        </div>,
      );
    } catch {
      return new Response('OG image unavailable', {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
  }
}
