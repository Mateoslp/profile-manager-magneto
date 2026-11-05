"use client";

import { clearToken } from "@/lib/api";
import { Step } from "@/components/StepIndicator";

interface NavbarProps {
  email: string | null;
  currentStep: Step;
  hasResultado: boolean;
  onNavigate: (step: Step) => void;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  step: Step;
  label: string;
  shortLabel?: string;
  icon: string;
  requiresResultado?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "nav-entrevista",
    step: 2,
    label: "Entrevista con Lexi",
    shortLabel: "Entrevista Lexi",
    icon: "💬",
  },
  {
    id: "nav-resultados",
    step: 3,
    label: "Resultados",
    icon: "✨",
    requiresResultado: true,
  },
  {
    id: "nav-tablero",
    step: 4,
    label: "Tablero de postulaciones",
    shortLabel: "Tablero",
    icon: "📋",
  },
];

export default function Navbar({
  email,
  currentStep,
  hasResultado,
  onNavigate,
  onLogout,
}: NavbarProps) {
  function handleNav(targetStep: Step, isDisabled: boolean) {
    if (isDisabled) return;
    onNavigate(targetStep);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleLogout() {
    clearToken();
    onLogout();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-2.5 sm:px-6">
        {/* Marca y Logo */}
        <div
          onClick={() => (email ? handleNav(2, false) : undefined)}
          className={`flex items-center gap-2.5 ${email ? "cursor-pointer" : ""}`}
          title={email ? "Ir a la entrevista" : "LIKAI"}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark shadow-glow-sm">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-text-primary">
              LIKAI
            </span>
            <span className="hidden text-[10px] text-text-muted sm:inline leading-none">
              Plataforma de Empleo con IA
            </span>
          </div>
        </div>

        {/* Enlaces de navegación accesibles (visibles con sesión iniciada) */}
        {email && (
          <nav
            aria-label="Navegación principal"
            className="order-3 flex w-full items-center gap-1.5 overflow-x-auto pb-1 pt-1 md:order-2 md:w-auto md:py-0"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = currentStep === item.step;
              const isDisabled = Boolean(item.requiresResultado && !hasResultado);
              const tooltip = isDisabled
                ? "Primero completa tu perfil o entrevista para desbloquear los resultados"
                : `Ir a ${item.label}`;

              return (
                <button
                  key={item.id}
                  id={item.id}
                  type="button"
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  aria-current={isActive ? "page" : undefined}
                  title={tooltip}
                  onClick={() => handleNav(item.step, isDisabled)}
                  className={[
                    "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    isActive
                      ? "bg-accent/20 text-accent-light border border-accent/40 shadow-glow-sm font-semibold"
                      : isDisabled
                      ? "opacity-40 cursor-not-allowed text-text-muted border border-transparent"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent",
                  ].join(" ")}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
                  {isDisabled && (
                    <span
                      className="ml-1 text-[10px] text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-surface-border/60"
                      aria-label="Pendiente de análisis"
                    >
                      pendiente
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Usuario autenticado y Salir */}
        {email && (
          <div className="order-2 flex items-center gap-2 md:order-3 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-3 py-1.5 sm:flex">
              <div className="h-2 w-2 rounded-full bg-status-success animate-pulse-slow" />
              <span className="max-w-[160px] truncate text-xs text-text-secondary">
                {email}
              </span>
            </div>
            <button
              id="btn-logout"
              type="button"
              onClick={handleLogout}
              className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                />
              </svg>
              <span>Salir</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

