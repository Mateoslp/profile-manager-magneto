"use client";

import { useEffect, useState } from "react";
import { clearToken, getRol, getToken, ResultadoProcesar } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StepIndicator, { Step } from "@/components/StepIndicator";
import LoginPage from "@/components/LoginPage";
import CvPage from "@/components/CvPage";
import ResultadosPage from "@/components/ResultadosPage";
import KanbanPage from "@/components/KanbanPage";
import EmpresaPage from "@/components/EmpresaPage";

export default function HomePage() {
  const [step,      setStep]      = useState<Step>(1);
  const [email,     setEmail]     = useState<string | null>(null);
  const [rol,       setRolState]  = useState<"candidato" | "empresa" | "admin" | null>(null);
  const [resultado, setResultado] = useState<ResultadoProcesar | null>(null);

  /* Restaurar sesión de sessionStorage al montar */
  useEffect(() => {
    const token = getToken();
    const user  = sessionStorage.getItem("likai_user");
    const r     = getRol();
    if (token && user) {
      setEmail(user);
      setRolState(r);
      setStep(2);
    }
  }, []);

  /* Escuchar el evento 401 global emitido por api.ts */
  useEffect(() => {
    function handleUnauthorized() {
      clearToken();
      setEmail(null);
      setRolState(null);
      setStep(1);
    }
    window.addEventListener("likai:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("likai:unauthorized", handleUnauthorized);
  }, []);

  function handleLoginSuccess(userEmail: string) {
    setEmail(userEmail);
    const r = getRol() ?? "candidato";
    setRolState(r);
    setStep(2);
  }

  function handleLogout() {
    setEmail(null);
    setRolState(null);
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

  const esEmpresa = rol === "empresa";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra de navegación superior fija (sticky) */}
      <Navbar
        email={email}
        rol={rol}
        currentStep={step}
        hasResultado={Boolean(resultado)}
        onNavigate={setStep}
        onLogout={handleLogout}
      />

      {/* Indicador de progreso (visible solo para candidatos con sesión) */}
      {email && !esEmpresa && (
        <div className="border-b border-surface-border bg-surface-card/60 backdrop-blur-sm">
          <StepIndicator current={step} />
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 w-full max-w-6xl mx-auto">
        {step === 1 && (
          <div key="step-1" className="w-full animate-fade-in motion-reduce:animate-none">
            <LoginPage onSuccess={handleLoginSuccess} />
          </div>
        )}

        {step > 1 && email && esEmpresa && (
          <div key="step-empresa" className="w-full animate-fade-in motion-reduce:animate-none">
            <EmpresaPage />
          </div>
        )}

        {step === 2 && email && !esEmpresa && (
          <div key="step-2" className="w-full animate-fade-in motion-reduce:animate-none">
            <CvPage onResult={handleResult} />
          </div>
        )}

        {step === 3 && resultado && !esEmpresa && (
          <div key="step-3" className="w-full animate-fade-in motion-reduce:animate-none">
            <ResultadosPage
              resultado={resultado}
              onOtroCv={handleOtroCv}
              onVerTablero={handleVerTablero}
            />
          </div>
        )}

        {step === 4 && !esEmpresa && (
          <div key="step-4" className="w-full animate-fade-in motion-reduce:animate-none">
            <KanbanPage onVolverResultados={handleVolverResultados} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-4 text-center text-xs text-text-muted">
        LIKAI — Plataforma inteligente de empleo con IA · Lexi · Inari · Kenti · Iris
      </footer>
    </div>
  );
}
