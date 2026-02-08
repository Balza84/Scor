# Media to Text 🎬➡️📝

> 🇬🇧 [English](README.md) | 🇮🇹 Italiano

Applicazione Node.js per convertire audio e video in file di testo usando la trascrizione vocale con AI.

## Funzionalità

- ✅ **YouTube**: Download e trascrizione di video, shorts e playlist
- ✅ **File locali**: Trascrizione di file audio/video dal tuo PC o NAS
- ✅ **URL diretti**: Trascrizione da link diretti a file media
- ✅ **Multi-provider**: Supporto per Groq (gratuito) e OpenAI
- ✅ **Video lunghi**: Divisione automatica per file grandi
- ✅ **Multilingua**: Italiano di default, rileva automaticamente altre lingue
- ✅ **Archiviazione media**: Possibilità di scaricare e conservare video e audio localmente (configura `KEEP_VIDEO` e `KEEP_AUDIO` nel file `.env`)

## Formati Supportati

| Audio | Video |
|-------|-------|
| `.mp3` | `.mp4` |
| `.wav` | `.webm` |
| `.ogg` | `.mkv` |
| `.m4a` | `.avi` |
| `.flac` | `.mov` |
| `.aac` | |

## Prerequisiti

- **Node.js** v18 o superiore
- **FFmpeg** (incluso automaticamente tramite ffmpeg-static)
- **API Key** Groq (gratuito) oppure OpenAI

## Installazione

1. Clona o scarica questo repository

2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Configura l'API key:
   ```bash
   # Copia il file di esempio
   cp .env.example .env
   
   # Modifica .env e inserisci la tua API key
   # OPZIONE 1: Groq (GRATUITO - consigliato)
   GROQ_API_KEY=gsk_...
   
   # OPZIONE 2: OpenAI (a pagamento)
   # OPENAI_API_KEY=sk-...
   ```

   💡 **Consiglio**: Usa [Groq](https://console.groq.com) - è gratuito e velocissimo!

### Configurazione Avanzata

Nel file `.env` puoi configurare anche:

```bash
# Mantieni i file audio dopo la trascrizione (default: false)
KEEP_AUDIO=true

# Mantieni i video YouTube scaricati (default: false)
KEEP_VIDEO=true

# Percorsi personalizzati per l'archiviazione
VIDEO_PATH=C:\Media\Videos
AUDIO_PATH=C:\Media\Audio
TRANSCRIPTION_PATH=C:\Media\Transcriptions
```

All'avvio, l'applicazione verifica che i percorsi esistano e siano accessibili. Se non esistono, vengono creati automaticamente.

## Utilizzo

```bash
npm start <SORGENTE>
```

### Esempi

```bash
# Video YouTube
npm start https://www.youtube.com/watch?v=dQw4w9WgXcQ

# YouTube Shorts
npm start https://youtube.com/shorts/Mp4VE4nLXWc

# URL corto
npm start https://youtu.be/dQw4w9WgXcQ

# File locale
npm start "C:\Video\intervista.mp4"

# File da NAS
npm start "\\nas\media\podcast.mp3"

# URL diretto a file media
npm start https://example.com/audio.mp3
```

## Output

Le trascrizioni vengono salvate nella cartella `output/` con il formato:
```
output/
  └── Titolo_Media_2026-02-03T22-15-30.txt
```

Ogni file contiene:
- Metadati (titolo, autore/canale, durata)
- Sorgente originale (URL o percorso file)
- Data della trascrizione
- Testo completo trascritto

## Costi

| Provider | Costo | Note |
|----------|-------|------|
| **Groq** | Gratuito | Usa Whisper Large V3, molto veloce |
| **OpenAI** | ~$0.006/minuto | ~$0.06 per 10 minuti |

## Struttura Progetto

```
media-to-text/
├── index.js              # Entry point
├── src/
│   ├── transcriber.js    # Orchestrazione trascrizione
│   ├── downloader.js     # Download audio/video (yt-dlp)
│   ├── speechToText.js   # Integrazione Whisper (Groq/OpenAI)
│   ├── paths.js          # Gestione percorsi e configurazione
│   └── utils.js          # Utility varie
├── downloads/
│   ├── audio/            # File audio (temporanei o archiviati)
│   └── videos/           # File video (se KEEP_VIDEO=true)
├── output/               # Trascrizioni salvate
├── .env                  # Configurazione (API keys e percorsi)
└── package.json
```

## Troubleshooting

### Errore "Video unavailable"
Il video potrebbe essere privato, rimosso o geo-bloccato nel tuo paese.

### Errore "Rate limit" o "Quota exceeded"
Hai superato i limiti dell'API. Con Groq questo è raro, con OpenAI potrebbe richiedere di aggiungere crediti.

### Errore di connessione
Verifica la tua connessione internet e che non ci siano firewall/proxy che bloccano le richieste.

### File troppo grande
Per file molto lunghi (>2 ore), l'app divide automaticamente l'audio in parti da 10 minuti.

## Licenza

MIT
