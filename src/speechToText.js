import fs from "fs";
import path from "path";

// Dimensione massima file per Whisper API (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Determina quale provider usare basandosi sulle variabili d'ambiente
 */
function getProvider() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: "Groq",
      apiKey: process.env.GROQ_API_KEY,
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      model: "whisper-large-v3",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "OpenAI",
      apiKey: process.env.OPENAI_API_KEY,
      url: "https://api.openai.com/v1/audio/transcriptions",
      model: "whisper-1",
    };
  }
  throw new Error(
    "Nessuna API key configurata. Imposta GROQ_API_KEY o OPENAI_API_KEY nel file .env",
  );
}

/**
 * Trascrivi un file audio usando Whisper (Groq o OpenAI)
 * @param {string} audioPath - Percorso del file audio
 * @returns {Promise<string>} - Testo trascritto
 */
export async function transcribeAudio(audioPath) {
  const stats = fs.statSync(audioPath);

  if (stats.size > MAX_FILE_SIZE) {
    console.log("  ⚠️  File grande, trascrizione in parti...");
    return await transcribeLargeAudio(audioPath);
  }

  return await transcribeChunk(audioPath);
}

/**
 * Trascrivi un singolo file audio usando fetch nativo
 * @param {string} audioPath - Percorso del file
 * @returns {Promise<string>}
 */
async function transcribeChunk(audioPath) {
  const DEBUG = process.env.DEBUG === "true";
  const provider = getProvider();

  if (DEBUG) {
    console.log(`  [DEBUG] Provider: ${provider.name}`);
    console.log(`  [DEBUG] Invio file: ${audioPath}`);
    const stats = fs.statSync(audioPath);
    console.log(
      `  [DEBUG] Dimensione file: ${(stats.size / 1024).toFixed(2)} KB`,
    );
  }

  console.log(`  📡 Usando ${provider.name} (${provider.model})`);

  try {
    // Leggi il file come buffer
    const fileBuffer = fs.readFileSync(audioPath);
    const fileName = path.basename(audioPath);

    // Crea FormData usando la versione nativa di Node.js
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: "audio/mpeg" });
    formData.append("file", blob, fileName);
    formData.append("model", provider.model);
    formData.append("language", "it");
    formData.append("response_format", "json");

    if (DEBUG) {
      console.log(`  [DEBUG] Invio richiesta a ${provider.url}...`);
    }

    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    if (DEBUG) {
      console.log(
        `  [DEBUG] Risposta ricevuta, lunghezza testo: ${data.text?.length || 0} caratteri`,
      );
    }

    return data.text;
  } catch (error) {
    console.error("\n❌ Errore chiamata API OpenAI:");
    console.error(`  Tipo: ${error.constructor.name}`);
    console.error(`  Messaggio: ${error.message}`);

    if (error.code) console.error(`  Codice errore: ${error.code}`);
    if (error.cause) console.error(`  Causa:`, error.cause);

    throw error;
  }
}

/**
 * Trascrivi file audio grandi dividendoli in parti
 * @param {string} audioPath - Percorso del file audio
 * @returns {Promise<string>}
 */
async function transcribeLargeAudio(audioPath) {
  // Per file grandi, usiamo la trascrizione semplice con più chiamate
  // Whisper gestisce file fino a 25MB, quindi dividiamo se necessario

  const ffmpeg = (await import("fluent-ffmpeg")).default;
  const ffmpegStatic = (await import("ffmpeg-static")).default;

  ffmpeg.setFfmpegPath(ffmpegStatic);

  const audioDir = path.dirname(audioPath);
  const baseName = path.basename(audioPath, path.extname(audioPath));
  const chunkDuration = 600; // 10 minuti per chunk

  // Ottieni durata totale
  const duration = await getAudioDuration(audioPath);
  const numChunks = Math.ceil(duration / chunkDuration);

  console.log(`  Dividendo in ${numChunks} parti...`);

  const transcriptions = [];

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDuration;
    const chunkPath = path.join(audioDir, `${baseName}_chunk_${i}.mp3`);

    // Estrai chunk
    await extractAudioChunk(audioPath, chunkPath, startTime, chunkDuration);

    // Trascrivi chunk
    console.log(`  Trascrizione parte ${i + 1}/${numChunks}...`);
    const text = await transcribeChunk(chunkPath);
    transcriptions.push(text);

    // Pulisci chunk
    fs.unlinkSync(chunkPath);
  }

  return transcriptions.join(" ");
}

/**
 * Ottieni la durata di un file audio
 * @param {string} audioPath
 * @returns {Promise<number>}
 */
async function getAudioDuration(audioPath) {
  const ffmpeg = (await import("fluent-ffmpeg")).default;
  const ffmpegStatic = (await import("ffmpeg-static")).default;

  ffmpeg.setFfmpegPath(ffmpegStatic);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
}

/**
 * Estrai un chunk di audio
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {number} startTime
 * @param {number} duration
 * @returns {Promise<void>}
 */
function extractAudioChunk(inputPath, outputPath, startTime, duration) {
  return new Promise(async (resolve, reject) => {
    const ffmpeg = (await import("fluent-ffmpeg")).default;
    const ffmpegStatic = (await import("ffmpeg-static")).default;

    ffmpeg.setFfmpegPath(ffmpegStatic);

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}
