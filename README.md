# Snippets

A fast, distraction-free workspace to capture, search, and organize code snippets and markdown notes. Built to run entirely in your browser with zero setup—no database, backend, or account required to get started.

[**Live Demo →**](https://imranpollob.github.io/snippet-notes/)

[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![Storage](https://img.shields.io/badge/Storage-Local-teal)](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Highlights

- **Quick Capture Dock**: Paste code directly. The editor auto-detects language across 10+ syntaxes, derives smart titles from comments or function signatures, and saves instantly.
- **Fast Omni-Search**: Jump straight to search with `⌘K` or `/`. Filter in real-time across titles, code content, tags, and languages.
- **Dual View Modes**: Switch between rich cards with syntax highlighting and a high-density compact list for quick scanning.
- **100% Private & Offline-Ready**: Everything saves to your browser's local storage. No tracking, no mandatory logins, and zero latency.
- **Optional Cloud Sync**: Connect your Google account anytime to synchronize snippets across devices using Firebase Firestore.
- **Data Portability**: Full JSON backup export and import, plus single-snippet export to `.md` files.
- **Dark & Light Mode**: Seamless theme switcher matching system preferences with zero flash on page load.

---

## Keyboard Shortcuts

Designed for keyboard-first developer workflows:

| Action                    | Shortcut (Mac) | Shortcut (Win / Linux) |
| :------------------------ | :------------- | :--------------------- |
| **New Snippet**           | `C` or `⌥ + N` | `C` or `Alt + N`       |
| **Search**                | `⌘ + K` or `/` | `Ctrl + K` or `/`      |
| **Save Snippet**          | `⌘ + Enter`    | `Ctrl + Enter`         |
| **Close / Clear**         | `Esc`          | `Esc`                  |
| **Shortcuts Cheat Sheet** | `?`            | `?`                    |

---

## Getting Started

### 1. Clone & Run Locally

```bash
git clone https://github.com/imranpollob/snippet-notes.git
cd snippet-notes
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 2. Build for Production

```bash
npm run build
```

This compiles a static export to `./out/`, ready to deploy anywhere.

---

## Optional: Firebase Cloud Sync

If you want cross-device cloud sync with Google Sign-In, add your Firebase keys to `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

If these are omitted, the app runs entirely in private local mode.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, Static Export)
- **UI & State**: React 18
- **Typography**: Outfit, Plus Jakarta Sans, JetBrains Mono
- **Styling**: CSS Variables & Semantic Design Tokens
- **Optional Cloud**: Firebase Auth & Firestore

---

## Author

Crafted by **Imran Pollob** ([@imranpollob](https://github.com/imranpollob)).  
Licensed under the [MIT License](LICENSE).
