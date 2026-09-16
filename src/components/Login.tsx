import { useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg(
          "Registrazione inviata. Se la conferma email è attiva su Supabase, controlla la posta; " +
            "altrimenti ora puoi accedere."
        );
        setMode("login");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Errore di autenticazione");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Indirizzario Accoglienze</h1>
        <p className="sub">Progetto Puer — accesso riservato</p>

        {!supabaseConfigured && (
          <div className="error-box" style={{ margin: "0 0 16px" }}>
            Configurazione Supabase mancante: crea il file <b>.env</b> con URL e chiave anon.
          </div>
        )}

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {err && <div className="error-box" style={{ margin: "0 0 14px" }}>{err}</div>}
          {msg && (
            <div
              className="error-box"
              style={{ margin: "0 0 14px", background: "#ecfdf3", borderColor: "#abefc6", color: "#067647" }}
            >
              {msg}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={busy || !supabaseConfigured}>
            {busy ? "Attendere…" : mode === "login" ? "Accedi" : "Registrati"}
          </button>
        </form>

        <button
          className="link-btn"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setErr(null);
            setMsg(null);
          }}
        >
          {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
        </button>
      </div>
    </div>
  );
}
