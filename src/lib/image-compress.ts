export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
}

function fileToDataUrlFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Gagal membaca file gambar."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        close: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal memuat gambar untuk kompresi."));
    };
    img.src = objectUrl;
  });
}

export async function compressImageToDataUrl(
  file: File,
  options: CompressImageOptions = {},
): Promise<{ dataUrl: string; mimeType: string }> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;

  let source: {
    width: number;
    height: number;
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
    close: () => void;
  };

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      source = {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        close: () => bitmap.close(),
      };
    } catch {
      source = await loadHtmlImage(file);
    }
  } else {
    source = await loadHtmlImage(file);
  }

  try {
    const largest = Math.max(source.width, source.height);
    const scale = largest > maxDimension ? maxDimension / largest : 1;
    const targetW = Math.max(1, Math.round(source.width * scale));
    const targetH = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { dataUrl: await fileToDataUrlFallback(file), mimeType: file.type };
    }

    source.draw(ctx, targetW, targetH);

    const webpUrl = canvas.toDataURL("image/webp", quality);
    if (webpUrl.startsWith("data:image/webp")) {
      return { dataUrl: webpUrl, mimeType: "image/webp" };
    }

    const jpegUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl: jpegUrl, mimeType: "image/jpeg" };
  } finally {
    source.close();
  }
}
