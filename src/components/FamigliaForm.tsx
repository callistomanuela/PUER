import { useMemo, useState } from "react";
import type { Famiglia, Minore } from "../types";
import { salvaFamiglia, type FamigliaInput, type MinoreInput } from "../lib/db";
import { MESI_PERIODO, PROVENIENZE, calcolaAnni } from "../lib/utils";

interface Props {
  famiglia: Famiglia | null; // null = nuova
  onClose: () => void;
  onSaved: () => void;
}

type MinoreDraft = MinoreInput & { _id: string };

function nuovoMinore(): MinoreDraft {
  return {
    _id: crypto.randomUUID(),
    cognome: "",
    nome: "",
    nascita: "",
    anni: null,
    provenienza: "famiglia",
    periodo: [],
  };
}

export default function FamigliaForm({ famiglia, onClose, onSaved }: Props) {
  const editing = Boolean(famiglia);

  const [fam, setFam] = useState<FamigliaInput>(() => ({
    adulto1_cognome: famiglia?.adulto1_cognome ?? "",
    adulto1_nome: famiglia?.adulto1_nome ?? "",
    adulto1_nascita: famiglia?.adulto1_nascita ?? "",
    adulto2_cognome: famiglia?.adulto2_cognome ?? "",
    adulto2_nome: famiglia?.adulto2_nome ?? "",
    adulto2_nascita: famiglia?.adulto2_nascita ?? "",
    citta: famiglia?.citta ?? "",
    prov: famiglia?.prov ?? "",
    indirizzo: famiglia?.indirizzo ?? "",
    telefono: famiglia?.telefono ?? "",
    email: famiglia?.email ?? [],
    note: famiglia?.note ?? "",
  }));

  const [emails, setEmails] = useState<string[]>(
    famiglia?.email?.length ? [...famiglia.email] : [""]
  );

  const [minori, setMinori] = useState<MinoreDraft[]>(() =>
    famiglia?.minori?.length
      ? famiglia.minori.map((m: Minore) => ({
          _id: crypto.randomUUID(),
          cognome: m.cognome,
          nome: m.nome,
          nascita: m.nascita ?? "",
          anni: m.anni,
          provenienza: m.provenienza ?? "famiglia",
          periodo: m.periodo ?? [],
        }))
      : [nuovoMinore()]
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valido = useMemo(
    () => fam.adulto1_cognome.trim() !== "" || fam.adulto1_nome.trim() !== "",
    [fam.adulto1_cognome, fam.adulto1_nome]
  );

  function setField<K extends keyof FamigliaInput>(k: K, v: FamigliaInput[K]) {
    setFam((f) => ({ ...f, [k]: v }));
  }

  function setMinore(id: string, patch: Partial<MinoreDraft>) {
    setMinori((arr) => arr.map((m) => (m._id === id ? { ...m, ...patch } : m)));
  }

  function toggleMese(id: string, mese: string) {
    setMinori((arr) =>
      arr.map((m) => {
        if (m._id !== id) return m;
        const has = m.periodo.includes(mese);
        return {
          ...m,
          periodo: has ? m.periodo.filter((x) => x !== mese) : [...m.periodo, mese],
        };
      })
    );
  }

  async function salva() {
    setErr(null);
    if (!valido) {
      setErr("Inserisci almeno cognome o nome dell'adulto 1.");
      return;
    }
    setBusy(true);
    try {
      const emailPulite = emails.map((e) => e.trim()).filter(Boolean);
      const famToSave: FamigliaInput = {
        ...fam,
        email: emailPulite,
        // stringhe vuote -> null per date opzionali
        adulto1_nascita: fam.adulto1_nascita || null,
        adulto2_nascita: fam.adulto2_nascita || null,
      };
      const minoriToSave: MinoreInput[] = minori.map((m) => ({
        cognome: m.cognome.trim(),
        nome: m.nome.trim(),
        nascita: m.nascita || null,
        anni: m.anni,
        provenienza: m.provenienza?.trim() || null,
        periodo: m.periodo,
      }));
      await salvaFamiglia(famiglia?.id ?? null, famToSave, minoriToSave);
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Errore durante il salvataggio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{editing ? "Modifica famiglia" : "Nuova famiglia"}</h2>
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div className="modal-body">
          {err && <div className="error-box" style={{ margin: "0 0 16px" }}>{err}</div>}

          {/* ---------- Adulto 1 ---------- */}
          <div className="section-title">Adulto 1 (referente)</div>
          <div className="grid2">
            <div className="field">
              <label>Cognome</label>
              <input value={fam.adulto1_cognome} onChange={(e) => setField("adulto1_cognome", e.target.value)} />
            </div>
            <div className="field">
              <label>Nome</label>
              <input value={fam.adulto1_nome} onChange={(e) => setField("adulto1_nome", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Data di nascita</label>
            <input type="date" value={fam.adulto1_nascita ?? ""} onChange={(e) => setField("adulto1_nascita", e.target.value)} />
          </div>

          {/* ---------- Adulto 2 ---------- */}
          <div className="section-title">Adulto 2 (opzionale)</div>
          <div className="grid2">
            <div className="field">
              <label>Cognome</label>
              <input value={fam.adulto2_cognome ?? ""} onChange={(e) => setField("adulto2_cognome", e.target.value)} />
            </div>
            <div className="field">
              <label>Nome</label>
              <input value={fam.adulto2_nome ?? ""} onChange={(e) => setField("adulto2_nome", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Data di nascita</label>
            <input type="date" value={fam.adulto2_nascita ?? ""} onChange={(e) => setField("adulto2_nascita", e.target.value)} />
          </div>

          {/* ---------- Residenza / contatti ---------- */}
          <div className="section-title">Residenza e contatti</div>
          <div className="grid3">
            <div className="field">
              <label>Città</label>
              <input value={fam.citta ?? ""} onChange={(e) => setField("citta", e.target.value)} />
            </div>
            <div className="field">
              <label>Prov</label>
              <input value={fam.prov ?? ""} maxLength={4} onChange={(e) => setField("prov", e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="field">
            <label>Via / indirizzo</label>
            <input value={fam.indirizzo ?? ""} onChange={(e) => setField("indirizzo", e.target.value)} />
          </div>
          <div className="field">
            <label>Recapito telefonico (più numeri separati da " / ")</label>
            <input value={fam.telefono ?? ""} onChange={(e) => setField("telefono", e.target.value)} placeholder="3271805684 / 360976980" />
          </div>

          <div className="field">
            <label>Email famiglia (una o più)</label>
            {emails.map((em, i) => (
              <div className="multi-line" key={i}>
                <input
                  type="email"
                  value={em}
                  onChange={(e) => setEmails((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="nome@esempio.it"
                />
                <button
                  className="btn-ghost"
                  onClick={() => setEmails((arr) => (arr.length > 1 ? arr.filter((_, j) => j !== i) : [""]))}
                  aria-label="Rimuovi email"
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="btn-sm" onClick={() => setEmails((arr) => [...arr, ""])}>+ Aggiungi email</button>
          </div>

          <div className="field">
            <label>Note (testo libero)</label>
            <textarea value={fam.note ?? ""} onChange={(e) => setField("note", e.target.value)} />
          </div>

          {/* ---------- Minori ---------- */}
          <div className="section-title">Minori ospitati</div>
          {minori.map((m, i) => (
            <div className="minore-card" key={m._id}>
              <div className="minore-card-head">
                <strong>Minore {i + 1}</strong>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => setMinori((arr) => (arr.length > 1 ? arr.filter((x) => x._id !== m._id) : arr))}
                  disabled={minori.length === 1}
                >
                  Rimuovi
                </button>
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Cognome</label>
                  <input value={m.cognome} onChange={(e) => setMinore(m._id, { cognome: e.target.value })} />
                </div>
                <div className="field">
                  <label>Nome</label>
                  <input value={m.nome} onChange={(e) => setMinore(m._id, { nome: e.target.value })} />
                </div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Data di nascita</label>
                  <input
                    type="date"
                    value={m.nascita ?? ""}
                    onChange={(e) => {
                      const nascita = e.target.value;
                      setMinore(m._id, { nascita, anni: calcolaAnni(nascita) });
                    }}
                  />
                </div>
                <div className="field">
                  <label>Anni (calcolato, modificabile)</label>
                  <input
                    type="number"
                    min={0}
                    value={m.anni ?? ""}
                    onChange={(e) => setMinore(m._id, { anni: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="field">
                <label>Provenienza</label>
                <input
                  list="provenienze-list"
                  value={m.provenienza ?? ""}
                  onChange={(e) => setMinore(m._id, { provenienza: e.target.value })}
                  placeholder="famiglia / istituto / …"
                />
              </div>

              <div className="field">
                <label>Periodo (seleziona i mesi)</label>
                <div className="chips">
                  {MESI_PERIODO.map((mese) => (
                    <span
                      key={mese}
                      className={"chip" + (m.periodo.includes(mese) ? " on" : "")}
                      onClick={() => toggleMese(m._id, mese)}
                    >
                      {mese}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button className="btn-sm" onClick={() => setMinori((arr) => [...arr, nuovoMinore()])}>
            + Aggiungi minore
          </button>

          <datalist id="provenienze-list">
            {PROVENIENZE.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className="modal-foot">
          <button onClick={onClose} disabled={busy}>Annulla</button>
          <button className="btn-primary" onClick={salva} disabled={busy || !valido}>
            {busy ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
