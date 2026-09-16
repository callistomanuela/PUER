import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { caricaFamiglie, cancellaFamiglia, caricaTitolo, salvaTitolo } from "./lib/db";
import { TITOLO_STAMPA_DEFAULT } from "./lib/utils";
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

  // Titolo di stampa (modificabile e salvato sul database)
  const [titolo, setTitolo] = useState<string>(TITOLO_STAMPA_DEFAULT);
  const [modificaTitolo, setModificaTitolo] = useState(false);
  const [bozzaTitolo, setBozzaTitolo] = useState("");
  const [salvaTitoloBusy, setSalvaTitoloBusy] = useState(false);

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
      const [fams, tit] = await Promise.all([caricaFamiglie(), caricaTitolo()]);
      setFamiglie(fams);
      if (tit) setTitolo(tit);
    } catch (e: any) {
      setErrore(e?.message ?? "Errore nel caricamento dei dati.");
    } finally {
      setCaricamento(false);
    }
  }, []);

  async function confermaTitolo() {
    if (!session) return;
    const nuovo = bozzaTitolo.trim();
    if (!nuovo) return;
    setSalvaTitoloBusy(true);
    setErrore(null);
    try {
      await salvaTitolo(session.user.id, nuovo);
      setTitolo(nuovo);
      setModificaTitolo(false);
    } catch (e: any) {
      setErrore(e?.message ?? "Errore nel salvataggio del titolo.");
    } finally {
      setSalvaTitoloBusy(false);
    }
  }

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
        <div>
          <h1 className="app-title" style={{ marginBottom: 2 }}>
            Indirizzario Accoglienze{" "}
            <span style={{ fontWeight: 400, color: "var(--muted)" }}>· Progetto Puer</span>
          </h1>
          {modificaTitolo ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={bozzaTitolo}
                onChange={(e) => setBozzaTitolo(e.target.value)}
                style={{ width: "min(360px, 70vw)" }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") confermaTitolo();
                  if (e.key === "Escape") setModificaTitolo(false);
                }}
              />
              <button
                className="btn-primary btn-sm"
                onClick={confermaTitolo}
                disabled={salvaTitoloBusy || !bozzaTitolo.trim()}
              >
                {salvaTitoloBusy ? "…" : "Salva"}
              </button>
              <button className="btn-sm" onClick={() => setModificaTitolo(false)} disabled={salvaTitoloBusy}>
                Annulla
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                Titolo stampa: <b style={{ color: "var(--text)" }}>{titolo}</b>
              </span>
              <button
                className="btn-ghost btn-sm"
                title="Modifica titolo di stampa"
                onClick={() => {
                  setBozzaTitolo(titolo);
                  setModificaTitolo(true);
                }}
              >
                ✏️
              </button>
            </div>
          )}
        </div>
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
          titolo={titolo}
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
