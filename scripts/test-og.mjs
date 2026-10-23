import handler from '../api/og-image.tsx';

const cases = [
  'https://jamslots-run.vercel.app/api/og-image?v=2',
  'https://jamslots-run.vercel.app/api/og-image?games=842&v=2',
  'https://jamslots-run.vercel.app/api/og-image?count=3&v=2',
];

let ok = true;
for (const url of cases) {
  const res = await handler(new Request(url));
  const buf = await res.arrayBuffer();
  const cache = res.headers.get('cache-control') ?? '';
  const bytes = buf.byteLength;
  const pass = bytes > 5000 && !cache.includes('immutable');
  console.log(`${pass ? 'ok' : 'FAIL'} ${url}`);
  console.log(`  bytes=${bytes} cache-control=${cache}`);
  if (!pass) ok = false;
}

if (!ok) process.exit(1);
