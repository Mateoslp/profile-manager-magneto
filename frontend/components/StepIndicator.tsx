"use client";

export type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1 as Step, label: "Acceso",    icon: "🔑" },
  { id: 2 as Step, label: "Pegar CV",  icon: "📄" },
  { id: 3 as Step, label: "Resultados",icon: "✨" },
  { id: 4 as Step, label: "Tablero",   icon: "📋" },
];

interface StepIndicatorProps {
  current: Step;
}

export default function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Progreso del proceso"
      className="mx-auto w-full max-w-2xl px-4 py-4"
    >
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const done   = step.id < current;
          const active = step.id === current;

          return (
            <li key={step.id} className="flex flex-1 items-center">
              {/* Círculo del paso */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                    done
                      ? "bg-accent text-white shadow-glow-sm"
                      : active
                      ? "border-2 border-accent bg-accent/20 text-accent-light shadow-glow"
                      : "border-2 border-surface-border bg-surface-elevated text-text-muted",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
                <span
                  className={[
                    "hidden text-xs font-medium sm:block transition-colors duration-300",
                    active ? "text-accent-light" : done ? "text-text-secondary" : "text-text-muted",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {/* Línea conectora */}
              {idx < STEPS.length - 1 && (
                <div
                  className={[
                    "mx-1 mt-[-18px] h-0.5 flex-1 rounded-full transition-all duration-500 sm:mx-2",
                    done ? "bg-accent" : "bg-surface-border",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
