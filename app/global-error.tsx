'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
          <h1 style={{ color: 'red' }}>Application Error</h1>
          <pre style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, overflow: 'auto' }}>
            {error.message}
          </pre>
          <button
            onClick={reset}
            style={{ marginTop: 20, padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
