import fs from "fs";
import path from "path";
import { PATHS } from "./paths.js";

/**
 * Sanitizza un nome file rimuovendo caratteri non validi
 * @param {string} filename
 * @returns {string}
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

/**
 * Salva la trascrizione in un file di testo
 * @param {string} transcription - Testo della trascrizione
 * @param {object} mediaInfo - Informazioni sul media
 * @returns {Promise<string>} - Percorso del file salvato
 */
export async function saveTranscription(transcription, mediaInfo) {
  const sanitizedTitle = sanitizeFilename(mediaInfo.title);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .substring(0, 19);
  const filename = `${sanitizedTitle}_${timestamp}.txt`;
  const outputPath = path.join(PATHS.TRANSCRIPTION_PATH, filename);

  const content = `═══════════════════════════════════════════════════════════════
TRASCRIZIONE AUDIO/VIDEO
═══════════════════════════════════════════════════════════════

📄 Titolo: ${mediaInfo.title}
👤 Autore/Canale: ${mediaInfo.author || "N/A"}
⏱️  Durata: ${mediaInfo.duration || "N/A"}
🔗 Sorgente: ${mediaInfo.source || "N/A"}
📅 Data trascrizione: ${new Date().toLocaleString("it-IT")}

═══════════════════════════════════════════════════════════════
TRASCRIZIONE
═══════════════════════════════════════════════════════════════

${transcription}

═══════════════════════════════════════════════════════════════
`;

  fs.writeFileSync(outputPath, content, "utf-8");
  return outputPath;
}

/**
 * Formatta la durata in formato leggibile
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
