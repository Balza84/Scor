import {
  downloadAudio,
  downloadVideo,
  extractAudioFromVideo,
  getVideoInfo,
} from "./downloader.js";
import { transcribeAudio } from "./speechToText.js";
import { saveTranscription } from "./utils.js";
import { PATHS, FILE_CONFIG } from "./paths.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

/**
 * Pulisce i file temporanei player-script.js creati da ytdl-core
 */
function cleanupPlayerScripts() {
  try {
    const files = fs.readdirSync(ROOT_DIR);
    const playerScripts = files.filter((f) => f.endsWith("-player-script.js"));
    for (const file of playerScripts) {
      fs.unlinkSync(path.join(ROOT_DIR, file));
    }
    if (playerScripts.length > 0) {
      console.log(`  🧹 Puliti ${playerScripts.length} file temporanei`);
    }
  } catch (e) {
    // Ignora errori di pulizia
  }
}

/**
 * Trascrivi un video YouTube in testo
 * @param {string} youtubeUrl - URL del video YouTube
 * @returns {Promise<{outputPath: string, duration: string, text: string, videoPath?: string, audioPath?: string}>}
 */
export async function transcribeYouTube(youtubeUrl) {
  const DEBUG = process.env.DEBUG === "true";

  console.log("📥 Recupero informazioni video...");

  // Ottieni info del video
  let videoInfo;
  try {
    videoInfo = await getVideoInfo(youtubeUrl);
    console.log(`📺 Titolo: ${videoInfo.title}`);
    console.log(`👤 Canale: ${videoInfo.author}`);
    console.log(`⏱️  Durata: ${videoInfo.duration}`);
  } catch (error) {
    console.error("❌ Errore nel recupero info video:");
    if (DEBUG) console.error(error);
    throw new Error(`Impossibile recuperare info video: ${error.message}`);
  }

  // Scarica video se KEEP_VIDEO è attivo
  let videoPath = null;
  if (FILE_CONFIG.KEEP_VIDEO) {
    console.log("\n📹 Download video in corso...");
    try {
      videoPath = await downloadVideo(
        youtubeUrl,
        videoInfo.videoId,
        videoInfo.title,
      );
    } catch (error) {
      console.warn("⚠️ Download video fallito, continuo con solo audio");
      if (DEBUG) console.error(error);
    }
  }

  // Estrai/Scarica audio
  console.log("\n🎵 Estrazione audio in corso...");
  let audioPath;
  try {
    if (videoPath) {
      // Se il video è già stato scaricato, estrai l'audio da esso
      audioPath = await extractAudioFromVideo(
        videoPath,
        videoInfo.videoId,
        videoInfo.title,
      );
    } else {
      // Altrimenti scarica solo l'audio
      audioPath = await downloadAudio(
        youtubeUrl,
        videoInfo.videoId,
        videoInfo.title,
      );
    }
    console.log("✓ Audio pronto");
    console.log(`  📁 File: ${audioPath}`);
    const stats = fs.statSync(audioPath);
    console.log(`  📊 Dimensione: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error("❌ Errore nell'estrazione audio:");
    if (DEBUG) console.error(error);
    throw new Error(`Impossibile ottenere audio: ${error.message}`);
  }

  // Trascrivi audio
  console.log(
    "\n🎤 Trascrizione in corso (potrebbe richiedere alcuni minuti)...",
  );
  let transcription;
  try {
    transcription = await transcribeAudio(audioPath);
    console.log("✓ Trascrizione completata");
  } catch (error) {
    console.error("❌ Errore nella trascrizione:");
    console.error(`  Tipo errore: ${error.constructor.name}`);
    console.error(`  Messaggio: ${error.message}`);
    if (error.code) console.error(`  Codice: ${error.code}`);
    if (error.status) console.error(`  Status HTTP: ${error.status}`);
    if (DEBUG) console.error("\nStack trace:", error.stack);
    throw error;
  }

  // Salva trascrizione
  const mediaInfo = {
    ...videoInfo,
    source: youtubeUrl,
  };
  const outputPath = await saveTranscription(transcription, mediaInfo);

  // Gestione file audio
  if (FILE_CONFIG.KEEP_AUDIO) {
    console.log(`  💾 Audio mantenuto: ${audioPath}`);
  } else {
    try {
      fs.unlinkSync(audioPath);
      console.log("  🧹 File audio temporaneo rimosso");
    } catch (e) {
      // Ignora errori di pulizia
    }
    audioPath = null;
  }

  // Pulisci file temporanei di ytdl-core
  cleanupPlayerScripts();

  const result = {
    outputPath,
    duration: videoInfo.duration,
    text: transcription,
  };

  if (videoPath) result.videoPath = videoPath;
  if (audioPath && FILE_CONFIG.KEEP_AUDIO) result.audioPath = audioPath;

  return result;
}

/**
 * Trascrivi un file media da URL diretto
 * @param {string} mediaUrl - URL diretto al file audio/video
 * @returns {Promise<{outputPath: string, duration: string|null, text: string, audioPath?: string}>}
 */
export async function transcribeDirectMedia(mediaUrl) {
  const DEBUG = process.env.DEBUG === "true";

  // Estrai nome file dall'URL
  const urlObj = new URL(mediaUrl);
  const originalName = path.basename(urlObj.pathname);
  const ext = path.extname(originalName) || ".mp3";
  const timestamp = Date.now();
  const downloadPath = path.join(PATHS.AUDIO_PATH, `direct_${timestamp}${ext}`);
  let audioPath = path.join(PATHS.AUDIO_PATH, `direct_${timestamp}.mp3`);

  console.log("📥 Download file in corso...");
  console.log(`  🔗 URL: ${mediaUrl}`);

  try {
    // Scarica il file
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(downloadPath, Buffer.from(buffer));

    const stats = fs.statSync(downloadPath);
    console.log(`  📊 Dimensione: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log("✓ Download completato");

    // Converti in MP3 se necessario
    if (ext.toLowerCase() !== ".mp3") {
      console.log("\n🔄 Conversione in MP3...");
      await convertToMp3(downloadPath, audioPath);
      fs.unlinkSync(downloadPath); // Rimuovi file originale
      console.log("✓ Conversione completata");
    } else {
      fs.renameSync(downloadPath, audioPath);
    }
  } catch (error) {
    console.error("❌ Errore nel download:");
    if (DEBUG) console.error(error);
    throw new Error(`Impossibile scaricare il file: ${error.message}`);
  }

  // Trascrivi audio
  console.log(
    "\n🎤 Trascrizione in corso (potrebbe richiedere alcuni minuti)...",
  );
  let transcription;
  try {
    transcription = await transcribeAudio(audioPath);
    console.log("✓ Trascrizione completata");
  } catch (error) {
    console.error("❌ Errore nella trascrizione:");
    console.error(`  Tipo errore: ${error.constructor.name}`);
    console.error(`  Messaggio: ${error.message}`);
    if (DEBUG) console.error("\nStack trace:", error.stack);
    throw error;
  }

  // Salva trascrizione
  const mediaInfo = {
    title: originalName || "Media diretto",
    author: urlObj.hostname,
    duration: null,
    source: mediaUrl,
  };
  const outputPath = await saveTranscription(transcription, mediaInfo);

  // Gestione file audio
  if (FILE_CONFIG.KEEP_AUDIO) {
    console.log(`  💾 Audio mantenuto: ${audioPath}`);
  } else {
    try {
      fs.unlinkSync(audioPath);
      console.log("  🧹 File audio temporaneo rimosso");
    } catch (e) {
      // Ignora errori di pulizia
    }
    audioPath = null;
  }

  const result = {
    outputPath,
    duration: null,
    text: transcription,
  };

  if (audioPath && FILE_CONFIG.KEEP_AUDIO) result.audioPath = audioPath;

  return result;
}

/**
 * Trascrivi un file locale audio/video
 * @param {string} filePath - Percorso al file locale
 * @returns {Promise<{outputPath: string, duration: string|null, text: string, audioPath?: string}>}
 */
export async function transcribeLocalFile(filePath) {
  const DEBUG = process.env.DEBUG === "true";

  const absolutePath = path.resolve(filePath);
  const originalName = path.basename(absolutePath);
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  let audioPath = path.join(PATHS.AUDIO_PATH, `local_${timestamp}.mp3`);

  console.log("📁 Lettura file locale...");
  console.log(`  📂 File: ${absolutePath}`);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File non trovato: ${absolutePath}`);
  }

  const stats = fs.statSync(absolutePath);
  console.log(`  📊 Dimensione: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Converti in MP3 se necessario
  const audioExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"];
  const videoExtensions = [".mp4", ".webm", ".mkv", ".avi", ".mov"];

  if (ext === ".mp3") {
    // Copia il file MP3 nella cartella downloads
    fs.copyFileSync(absolutePath, audioPath);
  } else if (audioExtensions.includes(ext) || videoExtensions.includes(ext)) {
    console.log("\n🔄 Conversione in MP3...");
    await convertToMp3(absolutePath, audioPath);
    console.log("✓ Conversione completata");
  } else {
    throw new Error(`Formato non supportato: ${ext}`);
  }

  // Trascrivi audio
  console.log(
    "\n🎤 Trascrizione in corso (potrebbe richiedere alcuni minuti)...",
  );
  let transcription;
  try {
    transcription = await transcribeAudio(audioPath);
    console.log("✓ Trascrizione completata");
  } catch (error) {
    console.error("❌ Errore nella trascrizione:");
    console.error(`  Tipo errore: ${error.constructor.name}`);
    console.error(`  Messaggio: ${error.message}`);
    if (DEBUG) console.error("\nStack trace:", error.stack);
    throw error;
  }

  // Salva trascrizione
  const mediaInfo = {
    title: originalName,
    author: "File locale",
    duration: null,
    source: absolutePath,
  };
  const outputPath = await saveTranscription(transcription, mediaInfo);

  // Gestione file audio
  if (FILE_CONFIG.KEEP_AUDIO) {
    console.log(`  💾 Audio mantenuto: ${audioPath}`);
  } else {
    try {
      fs.unlinkSync(audioPath);
      console.log("  🧹 File audio temporaneo rimosso");
    } catch (e) {
      // Ignora errori di pulizia
    }
    audioPath = null;
  }

  const result = {
    outputPath,
    duration: null,
    text: transcription,
  };

  if (audioPath && FILE_CONFIG.KEEP_AUDIO) result.audioPath = audioPath;

  return result;
}

/**
 * Converte un file audio/video in MP3
 * @param {string} inputPath - Percorso file sorgente
 * @param {string} outputPath - Percorso file MP3 di output
 * @returns {Promise<void>}
 */
async function convertToMp3(inputPath, outputPath) {
  const ffmpeg = (await import("fluent-ffmpeg")).default;
  const ffmpegStatic = (await import("ffmpeg-static")).default;

  ffmpeg.setFfmpegPath(ffmpegStatic);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .audioChannels(1)
      .audioFrequency(16000)
      .format("mp3")
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}
