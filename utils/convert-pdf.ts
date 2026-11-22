export type PdfImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp';

export type PdfConversionResult = {
  url: string;
  output: string;
};

export async function convertPdfToImage(
  file: File,
  format: PdfImageFormat,
): Promise<PdfConversionResult> {
  if (typeof window === 'undefined') {
    throw new Error('PDF conversion is only available in the browser');
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  if (pdf.numPages < 1) {
    throw new Error('The PDF contains no pages');
  }

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas rendering is not supported');
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;

  const mimeType =
    format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result
        ? resolve(result)
        : reject(new Error('Failed to render the PDF page')),
      mimeType,
      0.95,
    );
  });

  const baseName = file.name.replace(/\.pdf$/i, '');
  const extension = format === 'jpeg' ? 'jpg' : format;
  const output = `${baseName}.${extension}`;
  page.cleanup();

  return {
    url: URL.createObjectURL(blob),
    output,
  };
}
