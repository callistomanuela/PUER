import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { caricaFamiglie, cancellaFamiglia } from "./lib/db";
import type { Famiglia } from "./types";
import Login from "./components/Login";
import Grid from "./components/Grid";
import FamigliaForm from "./components/FamigliaForm";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [famiglie, setFamiglie] = useState<Famiglia[]>([]);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const [formAperto, setFormAperto] = useState(false);
  const [inModifica, setInModifica] = useState<Famiglia | null>(null);

  // Sessione di autenticazione
  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const ricarica = useCallback(async () => {
    setCaricamento(true);
    setErrore(null);
    try {
      setFamiglie(await caricaFamiglie());
    } catch (e: any) {
      setErrore(e?.message ?? "Errore nel caricamento dei dati.");
    } finally {
      setCaricamento(false);
    }
  }, []);

  useEffect(() => {
    if (session) ricarica();
  }, [session, ricarica]);

  async function elimina(f: Famiglia) {
    try {
      await cancellaFamiglia(f.id);
      await ricarica();
    } catch (e: any) {
      setErrore(e?.message ?? "Errore durante l'eliminazione.");
    }
  }

  if (!authReady) return <div className="loading">Caricamento…</div>;
  if (!session) return <Login />;

  return (
    <div style={{ minHeight: "100%" }}>
      <header className="app-header">
        <h1 className="app-title">
          Indirizzario Accoglienze
          <small>Accoglienze Estate 2026 — Ucraina · Progetto Puer</small>
        </h1>
        <div className="spacer" />
        <span className="count-badge" style={{ marginRight: 8 }}>{session.user.email}</span>
        <button className="btn-sm" onClick={() => supabase.auth.signOut()}>Esci</button>
      </header>

      {errore && <div className="error-box">{errore}</div>}

      {caricamento ? (
        <div className="loading" style={{ height: 240 }}>Caricamento dati…</div>
      ) : (
        <Grid
          famiglie={famiglie}
          onNew={() => {
            setInModifica(null);
            setFormAperto(true);
          }}
          onEdit={(f) => {
            setInModifica(f);
            setFormAperto(true);
          }}
          onDelete={elimina}
        />
      )}

      {formAperto && (
        <FamigliaForm
          famiglia={inModifica}
          onClose={() => setFormAperto(false)}
          onSaved={async () => {
            setFormAperto(false);
            await ricarica();
          }}
        />
      )}
    </div>
  );
}
