"use client";

import { useEffect, useState } from "react";
import { clearToken, getToken, ResultadoProcesar } from "@/lib/api";
import Header from "@/components/Header";
import StepIndicator, { Step } from "@/components/StepIndicator";
import LoginPage from "@/components/LoginPage";
import CvPage from "@/components/CvPage";
import ResultadosPage from "@/components/ResultadosPage";
import KanbanPage from "@/components/KanbanPage";

export default function HomePage() {
  const [step,      setStep]      = useState<Step>(1);
  const [email,     setEmail]     = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoProcesar | null>(null);

  /* Restaurar sesión de sessionStorage al montar */
  useEffect(() => {
    const token = getToken();
    const user  = sessionStorage.getItem("likai_user");
    if (token && user) {
      setEmail(user);
      setStep(2);
    }
  }, []);

  /* Escuchar el evento 401 global emitido por api.ts */
  useEffect(() => {
    function handleUnauthorized() {
      clearToken();
      setEmail(null);
      setStep(1);
    }
    window.addEventListener("likai:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("likai:unauthorized", handleUnauthorized);
  }, []);

  function handleLoginSuccess(userEmail: string) {
    setEmail(userEmail);
    setStep(2);
  }

  function handleLogout() {
    setEmail(null);
    setResultado(null);
    setStep(1);
  }

  function handleResult(r: ResultadoProcesar) {
    setResultado(r);
    setStep(3);
  }

  function handleOtroCv() {
    setResultado(null);
    setStep(2);
  }

  function handleVerTablero() {
    setStep(4);
  }

  function handleVolverResultados() {
    if (resultado) setStep(3);
    else setStep(2);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header siempre visible */}
      <Header email={email} onLogout={handleLogout} />

      {/* Indicador de progreso (visible solo cuando hay sesión) */}
      {email && (
        <div className="border-b border-surface-border bg-surface-card/60 backdrop-blur-sm">
          <StepIndicator current={step} />
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
        {step === 1 && (
          <LoginPage onSuccess={handleLoginSuccess} />
        )}

        {step === 2 && email && (
          <CvPage onResult={handleResult} />
        )}

        {step === 3 && resultado && (
          <ResultadosPage
            resultado={resultado}
            onOtroCv={handleOtroCv}
            onVerTablero={handleVerTablero}
          />
        )}

        {step === 4 && (
          <KanbanPage onVolverResultados={handleVolverResultados} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-4 text-center text-xs text-text-muted">
        LIKAI — Plataforma educativa de simulación de empleo con IA · Lexi · Inari · Kenti · Iris
      </footer>
    </div>
  );
}
