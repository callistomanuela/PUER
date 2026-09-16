// Anno dell'accoglienza: usato per calcolare l'eta' e nel titolo della stampa.
// Per la prossima edizione basta cambiare questo numero (o il titolo sotto).
export const ANNO_ACCOGLIENZA = 2026;
export const TITOLO_STAMPA = `ACCOGLIENZE ESTATE ${ANNO_ACCOGLIENZA} - UCRAINA`;

// Mesi proposti per il periodo di soggiorno (multi-selezione).
export const MESI_PERIODO = ["Maggio", "Giugno", "Luglio", "Agosto", "Settembre"];

// Suggerimenti rapidi per la provenienza (resta comunque testo libero).
export const PROVENIENZE = ["famiglia", "istituto"];

/** yyyy-mm-dd  ->  dd/mm/yyyy  (per visualizzazione e stampa). */
export function formatDateIT(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Eta' compiuta al 31 agosto dell'anno di accoglienza (fine del soggiorno estivo).
 * E' solo un valore di default: nell'app resta sempre modificabile a mano.
 */
export function calcolaAnni(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const nascita = new Date(iso);
  if (isNaN(nascita.getTime())) return null;
  const riferimento = new Date(ANNO_ACCOGLIENZA, 7, 31); // 31 agosto (mese 0-based = 7)
  let anni = riferimento.getFullYear() - nascita.getFullYear();
  const m = riferimento.getMonth() - nascita.getMonth();
  if (m < 0 || (m === 0 && riferimento.getDate() < nascita.getDate())) anni--;
  return anni >= 0 ? anni : null;
}

/** "Cognome Nome + (data)" compatto per adulti / minori. */
export function nomeCompleto(cognome?: string | null, nome?: string | null): string {
  return [cognome, nome].filter(Boolean).join(" ").trim();
}
