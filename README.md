<p align="center">
  <img src="icon.png" width="160" height="160" alt="FireDoc Logo">
</p>

<h1 align="center">FireDoc</h1>

<p align="center">
  <strong>A fast, minimalist PDF viewer for your desktop.</strong>
</p>

---

### Why FireDoc?
FireDoc is built for people who want a dedicated space for reading without the clutter of a web browser. It’s lightweight, privacy-focused, and stays out of your way.

#### **Better than a Browser (PDF.js Improvements):**
- **Lightweight** — Uses Tauri to provide a native app feel with a fraction of the memory usage of a full browser
- **Native Experience** — No browser tabs, address bars, or distractions.
- **Modern UI** — Optimized for focus, updated UI and styles.
- **De-Cluttered Interface** — Removed "trash" features and unneeded buttons from the standard PDF.js for more comfortable reading experience.
- **Smarter Zoom & Rendering** — Improved zoom logic and more stable page rendering for crisp text at any scale.
- **Better Annotations** — A refined highlighting and drawing experience, including smarter tool selection and restricted ink selection to prevent accidental edits.
- **Persistent Recents** — Standard PDF.js doesn't remember your files. FireDoc keeps your last 6 documents ready on the homepage.
- **Native File Handling** — Proper "Save As" dialogs and blazing-fast file opening via Rust.

---

### Installation

#### **Linux (Multiple Options)**

**AppImage (Portable)**
> [!WARNING]
> The current AppImage version has a bug and is not loading files. Please use the `.deb` or AUR version for now.

   chmod +x  firedoc_3.1.0_amd64.AppImage 
   ./firedoc_3.1.0_amd64.AppImage
   ```

**Debian / Ubuntu (.deb)**
# Download the .deb file and run:
sudo apt update
sudo apt install ./firedoc_amd64.deb
```

**Fedora / Red Hat (.rpm)**
```bash
# Download the .rpm file and run:
sudo dnf install ./firedoc.rpm
```

**Arch Linux (AUR)**
Install FireDoc easily using an AUR helper like `yay`:
```bash
yay -S firedoc
```

#### **Windows**
Download the `.msi` or `.exe` installer from the **[latest release](https://github.com/ZeNx98/FireDoc/releases)**. Run the setup and follow the prompts.

#### **macOS**
Download the `.dmg` from the releases page, drag the **FireDoc** icon into your **Applications** folder, and launch it from your Launchpad.

---

### Contributing
Spot a bug or have an idea? Feel free to open an issue or drop a pull request. We're always looking to make FireDoc better.

**Made with ❤️ by [ZeNx98](https://github.com/ZeNx98)**
