import youtubeDl from "youtube-dl-exec";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { PATHS, FILE_CONFIG } from "./paths.js";

// Configura ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Ottieni informazioni sul video YouTube
 * @param {string} url - URL del video
 * @returns {Promise<{title: string, author: string, duration: string, videoId: string}>}
 */
export async function getVideoInfo(url) {
  try {
    const info = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      // Opzioni per aggirare restrizioni
      geoBypass: true,
      geoBypassCountry: "IT",
      // Simula un browser reale
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      referer: "https://www.youtube.com/",
      // Usa formato compatibile
      format: "bestaudio/best",
    });

    const seconds = parseInt(info.duration) || 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return {
      title: info.title,
      author: info.uploader || info.channel || "Sconosciuto",
      duration: `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`,
      durationSeconds: seconds,
      videoId: info.id,
    };
  } catch (error) {
    const errorMsg = error.message || error.stderr || String(error);

    if (errorMsg.includes("not available")) {
      throw new Error(
        "Video non disponibile. Potrebbe essere privato, rimosso o geo-bloccato.",
      );
    }
    if (errorMsg.includes("age")) {
      throw new Error(
        "Video con restrizioni di età. Prova ad accedere a YouTube nel browser.",
      );
    }
    if (errorMsg.includes("private")) {
      throw new Error("Video privato. Non è possibile scaricarlo.");
    }

    throw error;
  }
}

/**
 * Scarica l'audio da un video YouTube e lo converte in MP3
 * @param {string} url - URL del video YouTube
 * @param {string} videoId - ID del video
 * @param {string} title - Titolo del video (per il nome file)
 * @returns {Promise<string>} - Percorso del file audio scaricato
 */
export async function downloadAudio(url, videoId, title) {
  // Sanitizza il titolo per il nome file
  const sanitizedTitle = title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);

  const outputPath = path.join(
    PATHS.AUDIO_PATH,
    `${sanitizedTitle}_${videoId}.mp3`,
  );
  const tempPath = path.join(PATHS.AUDIO_PATH, `${videoId}_temp`);

  console.log("  Downloading con yt-dlp...");

  try {
    // Scarica l'audio usando yt-dlp
    await youtubeDl(url, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0, // Migliore qualità
      output: tempPath + ".%(ext)s",
      noCheckCertificates: true,
      noWarnings: true,
      ffmpegLocation: path.dirname(ffmpegStatic), // Percorso a ffmpeg
    });

    // Trova il file scaricato (potrebbe avere estensione diversa)
    const files = fs.readdirSync(PATHS.AUDIO_PATH);
    const downloadedFile = files.find((f) => f.startsWith(`${videoId}_temp`));

    if (!downloadedFile) {
      throw new Error("File audio non trovato dopo il download");
    }

    const downloadedPath = path.join(PATHS.AUDIO_PATH, downloadedFile);
    const ext = path.extname(downloadedFile).toLowerCase();

    // Converti in MP3 ottimizzato per speech recognition se necessario
    console.log("  Ottimizzazione audio per trascrizione...");

    await new Promise((resolve, reject) => {
      ffmpeg(downloadedPath)
        .audioCodec("libmp3lame")
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(16000) // 16kHz ottimale per speech recognition
        .format("mp3")
        .on("end", () => {
          // Rimuovi file temporaneo
          try {
            fs.unlinkSync(downloadedPath);
          } catch (e) {}
          resolve();
        })
        .on("error", reject)
        .save(outputPath);
    });

    return outputPath;
  } catch (error) {
    throw new Error(`Errore download audio: ${error.message}`);
  }
}

/**
 * Scarica il video da YouTube
 * @param {string} url - URL del video YouTube
 * @param {string} videoId - ID del video
 * @param {string} title - Titolo del video (per il nome file)
 * @returns {Promise<string>} - Percorso del file video scaricato
 */
export async function downloadVideo(url, videoId, title) {
  // Sanitizza il titolo per il nome file
  const sanitizedTitle = title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);

  const outputPath = path.join(
    PATHS.VIDEO_PATH,
    `${sanitizedTitle}_${videoId}.mp4`,
  );

  console.log("  📹 Downloading video con yt-dlp...");

  try {
    await youtubeDl(url, {
      format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
      ffmpegLocation: path.dirname(ffmpegStatic),
      mergeOutputFormat: "mp4",
    });

    console.log(`  ✓ Video salvato: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`  ⚠️ Errore download video: ${error.message}`);
    return null;
  }
}

/**
 * Estrae l'audio da un file video locale e lo converte in MP3
 * @param {string} videoPath - Percorso del file video
 * @param {string} videoId - ID del video
 * @param {string} title - Titolo del video (per il nome file)
 * @returns {Promise<string>} - Percorso del file audio estratto
 */
export async function extractAudioFromVideo(videoPath, videoId, title) {
  // Sanitizza il titolo per il nome file
  const sanitizedTitle = title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);

  const outputPath = path.join(
    PATHS.AUDIO_PATH,
    `${sanitizedTitle}_${videoId}.mp3`,
  );

  console.log("  🎤 Estrazione audio dal video locale...");

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .audioCodec("libmp3lame")
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(16000) // 16kHz ottimale per speech recognition
        .format("mp3")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    console.log(`  ✓ Audio estratto: ${outputPath}`);
    return outputPath;
  } catch (error) {
    throw new Error(`Errore estrazione audio: ${error.message}`);
  }
}
