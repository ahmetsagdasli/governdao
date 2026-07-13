import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link
              to="/"
              className="font-display text-xl font-semibold tracking-tight text-ink"
            >
              GovernDAO
            </Link>
            <nav className="hidden sm:flex items-center gap-7 text-sm text-muted">
              <Link to="/" className="hover:text-ink transition-colors">
                Proposals
              </Link>
              <Link to="/create" className="hover:text-ink transition-colors">
                New Proposal
              </Link>
            </nav>
          </div>
          <ConnectButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">{children}</main>
    </div>
  );
}
