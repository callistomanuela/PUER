import { useMemo, useState } from "react";
import type { Famiglia, Riga } from "../types";
import { formatDateIT, calcolaAnni, nomeCompleto } from "../lib/utils";
import { generaPdf } from "../pdf/generaPdf";

interface Props {
  famiglie: Famiglia[];
  titolo: string;
  onNew: () => void;
  onEdit: (f: Famiglia) => void;
  onDelete: (f: Famiglia) => void;
}

function costruisciRighe(famiglie: Famiglia[]): Riga[] {
  const righe: Riga[] = [];
  for (const f of famiglie) {
    if (f.minori.length === 0) {
      righe.push({ key: f.id + ":none", famiglia: f, minore: null, indexMinore: 0, totMinori: 0 });
    } else {
      f.minori.forEach((m, i) =>
        righe.push({
          key: f.id + ":" + m.id,
          famiglia: f,
          minore: m,
          indexMinore: i,
          totMinori: f.minori.length,
        })
      );
    }
  }
  return righe;
}

export default function Grid({ famiglie, titolo, onNew, onEdit, onDelete }: Props) {
  const [selezione, setSelezione] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const famiglieFiltrate = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return famiglie;
    return famiglie.filter((f) => {
      const blob = [
        f.adulto1_cognome, f.adulto1_nome, f.adulto2_cognome, f.adulto2_nome,
        f.citta, f.prov, f.indirizzo, f.telefono,
        ...(f.email ?? []),
        ...f.minori.flatMap((m) => [m.cognome, m.nome, m.provenienza]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(t);
    });
  }, [famiglie, q]);

  const righe = useMemo(() => costruisciRighe(famiglieFiltrate), [famiglieFiltrate]);

  const tutteSelezionate = righe.length > 0 && righe.every((r) => selezione.has(r.key));

  function toggle(key: string) {
    setSelezione((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }
  function toggleTutte() {
    setSelezione(() => (tutteSelezionate ? new Set() : new Set(righe.map((r) => r.key))));
  }

  function stampa() {
    const scelte = righe.filter((r) => selezione.has(r.key));
    if (scelte.length === 0) {
      alert("Seleziona almeno una riga da stampare.");
      return;
    }
    generaPdf(scelte, titolo);
  }

  const nSelezionate = righe.filter((r) => selezione.has(r.key)).length;

  return (
    <>
      <div className="toolbar">
        <button className="btn-primary" onClick={onNew}>+ Nuova famiglia</button>
        <button onClick={stampa} disabled={nSelezionate === 0}>
          Genera PDF ({nSelezionate})
        </button>
        <input
          className="search"
          placeholder="Cerca famiglia, città, minore…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="spacer" />
        <span className="count-badge">
          {famiglieFiltrate.length} famiglie · {righe.length} abbinamenti
        </span>
      </div>

      <div className="container">
        {righe.length === 0 ? (
          <div className="table-wrap">
            <div className="empty">
              {famiglie.length === 0
                ? "Nessuna famiglia inserita. Premi «+ Nuova famiglia» per iniziare."
                : "Nessun risultato per la ricerca."}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="chk">
                    <input type="checkbox" checked={tutteSelezionate} onChange={toggleTutte} aria-label="Seleziona tutto" />
                  </th>
                  <th>N.</th>
                  <th>Adulto 1</th>
                  <th>Adulto 2</th>
                  <th>Città</th>
                  <th>Prov</th>
                  <th>Via</th>
                  <th>Recapito telefonico</th>
                  <th>N. min.</th>
                  <th>Minore</th>
                  <th>Nascita</th>
                  <th>Anni</th>
                  <th>Provenienza</th>
                  <th>Periodo</th>
                  <th className="actions-col">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r, idx) => {
                  const f = r.famiglia;
                  const primaDellaFamiglia = r.indexMinore === 0;
                  const span = Math.max(r.totMinori, 1);
                  // progressivo famiglia (basato sull'ordine delle famiglie filtrate)
                  const numFamiglia = famiglieFiltrate.findIndex((x) => x.id === f.id) + 1;
                  const anni = r.minore ? r.minore.anni ?? calcolaAnni(r.minore.nascita) : null;

                  return (
                    <tr
                      key={r.key}
                      className={
                        (selezione.has(r.key) ? "selected " : "") +
                        (primaDellaFamiglia && idx !== 0 ? "fam-start" : "")
                      }
                    >
                      <td className="chk">
                        <input
                          type="checkbox"
                          checked={selezione.has(r.key)}
                          onChange={() => toggle(r.key)}
                          aria-label="Seleziona riga"
                        />
                      </td>

                      {primaDellaFamiglia && (
                        <>
                          <td className="cell-num" rowSpan={span}>{numFamiglia}</td>
                          <td className="cell-fam" rowSpan={span}>
                            <div>{nomeCompleto(f.adulto1_cognome, f.adulto1_nome)}</div>
                            {f.adulto1_nascita && <div className="pill mono">{formatDateIT(f.adulto1_nascita)}</div>}
                          </td>
                          <td className="cell-fam" rowSpan={span}>
                            {nomeCompleto(f.adulto2_cognome, f.adulto2_nome) && (
                              <>
                                <div>{nomeCompleto(f.adulto2_cognome, f.adulto2_nome)}</div>
                                {f.adulto2_nascita && <div className="pill mono">{formatDateIT(f.adulto2_nascita)}</div>}
                              </>
                            )}
                          </td>
                          <td rowSpan={span}>{f.citta}</td>
                          <td className="cell-num" rowSpan={span}>{f.prov}</td>
                          <td rowSpan={span}>{f.indirizzo}</td>
                          <td className="nowrap mono" rowSpan={span}>{f.telefono}</td>
                          <td className="cell-num" rowSpan={span}>{r.totMinori}</td>
                        </>
                      )}

                      <td>{r.minore ? nomeCompleto(r.minore.cognome, r.minore.nome) : <em style={{ color: "#98a2b3" }}>—</em>}</td>
                      <td className="nowrap mono">{r.minore ? formatDateIT(r.minore.nascita) : ""}</td>
                      <td className="cell-num">{anni ?? ""}</td>
                      <td>{r.minore?.provenienza}</td>
                      <td>{r.minore ? (r.minore.periodo ?? []).join(" / ") : ""}</td>

                      {primaDellaFamiglia && (
                        <td rowSpan={span} className="actions-col">
                          <button className="btn-ghost btn-sm" onClick={() => onEdit(f)} title="Modifica">✏️</button>
                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => {
                              if (confirm(`Eliminare la famiglia ${nomeCompleto(f.adulto1_cognome, f.adulto1_nome)}?`))
                                onDelete(f);
                            }}
                            title="Elimina"
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
