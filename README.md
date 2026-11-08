# EasyScore - Teleprompter Musicale

Applicazione web React per la gestione di spartiti musicali con metronomo integrato, pensata per performance live su tablet o smartphone.

## Funzionalità

- 📁 Selezione cartella e caricamento automatico di immagini spartiti
- 📋 Lista spartiti ordinabile con drag & drop
- ⏱️ Metronomo con BPM personalizzabile per ogni spartito
- 💾 Salvataggio automatico locale (LocalStorage)
- 📤 Esportazione configurazione in formato JSON
- 🎵 Modalità Performance a schermo intero
- 📱 Supporto completo portrait e landscape

## Installazione

```bash
npm install
```

## Sviluppo

```bash
npm run dev
```

## Build

```bash
npm run build
```


## Pubblicazione su GitHub Pages

Il deploy è automatico tramite GitHub Actions (`.github/workflows/deploy.yml`) a ogni push su `main`.

Configurazione una tantum: su GitHub vai in **Settings → Pages → Build and deployment → Source** e scegli **GitHub Actions**.

L'app sarà disponibile su `https://francocerone.github.io/EasyScore/`.
Se rinomini il repository, aggiorna `base` in `vite.config.js`.
