# Nūs 0.2.9

- **Android APK.** Nūs now runs on Android through Capacitor: Today, Map,
  Calendar, Smart tasks, Semester, Knot, Email, Connections, History, and
  Settings, with local storage and the same API integration card. This is a
  preview build, not a Play Store release.
- **Blue triangle pointer.** The Companion's on-screen pointer is now a solid
  blue arrowhead at the tip of the strand, so the next control is easier to
  follow from across the room.
- **API integration.** Settings → API connects any OpenAI-compatible endpoint
  (OpenAI, OpenRouter, a university gateway, vLLM, or Ollama). It powers
  syllabus reading, Ask, chat, and voice replies. The key is stored with the OS
  keychain on desktop and in the app's private storage on Android.
- **Windows installer and portable build** rebuilt from this source.

Windows: `Nus-Setup.exe` or `Nus-Portable.exe`.
Android: `Nus-Android.apk`.
