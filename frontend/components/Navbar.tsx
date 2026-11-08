"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiGetNotificaciones,
  apiMarcarNotificacionLeida,
  clearToken,
  Notificacion,
} from "@/lib/api";
import { Step } from "@/components/StepIndicator";

interface NavbarProps {
  email: string | null;
  rol?: "candidato" | "empresa" | "admin" | null;
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

const NAV_ITEMS_CANDIDATO: NavItem[] = [
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
  rol = "candidato",
  currentStep,
  hasResultado,
  onNavigate,
  onLogout,
}: NavbarProps) {
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [mostrarMenuNotif, setMostrarMenuNotif] = useState(false);
  const [cargandoNotif, setCargandoNotif] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const esEmpresa = rol === "empresa";

  const cargarNotificaciones = useCallback(async () => {
    if (!email || esEmpresa) return;
    try {
      setCargandoNotif(true);
      const res = await apiGetNotificaciones();
      setTotalNoLeidas(res.total_no_leidas);
      setNotificaciones(res.notificaciones);
    } catch {
      /* Silenciar error en polling de notificaciones */
    } finally {
      setCargandoNotif(false);
    }
  }, [email, esEmpresa]);

  /* Refresca al cargar y cada 60 segundos (no más seguido) */
  useEffect(() => {
    cargarNotificaciones();
    if (esEmpresa) return;

    const interval = setInterval(() => {
      cargarNotificaciones();
    }, 60000);

    return () => clearInterval(interval);
  }, [cargarNotificaciones, esEmpresa]);

  /* Cerrar dropdown al hacer clic afuera */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMostrarMenuNotif(false);
      }
    }
    if (mostrarMenuNotif) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mostrarMenuNotif]);

  async function handleMarcarLeida(id: number) {
    try {
      await apiMarcarNotificacionLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
      setTotalNoLeidas((prev) => Math.max(0, prev - 1));
    } catch {
      /* Error al marcar leída */
    }
  }

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
          onClick={() => (email && !esEmpresa ? handleNav(2, false) : undefined)}
          className={`flex items-center gap-2.5 ${email && !esEmpresa ? "cursor-pointer" : ""}`}
          title={email && !esEmpresa ? "Ir a la entrevista" : "LIKAI"}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark shadow-glow-sm">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-text-primary">
              LIKAI
            </span>
            <span className="hidden text-[10px] text-text-muted sm:inline leading-none">
              {esEmpresa ? "Portal para Empresas" : "Plataforma de Empleo con IA"}
            </span>
          </div>
        </div>

        {/* Enlaces de navegación */}
        {email && (
          <nav
            aria-label="Navegación principal"
            className="order-3 flex w-full items-center gap-1.5 overflow-x-auto pb-1 pt-1 md:order-2 md:w-auto md:py-0"
          >
            {esEmpresa ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-accent/20 text-accent-light border border-accent/40 shadow-glow-sm">
                <span aria-hidden="true">🏢</span>
                <span>Panel de empresa</span>
              </span>
            ) : (
              NAV_ITEMS_CANDIDATO.map((item) => {
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
              })
            )}
          </nav>
        )}

        {/* Acciones del usuario: Campanita (candidato) y Salir */}
        {email && (
          <div className="order-2 flex items-center gap-2 md:order-3 sm:gap-3">
            {/* Campanita de notificaciones (solo candidato) */}
            {!esEmpresa && (
              <div className="relative" ref={menuRef}>
                <button
                  id="btn-campanita-notificaciones"
                  type="button"
                  onClick={() => setMostrarMenuNotif((v) => !v)}
                  aria-expanded={mostrarMenuNotif}
                  aria-label={`Notificaciones ${totalNoLeidas > 0 ? `(${totalNoLeidas} no leídas)` : ""}`}
                  className="btn-ghost relative p-2 text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
                  title="Ver notificaciones"
                >
                  <span className="text-base" aria-hidden="true">🔔</span>
                  {totalNoLeidas > 0 && (
                    <span
                      id="badge-notificaciones-no-leidas"
                      className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-error px-1 text-[10px] font-bold text-white shadow-sm"
                    >
                      {totalNoLeidas > 9 ? "9+" : totalNoLeidas}
                    </span>
                  )}
                </button>

                {/* Popover de notificaciones */}
                {mostrarMenuNotif && (
                  <div
                    id="menu-desplegable-notificaciones"
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card z-50 animate-slide-up"
                  >
                    <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">Notificaciones</span>
                        {totalNoLeidas > 0 && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent-light">
                            {totalNoLeidas} nuevas
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={cargarNotificaciones}
                        disabled={cargandoNotif}
                        className="btn-ghost text-[11px] py-1 px-2 text-text-muted hover:text-text-primary"
                        title="Actualizar notificaciones"
                      >
                        {cargandoNotif ? "…" : "↺"}
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                      {notificaciones.length === 0 ? (
                        <div className="py-8 text-center text-xs text-text-muted">
                          No tienes notificaciones por el momento.
                        </div>
                      ) : (
                        notificaciones.map((n) => (
                          <div
                            key={n.id}
                            className={`rounded-xl border p-3 text-xs transition-colors ${
                              n.leida
                                ? "border-surface-border/50 bg-surface/40 text-text-muted"
                                : "border-accent/40 bg-accent/10 text-text-primary shadow-sm"
                            }`}
                          >
                            <p className="leading-snug">{n.mensaje}</p>
                            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-text-muted">
                                {n.creado_en ? new Date(n.creado_en).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : ""}
                              </span>
                              {!n.leida && (
                                <button
                                  type="button"
                                  onClick={() => handleMarcarLeida(n.id)}
                                  className="text-accent-light hover:underline font-medium text-[11px]"
                                >
                                  Marcar como leída
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email de sesión */}
            <div className="hidden items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-3 py-1.5 sm:flex">
              <div className="h-2 w-2 rounded-full bg-status-success animate-pulse-slow" />
              <span className="max-w-[160px] truncate text-xs text-text-secondary">
                {email}
              </span>
            </div>

            {/* Cerrar sesión */}
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
