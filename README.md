<p align="center">
  <img src="icon.png" width="256" height="256">
</p>

<h1 align="center">FireDoc</h1>

**A minimalist, privacy-focused PDF viewer built with Electron and Mozilla's PDF.js**

## What is FireDoc?

Firefox’s built-in PDF viewer is solid, but its browser interface can feel cluttered for reading. FireDoc fixes that by being fully standalone—built with Electron and PDF.js—with no Firefox, no browser UI, no cloud services, and no tracking. Just a clean, lightweight app that runs entirely on your device, giving you a fast, distraction-free way to read and edit PDFs.

##  Features

- **Minimalist Interface** — Clean design inspired by Firefox
- **Recent Files Panel** — Automatic thumbnails and quick reopening of recent documents
- **Dark Theme** — Easy on the eyes with Firefox-inspired colors
- **File Associations** — Set FireDoc as your default PDF viewer
- **Offline First** — Works completely offline, no internet required
- **Cross-Platform** — Built with Electron for Linux (Windows/Mac support coming soon!)
  
---

## Screenshots

<p align="center">
  <img src="img/screenshot1.png" width="400">
  <img src="img/screenshot2.png" width="400">
</p>

<p align="center">
  <em>Left: Start page • Right: PDF viewer interface</em>
</p>

---

##  Quick Install

**The easiest way to install FireDoc is to download a pre-built release:**

 **[Download FireDoc from Releases](https://github.com/ZeNx98/FireDoc/releases)**

Choose the installer for your operating system:
- **Linux**: `.deb` (Debian/Ubuntu) or `.AppImage` (universal)
- **More platforms coming soon!**

### Installation Steps

#### Debian/Ubuntu (.deb)
```sh
# Download the .deb file from releases, then:
sudo dpkg -i FireDoc-2.0.0-amd64.deb
```

#### Universal Linux (AppImage)
```sh
# Download the .AppImage, make it executable, and run:
chmod +x FireDoc-2.0.0-x86_64.AppImage
./FireDoc-2.0.0-x86_64.AppImage
```


## 📖 How to Use

1. **Launch FireDoc** from your applications menu or by double-clicking the desktop icon.
2. **Open a PDF** by:
   - Clicking "Choose PDF File" button
   - Dragging and dropping a PDF onto the window
   - Pressing `O` on your keyboard
   - Clicking a recent file from your history
3. **View your PDF** with all the features of Mozilla's PDF.js viewer:
   - Zoom in/out
   - Navigate pages
   - Search text
   - Print documents
   - Toggle sidebar for thumbnails and outline

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `O` | Open file dialog |
| `?` or `/` | Show keyboard shortcuts |
| Drag & Drop | Drop PDF files anywhere |


---

## Contributing

**Contributions are welcome!** We'd especially love help with:

- **Supporting more platforms** — Windows and macOS builds
- **Translations** — Multi-language support
- **UI/UX improvements** — Design enhancements and accessibility
- **Bug fixes** — Testing and reporting issues
- **Documentation** — Better guides and tutorials
- 
---

## License

This project is licensed under MIT License in the [LICENSE](./LICENSE) file.

FireDoc uses **Mozilla PDF.js** which is licensed under Apache 2.0. See `pdfjs/LICENSE` for details.

---

## Acknowledgements

- Built with **[Mozilla PDF.js](https://github.com/mozilla/pdf.js)** — Industry-leading PDF rendering
- Built with **[Electron](https://www.electronjs.org/)** — Cross-platform desktop framework
- Inspired by Firefox's clean, minimalist design philosophy

---

**Made with ❤️ by [ZeNx98](https://github.com/ZeNx98)**
