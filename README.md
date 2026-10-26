# Media to Text 🎬➡️📝

> 🇬🇧 English | 🇮🇹 [Italiano](README.it.md)

A Node.js application to convert audio and video into text files using AI-powered speech transcription.

## Features

- ✅ **YouTube**: Download and transcribe videos, shorts, and playlists
- ✅ **Local files**: Transcribe audio/video files from your PC or NAS
- ✅ **Direct URLs**: Transcribe from direct links to media files
- ✅ **Multi-provider**: Support for Groq (free) and OpenAI
- ✅ **Long videos**: Automatic splitting for large files
- ✅ **Multilingual**: Italian by default, automatically detects other languages
- ✅ **Media archiving**: Option to download and store video and audio locally (configure `KEEP_VIDEO` and `KEEP_AUDIO` in `.env`)

## Supported Formats

| Audio | Video |
|-------|-------|
| `.mp3` | `.mp4` |
| `.wav` | `.webm` |
| `.ogg` | `.mkv` |
| `.m4a` | `.avi` |
| `.flac` | `.mov` |
| `.aac` | |

## Prerequisites

- **Node.js** v18 or higher
- **FFmpeg** (automatically included via ffmpeg-static)
- **FFprobe** (automatically included via ffprobe-static for splitting large files)
- **API Key** from Groq (free) or OpenAI

## Installation

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your API key:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your API key
   # OPTION 1: Groq (FREE - recommended)
   GROQ_API_KEY=gsk_...
   
   # OPTION 2: OpenAI (paid)
   # OPENAI_API_KEY=sk-...
   ```

   💡 **Tip**: Use [Groq](https://console.groq.com) - it's free and super fast!

### Advanced Configuration

In the `.env` file you can also configure:

```bash
# Keep audio files after transcription (default: false)
KEEP_AUDIO=true

# Keep downloaded YouTube videos (default: false)
KEEP_VIDEO=true

# Custom paths for storage
VIDEO_PATH=C:\Media\Videos
AUDIO_PATH=C:\Media\Audio
TRANSCRIPTION_PATH=C:\Media\Transcriptions
```

On startup, the application verifies that paths exist and are accessible. If they don't exist, they are created automatically.

## Usage

```bash
npm start <SOURCE>
```

### Examples

```bash
# YouTube video
npm start https://www.youtube.com/watch?v=dQw4w9WgXcQ

# YouTube Shorts
npm start https://youtube.com/shorts/Mp4VE4nLXWc

# Short URL
npm start https://youtu.be/dQw4w9WgXcQ

# Local file
npm start "C:\Videos\interview.mp4"

# File from NAS
npm start "\\nas\media\podcast.mp3"

# Direct URL to media file
npm start https://example.com/audio.mp3
```

## Output

Transcriptions are saved in the `output/` folder with the format:
```
output/
  └── Media_Title_2026-02-03T22-15-30.txt
```

Each file contains:
- Metadata (title, author/channel, duration)
- Original source (URL or file path)
- Transcription date
- Complete transcribed text

## Pricing

| Provider | Cost | Notes |
|----------|------|-------|
| **Groq** | Free | Uses Whisper Large V3, very fast |
| **OpenAI** | ~$0.006/minute | ~$0.06 for 10 minutes |

## Project Structure

```
media-to-text/
├── index.js              # Entry point
├── src/
│   ├── transcriber.js    # Transcription orchestration
│   ├── downloader.js     # Audio/video download (yt-dlp)
│   ├── speechToText.js   # Whisper integration (Groq/OpenAI)
│   ├── paths.js          # Path management and configuration
│   └── utils.js          # Various utilities
├── downloads/
│   ├── audio/            # Audio files (temporary or archived)
│   └── videos/           # Video files (if KEEP_VIDEO=true)
├── output/               # Saved transcriptions
├── .env                  # Configuration (API keys and paths)
└── package.json
```

## Troubleshooting

### "Video unavailable" error
The video might be private, removed, or geo-blocked in your country.

### "Rate limit" or "Quota exceeded" error
You've exceeded API limits. With Groq this is rare; with OpenAI you may need to add credits.

### Connection error
Check your internet connection and ensure no firewall/proxy is blocking requests.

### File too large
For very long files (>2 hours), the app automatically splits audio into 10-minute chunks.

## License

MIT
