'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="max-w-2xl bg-white border border-red-200 rounded-lg p-8 shadow">
        <h1 className="text-2xl font-bold text-red-700 mb-2">Something went wrong</h1>
        <p className="text-slate-600 mb-4">We hit an error while loading this page.</p>
        <pre className="bg-red-50 text-red-900 text-sm p-4 rounded overflow-auto mb-4">
          {error.message}
        </pre>
        {error.digest && (
          <p className="text-xs text-slate-500 mb-4">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
