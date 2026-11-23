import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 bg-brand-off-white">
      <div className="max-w-sm text-center space-y-4">
        <p className="font-display text-5xl font-bold text-brand-green">404</p>
        <h1 className="font-display text-xl font-bold text-brand-green-deep">Page not found</h1>
        <p className="text-sm text-muted-foreground">That page doesn&apos;t exist or has moved.</p>
        <Link
          href="/"
          className="inline-flex h-10 px-5 items-center rounded-xl bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
