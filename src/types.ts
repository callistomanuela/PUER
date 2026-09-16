export interface Minore {
  id: string;
  famiglia_id: string;
  cognome: string;
  nome: string;
  nascita: string | null; // ISO yyyy-mm-dd
  anni: number | null;
  provenienza: string | null;
  periodo: string[]; // es. ["Giugno","Luglio","Agosto"]
}

export interface Famiglia {
  id: string;
  user_id?: string;
  adulto1_cognome: string;
  adulto1_nome: string;
  adulto1_nascita: string | null;
  adulto2_cognome: string | null;
  adulto2_nome: string | null;
  adulto2_nascita: string | null;
  citta: string | null;
  prov: string | null;
  indirizzo: string | null;
  telefono: string | null;
  email: string[];
  note: string | null;
  minori: Minore[];
}

/** Riga "appiattita" per la griglia: un abbinamento famiglia-minore. */
export interface Riga {
  key: string;
  famiglia: Famiglia;
  minore: Minore | null; // null se la famiglia non ha ancora minori
  indexMinore: number; // 0-based posizione del minore nella famiglia
  totMinori: number;
}
