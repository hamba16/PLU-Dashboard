"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>Workspace unavailable</h1>
      <p>
        We could not load your workspace. Please retry or contact your
        administrator.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
