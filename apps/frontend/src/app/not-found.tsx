import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
      <Link
        href="/dashboard"
        className="mt-6 text-sm text-primary hover:underline"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}