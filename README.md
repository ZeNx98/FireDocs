<p align="center">
  <img src="icon.png" width="256" height="256" alt="FireDoc Logo">
</p>

<h1 align="center">FireDoc</h1>

**A minimalist, blazing-fast PDF viewer built with Tauri and Mozilla's PDF.js**

## What is FireDoc?

FireDoc is a standalone, lightweight PDF viewer designed for speed and privacy. While browser-based viewers are convenient, they often come with clutter and overhead. FireDoc strips all that away, providing a distraction-free reading experience. Built with **Tauri**, it offers native performance with a tiny footprint, no tracking, and no cloud dependencies.

## 🚀 Features

- **Blazing Fast** — Built with Rust and Tauri for near-instant startup.
- **Minimalist Interface** — Modern, clean design with an orange/fire aesthetic.
- **Recent Files** — Quickly jump back into your last 6 documents from the homepage.
- **Drag & Drop** — Open PDFs instantly by dropping them anywhere.
- **Annotation Tools** — Highlight, draw, and add text comments (powered by PDF.js).
- **Privacy First** — Runs 100% locally with no telemetry or external calls.
- **Cross-Platform** — Native builds for Linux and Windows (macOS support in progress).

---

## 📸 Screenshots

<p align="center">
  <img src="img/screenshot1.png" width="400" alt="FireDoc Homepage">
  <img src="img/screenshot2.png" width="400" alt="FireDoc Viewer">
</p>

<p align="center">
  <em>Left: Homepage with recent files • Right: Interactive PDF viewer interface</em>
</p>

---

## 📦 Installation

### Pre-built Releases
Download the latest binaries for your platform:
**[Download FireDoc from Releases](https://github.com/ZeNx98/FireDoc/releases)**

- **Linux**: `.deb`, `.AppImage`, and Arch Linux packages.
- **Windows**: `.msi` and setup executables.

### Arch Linux (AUR)
If you are on Arch Linux, you can build the package using the provided `PKGBUILD`:
```sh
cd pkg
makepkg -si
```

### From Source
Requires **Rust** and **Node.js**:
```sh
# Clone the repository
git clone https://github.com/ZeNx98/FireDoc.git
cd FireDoc

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build production bundle
npm run tauri build
```

---

## 📖 How to Use

1. **Open a PDF**:
   - Use the **Browse Files** button on the homepage.
   - **Drag and drop** a PDF file onto the app window.
   - Select a file from the **Continue Reading** list.
2. **Reading & Editing**:
   - **Scroll/Zoom**: Use standard mouse gestures or toolbar controls.
   - **Annotations**: Use the Pencil, Highlight, or Text tools in the toolbar.
   - **Sidebars**: Toggle thumbnails or document outlines for easy navigation.
3. **Save**: Click the download/save icon to export your annotated PDF.

---

## 🤝 Contributing

Contributions are welcome! Whether it's fixing a bug, adding a feature, or improving documentation, feel free to open a PR.

- **Translations**: Help us reach more languages!
- **UI/UX**: Help refine the "Fire" aesthetic.
- **Testing**: Report issues or request features via GitHub Issues.

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.
FireDoc uses **Mozilla PDF.js** (Apache 2.0).

---

**Made with ❤️ by [ZeNx98](https://github.com/ZeNx98)**
