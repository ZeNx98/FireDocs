// ESM loader for PDF.js used by homepage preview generation.
// Loads the library and sets up a worker, then exposes `pdfjsLib` globally.

import * as pdfjsLib from './pdfjs/build/pdf.mjs';

// Create a dedicated worker using the ESM worker entry.
const worker = new Worker(new URL('./pdfjs/build/pdf.worker.mjs', import.meta.url), { type: 'module' });
pdfjsLib.GlobalWorkerOptions.workerPort = worker;

// Expose globally for existing homepage code
window.pdfjsLib = pdfjsLib;
