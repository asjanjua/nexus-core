import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel max-w-2xl space-y-2">
      <p className="panel-title">Not Found</p>
      <p className="text-sm text-white/75">The requested Mission Control item could not be found.</p>
      <Link href="/" className="btn-subtle inline-block">
        Return Home
      </Link>
    </div>
  );
}

