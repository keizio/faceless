"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import "@/styles/globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <head>
        <title>Faceless — AI Content Generator</title>
        <meta name="description" content="AI-powered social media content generation platform" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo-256.webp" type="image/webp" sizes="256x256" />
        <link rel="apple-touch-icon" href="/logo-512.webp" />
        <meta property="og:image" content="/opengraph-image.png" />
        <meta property="og:title" content="Faceless — AI Content Generator" />
        <meta property="og:description" content="AI-powered social media content generation platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </body>
    </html>
  );
}