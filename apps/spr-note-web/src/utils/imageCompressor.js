/**
 * Pre-Upload Client-side Image Compressor Utility
 * Reduces 5-10MB mobile phone camera photos down to ~150-250KB WebP/JPEG
 * drastically saving network bandwidth, RAM, and server storage.
 */

export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    minSizeToCompress = 250 * 1024, // 250 KB
    outputType = "image/jpeg",
  } = options;

  if (!file || !(file instanceof File)) {
    return file;
  }

  // Only compress image files (skip PDFs, DOCs, TXT, etc.)
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip tiny images already smaller than threshold
  if (file.size < minSizeToCompress) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaled dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file); // Fallback to original
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed size is somehow larger or failed, return original
              return resolve(file);
            }

            const fileName = file.name.replace(/\.[^/.]+$/, ".jpg");
            const compressedFile = new File([blob], fileName, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
