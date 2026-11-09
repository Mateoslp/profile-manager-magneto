"use client";

import { useEffect, useRef, useState } from "react";

interface BotonDictadoProps {
  onTextoReconocido: (texto: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export default function BotonDictado({
  onTextoReconocido,
  disabled = false,
  className = "",
  label = "Dictar",
}: BotonDictadoProps) {
  const [escuchando, setEscuchando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSoportado(false);
    }
  }, []);

  // Detener al presionar la tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && escuchando) {
        detenerDictado();
      }
    }
    if (escuchando) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [escuchando]);

  function detenerDictado() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* Silenciar error al detener */
      }
    }
    setEscuchando(false);
  }

  function toggleDictado() {
    if (escuchando) {
      detenerDictado();
      return;
    }

    setErrorMsg(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec: any =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setErrorMsg("Tu navegador no soporta dictado por voz. Puedes escribir directamente.");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "es-CO";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setEscuchando(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          onTextoReconocido(transcript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setErrorMsg("Permiso de micrófono denegado. Puedes escribir en el teclado.");
        } else if (event.error !== "no-speech") {
          setErrorMsg("No se detectó audio con claridad. Intenta de nuevo.");
        }
        setEscuchando(false);
      };

      recognition.onend = () => {
        setEscuchando(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setErrorMsg("No se pudo iniciar el micrófono. Puedes escribir directamente.");
      setEscuchando(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={toggleDictado}
        disabled={disabled || !soportado}
        aria-label={
          !soportado
            ? "Dictado por voz no disponible en este navegador"
            : escuchando
            ? "Detener dictado por voz (o presiona Escape)"
            : `${label} por voz (es-CO)`
        }
        aria-pressed={escuchando}
        title={
          !soportado
            ? "Dictado por voz no soportado en este navegador. Escribe manualmente."
            : escuchando
            ? "Escuchando en es-CO... Haz clic o presiona Escape para detener"
            : "Dictar por voz en español de Colombia (es-CO)"
        }
        className={[
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          !soportado
            ? "opacity-50 cursor-not-allowed bg-surface-elevated text-text-muted border border-surface-border"
            : escuchando
            ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400 animate-pulse motion-reduce:animate-none"
            : "border border-surface-border bg-surface-elevated text-text-secondary hover:text-accent-light hover:border-accent active:scale-95 motion-reduce:transition-none",
          className,
        ].join(" ")}
      >
        <span aria-hidden="true" className="text-xs">
          {escuchando ? "🔴" : "🎙️"}
        </span>
        <span>{escuchando ? "Escuchando..." : label}</span>
      </button>

      {errorMsg && (
        <span
          className="text-[10px] text-status-warning leading-tight mt-1 text-right max-w-xs animate-fade-in"
          role="alert"
        >
          {errorMsg}
        </span>
      )}
    </div>
  );
}

