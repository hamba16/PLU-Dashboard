import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty">
      <h1>Page not found</h1>
      <p>This page is not part of the youth registration workspace.</p>
      <Link className="button primary" href="/overview">
        Return to workspace
      </Link>
    </main>
  );
}
