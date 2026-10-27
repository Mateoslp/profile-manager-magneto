"use client";

import { useState } from "react";
import { apiLogin, apiRegistro, setToken } from "@/lib/api";

interface LoginPageProps {
  onSuccess: (email: string) => void;
}

type Tab = "login" | "registro";

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validatePassword(p: string) {
  return p.length >= 8;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [tab, setTab] = useState<Tab>("login");

  /* Campos */
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  /* Estado UI */
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* Errores de campo */
  const emailError  = email    && !validateEmail(email)   ? "Correo no válido" : null;
  const passError   = password && !validatePassword(password) ? "Mínimo 8 caracteres" : null;
  const confirmErr  = tab === "registro" && confirm && confirm !== password ? "Las contraseñas no coinciden" : null;

  const canSubmit =
    !loading &&
    validateEmail(email) &&
    validatePassword(password) &&
    (tab === "login" || (confirm === password));

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setSuccess(null);
    setEmail("");
    setPassword("");
    setConfirm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (tab === "login") {
        const { access_token } = await apiLogin(email, password);
        setToken(access_token);
        sessionStorage.setItem("likai_user", email);
        onSuccess(email);
      } else {
        await apiRegistro(email, password);
        setSuccess("¡Cuenta creada! Ahora inicia sesión.");
        setTab("login");
        setPassword("");
        setConfirm("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-slide-up w-full max-w-md mx-auto">
      {/* Tarjeta */}
      <div className="card p-8">
        {/* Título */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            {tab === "login" ? "Bienvenido a LIKAI" : "Crear cuenta"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {tab === "login"
              ? "Inicia sesión para continuar"
              : "Completa el formulario para registrarte"}
          </p>
        </div>

        {/* Tabs */}
        <div className="tab-list mb-6">
          <button
            id="tab-login"
            type="button"
            className={`tab-btn ${tab === "login" ? "active" : ""}`}
            onClick={() => switchTab("login")}
          >
            Iniciar sesión
          </button>
          <button
            id="tab-registro"
            type="button"
            className={`tab-btn ${tab === "registro" ? "active" : ""}`}
            onClick={() => switchTab("registro")}
          >
            Crear cuenta
          </button>
        </div>

        {/* Alertas */}
        {error && (
          <div id="auth-error" className="alert-error mb-4">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div id="auth-success" className="alert-success mb-4">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Formulario */}
        <form id="auth-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label htmlFor="auth-email" className="label">Correo electrónico</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailError && (
              <p className="mt-1 text-xs text-status-error">{emailError}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="auth-password" className="label">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              className="input"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passError && (
              <p className="mt-1 text-xs text-status-error">{passError}</p>
            )}
          </div>

          {/* Confirmar contraseña (solo registro) */}
          {tab === "registro" && (
            <div>
              <label htmlFor="auth-confirm" className="label">Confirmar contraseña</label>
              <input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                className="input"
                placeholder="Repite tu contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {confirmErr && (
                <p className="mt-1 text-xs text-status-error">{confirmErr}</p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            id="auth-submit"
            type="submit"
            className="btn-primary mt-2 w-full py-3"
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                {tab === "login" ? "Ingresando..." : "Creando cuenta..."}
              </>
            ) : tab === "login" ? (
              "Iniciar sesión"
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        {/* Nota de política */}
        <p className="mt-5 text-center text-xs text-text-muted">
          {tab === "login"
            ? "¿No tienes cuenta? Usa la pestaña 'Crear cuenta'."
            : "Al registrarte aceptas el uso de tus datos para el análisis de CV."}
        </p>
      </div>

      {/* Datos de acceso de demo (orientación visual) */}
      <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-center text-xs text-text-secondary">
        💡 Si es tu primera vez, crea una cuenta con cualquier correo y contraseña.
      </div>
    </div>
  );
}
