import { PDFDataRangeTransport } from '../build/pdf.mjs';

// FireDoc Custom PDF.js Viewer Enhancements
// Additional functionality and UX improvements

class TauriRangeTransport extends PDFDataRangeTransport {
  constructor(path, length, initialData) {
    super(length, initialData);
    this.path = path;
    console.log(`TauriRangeTransport initialized for ${path} (${length} bytes)`);
  }

  requestDataRange(begin, end) {
    console.log(`Requesting data range: ${begin} - ${end}`);
    const length = end - begin;
    (window.__TAURI__.core?.invoke || window.__TAURI__.invoke)('read_file_chunk', {
      path: this.path,
      offset: begin,
      length: length
    })
      .then(base64Data => {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        this.onDataRange(begin, bytes);
      })
      .catch(err => {
        console.error('Chunk read error:', err);
      });
  }
}
(function () {
  'use strict';

  const initEnhancements = function () {
    console.log('FireDoc Enhancements initializing...');

    const hideDecorations = localStorage.getItem('fireDoc_hideDecorations') === 'true';
    // alert('Debug: pdfPath=' + pdfPath + ' __TAURI__=' + !!window.__TAURI__);

    // Add Home button functionality
    const homeButton = document.getElementById('homeButton');
    if (homeButton) {
      homeButton.addEventListener('click', function () {
        // In Electron, load the startpage
        if (window.location.protocol === 'file:') {
          // Go up from pdfjs/web/ to project root and open homepage.html
          window.location.href = '../../homepage.html';
        } else {
          // In browser, go to the root
          window.location.href = '/homepage.html';
        }
      });
      console.log('Home button initialized');
    }

    // --- Custom File Loading via Tauri FS (Chunked) ---
    const urlParams = new URLSearchParams(window.location.search);
    const pdfPath = urlParams.get('pdfPath');

    if (pdfPath && window.__TAURI__) {
      console.log('Detected pdfPath, attempting custom chunked load:', pdfPath);

      const invoke = window.__TAURI__.core?.invoke || window.__TAURI__.invoke;
      console.log('Detected pdfPath, attempting custom chunked load:', pdfPath);
      if (!invoke) alert('Error: Tauri invoke not found!');
      const INITIAL_CHUNK_SIZE = 65536; // 64KB start

      invoke('get_file_metadata', { path: pdfPath })
        .then(metadata => {
          console.log('Metadata received:', metadata);
          if (!metadata) {
            alert('Error: No metadata received for ' + pdfPath);
            return;
          }
          const totalSize = metadata.size;

          // 2. Initialize Transport with empty data to force standard loading
          const transport = new TauriRangeTransport(pdfPath, totalSize, []);

          // 3. Open in Viewer
          let attempts = 0;
          const checkApp = setInterval(() => {
            attempts++;
            if (window.PDFViewerApplication && window.PDFViewerApplication.open) {
              clearInterval(checkApp);
              console.log('PDFViewerApplication ready. Opening PDF with Transport...');

              const openPdf = () => window.PDFViewerApplication.open({ range: transport });

              if (window.PDFViewerApplication.close) {
                window.PDFViewerApplication.close().then(openPdf).catch(openPdf);
              } else {
                openPdf();
              }

              const filename = pdfPath.split(/[\\/]/).pop();
              document.title = filename;
            } else if (attempts > 100) {
              clearInterval(checkApp);
              alert('Timeout waiting for PDFViewerApplication');
            }
          }, 100);
        })
        .catch(err => {
          alert('IPC/Metadata Error: ' + err);
        });
    }

    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', function (e) {

      // Home key: Go to first page
      if (e.key === 'Home' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        const pageNumber = document.getElementById('pageNumber');
        if (pageNumber) {
          pageNumber.value = '1';
          pageNumber.dispatchEvent(new Event('change'));
        }
      }

      // End key: Go to last page
      if (e.key === 'End' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        const numPages = document.getElementById('numPages');
        const pageNumber = document.getElementById('pageNumber');
        if (pageNumber && numPages) {
          pageNumber.value = numPages.textContent;
          pageNumber.dispatchEvent(new Event('change'));
        }
      }

      // F key: Toggle find bar
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeElement = document.activeElement;
        // Check for inputs, textareas, OR any contentEditable element (like FreeText annotations)
        if (activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable
        )) {
          return; // Don't trigger if typing
        }
        e.preventDefault();
        const findButton = document.getElementById('viewFindButton');
        if (findButton) {
          findButton.click();
        }
      }

      // ESC key: Close find bar and sidebar
      if (e.key === 'Escape') {
        const findbar = document.getElementById('findbar');
        if (findbar && !findbar.hidden) {
          // Toggle using the same button that opens it
          const findButton = document.getElementById('viewFindButton');
          if (findButton) findButton.click();
        }
      }
    });

    // Add page transition animations
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(function (node) {
            if (node.classList && node.classList.contains('page')) {
              node.style.animation = 'pageLoad 0.3s ease';
            }
          });
        }
      });
    });

    const viewer = document.getElementById('viewer');
    if (viewer) {
      observer.observe(viewer, { childList: true });
    }

    // Add tooltip for zoom percentage
    const scaleSelect = document.getElementById('scaleSelect');
    if (scaleSelect) {
      scaleSelect.addEventListener('change', function () {
        const value = this.value;
        let tooltip = '';
        switch (value) {
          case 'auto': tooltip = 'Automatic Zoom'; break;
          case 'page-actual': tooltip = '100% (Actual Size)'; break;
          case 'page-fit': tooltip = 'Fit to Page'; break;
          case 'page-width': tooltip = 'Fit to Width'; break;
          default: tooltip = value + ' Zoom';
        }
        this.title = tooltip;
      });
    }

    // Enhanced page number input
    const pageNumber = document.getElementById('pageNumber');
    if (pageNumber) {
      // Select all text when focused for easy input
      pageNumber.addEventListener('focus', function () {
        this.select();
      });

      // Add visual feedback for invalid page numbers
      pageNumber.addEventListener('change', function () {
        const numPages = document.getElementById('numPages');
        if (numPages) {
          const maxPages = parseInt(numPages.textContent);
          const currentPage = parseInt(this.value);

          if (currentPage < 1 || currentPage > maxPages) {
            this.style.borderColor = '#f04747';
            this.style.background = 'rgba(240, 71, 71, 0.1)';
            setTimeout(() => {
              this.style.borderColor = '';
              this.style.background = '';
            }, 1000);
          }
        }
      });
    }

    // Add loading state enhancement
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
      const style = document.createElement('style');
      style.textContent = `
        #loadingBar.indeterminate .progress {
          animation: progressIndeterminate 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes progressIndeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }

    const viewerContainer = document.getElementById('viewerContainer');

    // Add current page highlight in sidebar thumbnails
    const thumbnailView = document.getElementById('thumbnailView');
    if (thumbnailView) {
      const highlightCurrentThumbnail = function () {
        const pageNumber = document.getElementById('pageNumber');
        if (pageNumber) {
          const currentPage = parseInt(pageNumber.value);
          const thumbnails = thumbnailView.querySelectorAll('.thumbnail');
          thumbnails.forEach((thumb, index) => {
            if (index + 1 === currentPage) {
              thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          });
        }
      };

      // Update highlight when page changes
      if (pageNumber) {
        const pageObserver = new MutationObserver(highlightCurrentThumbnail);
        pageObserver.observe(pageNumber, { attributes: true, attributeFilter: ['value'] });
      }
    }

    // Add progress indicator for large PDFs
    let totalPages = 0;
    const numPagesElement = document.getElementById('numPages');
    if (numPagesElement) {
      const numPagesObserver = new MutationObserver(function (mutations) {
        const numPages = parseInt(numPagesElement.textContent);
        if (numPages > 0 && totalPages !== numPages) {
          totalPages = numPages;
          console.log(`FireDoc: Loaded PDF with ${totalPages} pages`);

          // Show notification for large PDFs
          if (totalPages > 100) {
            showNotification(`Large PDF loaded: ${totalPages} pages`);
          }
        }
      });
      numPagesObserver.observe(numPagesElement, { childList: true, characterData: true, subtree: true });
    }

    // Notification system
    function showNotification(message, duration = 3000) {
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(88, 101, 242, 0.4);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease ${duration - 300}ms forwards;
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.remove();
        style.remove();
      }, duration);
    }

    // Let PDF.js handle mouse wheel zoom with its original implementation
    if (viewerContainer) {
      // No custom zoom handler needed
      console.log('Using PDF.js native zoom controls');
    }

    // Add document title from PDF metadata
    window.addEventListener('documentloaded', function () {
      setTimeout(() => {
        const title = document.title;
        if (title && title !== 'PDF.js viewer') {
          console.log(`FireDoc: "${title}"`);
        }
      }, 500);
    });

    // Enhanced print button
    const printButton = document.getElementById('printButton');
    if (printButton) {
      printButton.addEventListener('click', function () {
        showNotification('Preparing document for printing...');
      });
    }

    const secondaryDownload = document.getElementById('secondaryDownload');
    if (secondaryDownload) {
      secondaryDownload.addEventListener('click', async function (e) {
        e.preventDefault();
        e.stopPropagation();

        try {
          if (!window.PDFViewerApplication || !window.PDFViewerApplication.pdfDocument) {
            showNotification('Document not ready.');
            return;
          }

          showNotification('Preparing to save...');

          // 1. Get PDF data (with annotations)
          const doc = window.PDFViewerApplication.pdfDocument;
          const data = await doc.saveDocument(); // Returns Uint8Array

          // 2. Open Save Dialog and Write File via custom command
          if (window.__TAURI__) {
            const suggestedName = document.title.endsWith('.pdf') ? document.title : document.title + '.pdf';
            const savePath = await (window.__TAURI__.core?.invoke || window.__TAURI__.invoke)('save_pdf', {
              filename: suggestedName,
              data: Array.from(data)
            });

            if (savePath) {
              showNotification('File saved successfully!');
              console.log('File saved to:', savePath);
            }
          } else {
            console.warn('Tauri API not found, falling back to default download.');
            alert('Tauri API not found. Cannot save natively.');
          }
        } catch (err) {
          console.error('Save Error:', err);
          showNotification('Error saving file: ' + err.message);
        }
      }, { capture: true });
    }

    // Enhanced Print (Secondary)
    const secondaryPrint = document.getElementById('secondaryPrint');
    if (secondaryPrint) {
      secondaryPrint.addEventListener('click', function () {
        showNotification('Preparing to print...');
      });
    }

    // --- Right-Click Pan Support (Global Hand Tool) ---
    if (viewerContainer) {
      let isRightPanning = false;
      let panStartX = 0;
      let panStartY = 0;
      let panStartScrollLeft = 0;
      let panStartScrollTop = 0;
      let hasDragged = false;
      const DEADZONE = 5;

      viewerContainer.addEventListener('mousedown', function (e) {
        if (e.button === 2) { // Right Click
          isRightPanning = true;
          hasDragged = false;
          panStartX = e.clientX;
          panStartY = e.clientY;
          panStartScrollLeft = viewerContainer.scrollLeft;
          panStartScrollTop = viewerContainer.scrollTop;
        }
      });

      window.addEventListener('mousemove', function (e) {
        if (!isRightPanning) return;

        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;

        if (!hasDragged && (Math.abs(dx) > DEADZONE || Math.abs(dy) > DEADZONE)) {
          hasDragged = true;
          viewerContainer.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
        }

        if (hasDragged) {
          viewerContainer.scrollLeft = panStartScrollLeft - dx;
          viewerContainer.scrollTop = panStartScrollTop - dy;
          e.preventDefault();
        }
      });

      window.addEventListener('mouseup', function (e) {
        if (isRightPanning && e.button === 2) {
          isRightPanning = false;
          viewerContainer.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });

      document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
    }

    // Hide loading bar immediately when document initializes (first page ready)
    // OR force hide after 3 seconds max (user request)
    const hideLoadingBar = () => {
      const loadingBar = document.getElementById('loadingBar');
      if (loadingBar) {
        loadingBar.style.opacity = '0';
        setTimeout(() => {
          loadingBar.style.setProperty('display', 'none', 'important');
        }, 500);
      }
    };

    const addCustomWheelZoom = () => {
      const viewerContainer = document.getElementById('viewerContainer');
      if (!viewerContainer) return;

      let rafId = null;
      let accumulatedTicks = 1;
      let lastOrigin = [0, 0];

      viewerContainer.addEventListener('wheel', function (e) {
        // Only trigger if Ctrl or Meta is held
        if (!e.ctrlKey && !e.metaKey) return;

        e.preventDefault();
        e.stopPropagation();

        if (!window.PDFViewerApplication || !window.PDFViewerApplication.pdfViewer) return;

        const delta = -e.deltaY;
        const SENSITIVITY = 0.002;
        let zoomFactor = Math.exp(delta * SENSITIVITY);
        let change = zoomFactor - 1;

        const MAX_STEP = 0.20;
        const MIN_STEP = 0.01;

        if (Math.abs(change) > MAX_STEP) {
          change = Math.sign(change) * MAX_STEP;
        } else if (Math.abs(change) < MIN_STEP && Math.abs(change) > 0) {
          change = Math.sign(change) * MIN_STEP;
        }

        // Accumulate effect
        accumulatedTicks *= (1 + change);
        lastOrigin = [e.clientX, e.clientY];

        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            if (window.PDFViewerApplication.updateZoom) {
              window.PDFViewerApplication.updateZoom(0, accumulatedTicks, lastOrigin);
            } else {
              const currentScale = window.PDFViewerApplication.pdfViewer.currentScale;
              window.PDFViewerApplication.pdfViewer.currentScaleValue = currentScale * accumulatedTicks;
            }
            accumulatedTicks = 1;
            rafId = null;
          });
        }
      }, {
        passive: false,
        capture: true
      }); // Capture phase to intercept before PDF.js

      console.log('Custom tiny-step zoom enabled (Ctrl+Wheel)');
    };

    // --- Intelligent Menu Positioning (Overflow Prevention) ---
    const setupIntelligentMenus = () => {
      const adjustMenuPosition = (menu) => {
        if (menu.classList.contains('hidden')) return;

        // Reset offset first to get natural position
        menu.style.marginLeft = '';

        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const padding = 20;

        let offset = 0;
        if (rect.right > viewportWidth - padding) {
          offset = viewportWidth - padding - rect.right;
        } else if (rect.left < padding) {
          offset = padding - rect.left;
        }

        if (offset !== 0) {
          menu.style.marginLeft = `${offset}px`;
        }
      };

      const menuObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.classList.contains('doorHangerRight') || target.classList.contains('editorParamsToolbar')) {
              // Internal delay to allow layout to settle
              setTimeout(() => adjustMenuPosition(target), 0);
            }
          }
        });
      });

      // Watch all menus with .doorHangerRight or .editorParamsToolbar
      document.querySelectorAll('.doorHangerRight, .editorParamsToolbar').forEach(menu => {
        menuObserver.observe(menu, { attributes: true, attributeFilter: ['class'] });
      });

      // Also adjust on window resize
      window.addEventListener('resize', () => {
        document.querySelectorAll('.doorHangerRight:not(.hidden), .editorParamsToolbar:not(.hidden)').forEach(adjustMenuPosition);
      });

      console.log('Intelligent menus initialized');
    };

    setupIntelligentMenus();

    // --- Custom Zoom UI Logic ---
    const setupCustomZoom = () => {
      const customButton = document.getElementById('customZoomButton');
      const customMenu = document.getElementById('customZoomMenu');
      const customValue = document.getElementById('customZoomValue');
      const nativeSelect = document.getElementById('scaleSelect');

      if (!customButton || !customMenu || !nativeSelect) return;

      // 1. Toggle Menu
      customButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = customMenu.classList.toggle('hidden');
        if (!isHidden) {
          // Close other menus
          document.querySelectorAll('.menu:not(#customZoomMenu)').forEach(m => m.classList.add('hidden'));
        }
      });

      // 2. Sync Native Select -> Custom Button
      const updateCustomValue = () => {
        let text = "";
        const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];

        if (selectedOption) {
          text = selectedOption.textContent.trim();
        }

        // Fallback: If text is empty (e.g. not localized yet) or no selection
        if (!text || nativeSelect.selectedIndex === -1) {
          // Check if we have a value we can show
          if (nativeSelect.value && nativeSelect.value !== "custom") {
            // Try to find matching option by value
            for (const opt of nativeSelect.options) {
              if (opt.value === nativeSelect.value) {
                text = opt.textContent.trim();
                break;
              }
            }
          }
        }

        if (text) {
          customValue.textContent = text;
        } else {
          // Default fallback
          customValue.textContent = "Auto";
        }
      };

      nativeSelect.addEventListener('change', updateCustomValue);
      // Observe both attribute changes (like value/selected) and childList (re-localization)
      const selectObserver = new MutationObserver(updateCustomValue);
      selectObserver.observe(nativeSelect, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['selected', 'value', 'data-l10n-args']
      });

      // Seed initial value
      updateCustomValue();

      // 3. Custom Menu Clicks -> Native Select
      customMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-value]');
        if (btn) {
          const val = btn.getAttribute('data-value');
          nativeSelect.value = val;
          nativeSelect.dispatchEvent(new Event('change'));
          customMenu.classList.add('hidden');
        }
      });

      // 4. Close on outside click
      document.addEventListener('click', (e) => {
        if (!customButton.contains(e.target) && !customMenu.contains(e.target)) {
          customMenu.classList.add('hidden');
        }
      });

      console.log('Custom zoom UI initialized');
    };

    setupCustomZoom();

    const setupInkRestriction = () => {
      const viewerContainer = document.getElementById('viewerContainer');
      if (!viewerContainer) return;

      let currentMode = 0; // NONE
      let currentTool = 0; // SELECT

      const updateInk = () => {
        // We only enable selection if mode is 0 (Pointer/Select) AND tool is 0 (Select tool)
        // If mode !== 0, we are in an editor tool (Ink, Text, etc.)
        // If tool !== 0, we are in Hand or Zoom tool.
        if (currentMode !== 0 || currentTool !== 0) {
          viewerContainer.classList.add('disable-ink-selection');
        } else {
          viewerContainer.classList.remove('disable-ink-selection');
        }
      };

      // Listen for changes
      const checkAppAndListen = setInterval(() => {
        if (window.PDFViewerApplication && window.PDFViewerApplication.eventBus) {
          clearInterval(checkAppAndListen);

          window.PDFViewerApplication.eventBus.on('annotationeditormodechanged', (e) => {
            currentMode = e.mode;
            updateInk();
          });

          window.PDFViewerApplication.eventBus.on('cursortoolchanged', (e) => {
            currentTool = e.tool;
            updateInk();
          });

          // Initialize
          // We can try to get actual values
          if (window.PDFViewerApplication.pdfViewer) {
            currentMode = window.PDFViewerApplication.pdfViewer.annotationEditorMode;
          }
          if (window.PDFViewerApplication.pdfCursorTools) {
            currentTool = window.PDFViewerApplication.pdfCursorTools.tool;
          }
          updateInk();

          console.log('Ink selection restriction initialized');
        }
      }, 100);
    };

    setupInkRestriction();

    // Initialize custom zoom
    addCustomWheelZoom();

    console.log('FireDoc: Enhanced PDF viewer loaded successfully');
    console.log('Custom keyboard shortcuts:');
    console.log('  - Ctrl/Cmd + 0: Fit to width');
    console.log('  - Ctrl/Cmd + 1: Actual size');
    console.log('  - Ctrl/Cmd + 2: Fit to page');
    console.log('  - Home: First page');
    console.log('  - End: Last page');
    console.log('  - F: Toggle search');
    console.log('  - Double-click: Toggle fit modes');
    console.log('  - (Standard PDF.js controls also available)');
  }; // End of initEnhancements

  // Check document readiness
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancements);
  } else {
    initEnhancements();
  }

})();
