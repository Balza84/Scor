import "dotenv/config";
import {
  transcribeYouTube,
  transcribeDirectMedia,
  transcribeLocalFile,
} from "./src/transcriber.js";
import { initializePaths } from "./src/paths.js";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Media to Text - Trascrizione Audio/Video          ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log("║  Uso: npm start <URL o FILE>                               ║");
  console.log("║                                                            ║");
  console.log("║  Formati supportati:                                       ║");
  console.log("║  • YouTube: youtube.com/watch?v=... | youtu.be/... | shorts║");
  console.log("║  • Link diretti: https://example.com/audio.mp3             ║");
  console.log(
    "║  • File locali: C:\\path\\to\\file.mp3                        ║",
  );
  console.log("║                                                            ║");
  console.log("║  Configura GROQ_API_KEY (gratis) o OPENAI_API_KEY in .env  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  process.exit(1);
}

const input = args[0];

// Verifica API key (Groq o OpenAI)
if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
  console.error("❌ Errore: Nessuna API key configurata");
  console.log("   1. Copia .env.example in .env");
  console.log("   2. Inserisci GROQ_API_KEY (gratis) o OPENAI_API_KEY");
  console.log("");
  console.log("   💡 Groq è gratuito! Registrati su https://console.groq.com");
  process.exit(1);
}

// Verifica e inizializza i percorsi di archiviazione
if (!initializePaths()) {
  process.exit(1);
}

// Determina il tipo di input
const youtubeRegex =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]+/;
const directUrlRegex =
  /^https?:\/\/.+\.(mp3|mp4|wav|ogg|webm|m4a|flac|aac|mpeg)(\?.*)?$/i;
const isLocalFile = fs.existsSync(input);
const isYouTube = youtubeRegex.test(input);
const isDirectUrl = directUrlRegex.test(input);

if (!isYouTube && !isDirectUrl && !isLocalFile) {
  console.error("❌ Errore: Input non valido");
  console.log("   Formati accettati:");
  console.log("   • YouTube: youtube.com/watch?v=... | youtu.be/... | shorts");
  console.log("   • Link diretti a file audio/video (.mp3, .mp4, .wav, etc.)");
  console.log("   • File locali esistenti");
  process.exit(1);
}

console.log("🎬 Avvio trascrizione...\n");

try {
  let result;

  if (isYouTube) {
    console.log("📺 Rilevato: Video YouTube");
    result = await transcribeYouTube(input);
  } else if (isDirectUrl) {
    console.log("🔗 Rilevato: Link diretto a media");
    result = await transcribeDirectMedia(input);
  } else if (isLocalFile) {
    console.log("📁 Rilevato: File locale");
    result = await transcribeLocalFile(input);
  }

  console.log("\n✅ Trascrizione completata!");
  console.log(`📄 Trascrizione salvata in: ${result.outputPath}`);
  if (result.duration) {
    console.log(`⏱️  Durata: ${result.duration}`);
  }
  if (result.videoPath) {
    console.log(`📹 Video salvato in: ${result.videoPath}`);
  }
  if (result.audioPath) {
    console.log(`🎵 Audio salvato in: ${result.audioPath}`);
  }
} catch (error) {
  console.error("\n❌ Errore durante la trascrizione:", error.message);
  process.exit(1);
}
