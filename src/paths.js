import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

/**
 * Configurazione dei percorsi di archiviazione
 */
export const PATHS = {
  get VIDEO_PATH() {
    return process.env.VIDEO_PATH || path.join(ROOT_DIR, "downloads", "videos");
  },
  get AUDIO_PATH() {
    return process.env.AUDIO_PATH || path.join(ROOT_DIR, "downloads", "audio");
  },
  get TRANSCRIPTION_PATH() {
    return process.env.TRANSCRIPTION_PATH || path.join(ROOT_DIR, "output");
  },
};

/**
 * Configurazione per la gestione dei file
 */
export const FILE_CONFIG = {
  get KEEP_AUDIO() {
    return process.env.KEEP_AUDIO === "true";
  },
  get KEEP_VIDEO() {
    return process.env.KEEP_VIDEO === "true";
  },
};

/**
 * Verifica che un percorso esista e sia accessibile.
 * Se non esiste, tenta di crearlo.
 * @param {string} dirPath - Percorso assoluto della directory
 * @param {string} name - Nome descrittivo per i messaggi
 * @returns {boolean} - true se il percorso è valido e accessibile
 */
function ensurePathExists(dirPath, name) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  ✓ ${name}: ${dirPath} (creato)`);
    } else {
      // Verifica permessi di scrittura
      fs.accessSync(dirPath, fs.constants.W_OK);
      console.log(`  ✓ ${name}: ${dirPath}`);
    }
    return true;
  } catch (error) {
    console.error(`  ✗ ${name}: ${dirPath}`);
    console.error(`    Errore: ${error.message}`);
    return false;
  }
}

/**
 * Inizializza e verifica tutti i percorsi di archiviazione.
 * @returns {boolean} - true se tutti i percorsi sono validi
 */
export function initializePaths() {
  console.log("📂 Verifica percorsi di archiviazione...");

  const results = [
    ensurePathExists(PATHS.VIDEO_PATH, "Video"),
    ensurePathExists(PATHS.AUDIO_PATH, "Audio"),
    ensurePathExists(PATHS.TRANSCRIPTION_PATH, "Trascrizioni"),
  ];

  const allValid = results.every((r) => r);

  if (allValid) {
    console.log("✓ Tutti i percorsi sono accessibili\n");
  } else {
    console.error("\n❌ Alcuni percorsi non sono accessibili.");
    console.error(
      "   Verifica le impostazioni in .env e i permessi delle cartelle.\n",
    );
  }

  return allValid;
}
