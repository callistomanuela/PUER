import jsPDF from "jspdf";
import autoTable, { type RowInput, type CellInput, type CellDef } from "jspdf-autotable";
import type { Riga, Famiglia, Minore } from "../types";
import {
  TITOLO_STAMPA_DEFAULT,
  SOTTOTITOLO_STAMPA,
  formatDateIT,
  calcolaAnni,
  nomeCompleto,
} from "../lib/utils";

interface Gruppo {
  famiglia: Famiglia;
  minori: Minore[]; // solo i minori effettivamente selezionati
}

function adultoCell(cognome?: string | null, nome?: string | null, nascita?: string | null): string {
  const nomeStr = nomeCompleto(cognome, nome);
  if (!nomeStr) return "";
  const d = formatDateIT(nascita);
  return d ? `${nomeStr}\n${d}` : nomeStr;
}

/** Raggruppa le righe selezionate per famiglia, mantenendo l'ordine alfabetico. */
function raggruppa(righe: Riga[]): Gruppo[] {
  const map = new Map<string, Gruppo>();
  for (const r of righe) {
    let g = map.get(r.famiglia.id);
    if (!g) {
      g = { famiglia: r.famiglia, minori: [] };
      map.set(r.famiglia.id, g);
    }
    if (r.minore) g.minori.push(r.minore);
  }
  return Array.from(map.values());
}

export function generaPdf(righeSelezionate: Riga[], titolo?: string): void {
  const gruppi = raggruppa(righeSelezionate);
  const titoloStampa = (titolo ?? "").trim() || TITOLO_STAMPA_DEFAULT;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ---- Intestazione ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(titoloStampa, pageW / 2, 13, { align: "center" });
  doc.setFontSize(11);
  doc.text(SOTTOTITOLO_STAMPA, pageW / 2, 19, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generato il ${formatDateIT(new Date().toISOString().slice(0, 10))}`, pageW - 14, 13, {
    align: "right",
  });
  doc.setTextColor(0);

  // ---- Corpo tabella con rowSpan per le famiglie con piu' minori ----
  const body: RowInput[] = [];
  let progressivo = 0;

  for (const g of gruppi) {
    progressivo++;
    const f = g.famiglia;
    const nMin = Math.max(g.minori.length, 1);

    const famCells = (contenuto: string, opts: Partial<CellDef> = {}): CellDef => ({
      content: contenuto,
      rowSpan: nMin,
      ...opts,
    });

    const minoreCells = (m: Minore | undefined): CellInput[] => {
      if (!m) return ["", "", "", "", ""];
      const anni = m.anni ?? calcolaAnni(m.nascita);
      return [
        nomeCompleto(m.cognome, m.nome),
        formatDateIT(m.nascita),
        anni != null ? String(anni) : "",
        m.provenienza ?? "",
        (m.periodo ?? []).join(" / "),
      ];
    };

    // Prima riga del gruppo: colonne famiglia (con rowSpan) + primo minore
    const primoMinore = g.minori[0];
    const firstRow: CellInput[] = [
      famCells(String(progressivo), { styles: { halign: "center" } }),
      famCells(adultoCell(f.adulto1_cognome, f.adulto1_nome, f.adulto1_nascita)),
      famCells(adultoCell(f.adulto2_cognome, f.adulto2_nome, f.adulto2_nascita)),
      famCells(f.citta ?? ""),
      famCells(f.prov ?? "", { styles: { halign: "center" } }),
      famCells(f.indirizzo ?? ""),
      famCells(f.telefono ?? ""),
      famCells(String(g.minori.length), { styles: { halign: "center" } }),
      ...minoreCells(primoMinore),
    ];
    body.push(firstRow);

    // Righe successive: solo colonne del minore
    for (let i = 1; i < g.minori.length; i++) {
      body.push(minoreCells(g.minori[i]) as RowInput);
    }
  }

  autoTable(doc, {
    startY: 24,
    head: [
      [
        "N.",
        "Adulto 1",
        "Adulto 2",
        "Città",
        "Prov",
        "Via",
        "Recapito telefonico",
        "N.\nmin.",
        "Minore",
        "Nascita",
        "Anni",
        "Provenienza",
        "Periodo",
      ],
    ],
    body,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      valign: "middle",
      lineColor: [200, 205, 212],
      lineWidth: 0.1,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [31, 111, 235],
      textColor: 255,
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" }, // N.
      1: { cellWidth: 28 }, // Adulto 1
      2: { cellWidth: 28 }, // Adulto 2
      3: { cellWidth: 24 }, // Città
      4: { cellWidth: 10, halign: "center" }, // Prov
      5: { cellWidth: 30 }, // Via
      6: { cellWidth: 26 }, // Telefono
      7: { cellWidth: 9, halign: "center" }, // N. min
      8: { cellWidth: 30 }, // Minore
      9: { cellWidth: 18, halign: "center" }, // Nascita
      10: { cellWidth: 9, halign: "center" }, // Anni
      11: { cellWidth: 18 }, // Provenienza
      12: { cellWidth: "auto" }, // Periodo
    },
    didParseCell: (data) => {
      // Riga alternata piu' leggibile
      if (data.section === "body" && data.row.index % 2 === 1) {
        data.cell.styles.fillColor = [250, 251, 252];
      }
    },
  });

  const oggi = new Date().toISOString().slice(0, 10);
  doc.save(`indirizzario-accoglienze-${oggi}.pdf`);
}
