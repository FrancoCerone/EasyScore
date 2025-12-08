# Istruzioni per l'uso di EasyScore

## Installazione

1. Installa le dipendenze:
```bash
npm install
```

2. Avvia il server di sviluppo:
```bash
npm run dev
```

3. Apri il browser all'indirizzo mostrato (solitamente http://localhost:3000)

## Come usare l'applicazione

### 1. Caricamento Spartiti

- Clicca sul pulsante **"📁 Seleziona Cartella Spartiti"**
- Seleziona una cartella contenente immagini di spartiti (formati supportati: JPG, PNG, WEBP)
- Le immagini verranno caricate automaticamente e ordinate alfabeticamente

### 2. Gestione Scaletta

- **Riordinare spartiti**: Trascina gli spartiti usando l'icona ☰ per cambiarne l'ordine
- **Impostare BPM**: Clicca sul valore BPM di uno spartito per modificarlo
  - Puoi inserire un valore tra 30 e 300 BPM
  - Premi Enter per confermare o Esc per annullare

### 3. Salvataggio Automatico

- Tutti i dati (scaletta, BPM, ordine) vengono salvati automaticamente nel browser
- Quando riapri l'app, la tua scaletta sarà ripristinata automaticamente
- Le immagini vengono salvate in formato base64 per garantire la persistenza

### 4. Esportazione

- Clicca sul pulsante **"📤 Esporta JSON"** per scaricare la configurazione
- Il file JSON contiene:
  - Lista spartiti con nomi
  - Ordine della scaletta
  - BPM associati a ogni spartito
  - Metadati di esportazione

### 5. Modalità Performance

- Clicca sul pulsante **"▶️ Play"** per entrare in modalità performance
- Lo spartito viene mostrato a schermo intero
- **Navigazione**:
  - Usa i pulsanti ⬅️ Precedente / Successivo ➡️
  - Oppure usa le frecce ← → della tastiera
  - Premi Esc per uscire dalla modalità performance
  - Premi Spazio per mettere in pausa/riprendere il metronomo

### 6. Metronomo

- Il metronomo parte automaticamente con i BPM dello spartito corrente
- **Controlli**:
  - Usa i pulsanti + e - per modificare i BPM
  - Oppure usa lo slider
  - Le modifiche vengono salvate automaticamente nello spartito corrente
- Il metronomo è visibile nella parte inferiore dello schermo

### 7. Supporto Mobile/Tablet

- L'app è ottimizzata per tablet e smartphone
- Supporta sia modalità **portrait** (verticale) che **landscape** (orizzontale)
- I pulsanti sono dimensionati per essere facilmente utilizzabili con il tocco
- Lo zoom e lo scroll sono ottimizzati per la visualizzazione degli spartiti

## Note Tecniche

- **Browser supportati**: Chrome, Firefox, Safari, Edge (versioni recenti)
- **Storage**: I dati vengono salvati nel LocalStorage del browser
- **Metronomo**: Utilizza Web Audio API per garantire precisione
- **Immagini**: Vengono convertite in base64 per garantire la persistenza

## Risoluzione Problemi

### Le immagini non si caricano
- Assicurati che i file siano in formato JPG, PNG o WEBP
- Verifica che i file non siano corrotti

### Il metronomo non funziona
- Assicurati che il browser supporti Web Audio API
- Controlla che l'audio del dispositivo non sia mutato

### I dati non vengono salvati
- Verifica che il browser permetta l'uso del LocalStorage
- Controlla che non ci sia modalità incognito attiva (alcuni browser limitano il LocalStorage)

### L'app è lenta
- Se hai molti spartiti con immagini grandi, potrebbe essere necessario più tempo per il caricamento
- Le immagini vengono convertite in base64, quindi file molto grandi possono occupare molto spazio nel LocalStorage

