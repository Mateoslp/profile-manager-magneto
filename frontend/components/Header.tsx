"use client";

import { clearToken } from "@/lib/api";

interface HeaderProps {
  email: string | null;
  onLogout: () => void;
}

export default function Header({ email, onLogout }: HeaderProps) {
  function handleLogout() {
    clearToken();
    onLogout();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark shadow-glow-sm">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-text-primary">
              LIKAI
            </span>
            <span className="ml-2 hidden text-xs text-text-muted sm:inline">
              Plataforma de Empleo con IA
            </span>
          </div>
        </div>

        {/* Usuario y salir */}
        {email && (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-3 py-1.5 sm:flex">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse-slow" />
              <span className="max-w-[180px] truncate text-xs text-text-secondary">
                {email}
              </span>
            </div>
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="btn-ghost text-xs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                />
              </svg>
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
