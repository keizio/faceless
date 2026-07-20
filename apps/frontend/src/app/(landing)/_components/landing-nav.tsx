"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass mt-4 flex items-center justify-between rounded-2xl px-4 py-3 sm:px-6 depth-2">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-256.webp"
              alt="Faceless"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-lg font-semibold text-foreground">
              Faceless
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="#showcase"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Examples
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          <button
            type="button"
            className="flex items-center justify-center md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "glass mx-4 mt-2 overflow-hidden rounded-2xl transition-all duration-300 md:hidden depth-2",
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="flex flex-col gap-2 px-4 py-4">
          <Link
            href="#features"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            How It Works
          </Link>
          <Link
            href="#showcase"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            Examples
          </Link>
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}