/**
 * Normalizes non-standard MIME types in data URIs.
 * e.g. "data:image/jpg;base64,..." → "data:image/jpeg;base64,..."
 */
function normalizeDataUri(dataUri: string): string {
  if (dataUri.startsWith("data:image/jpg")) {
    return dataUri.replace("data:image/jpg", "data:image/jpeg");
  }
  return dataUri;
}

/**
 * Detects the actual image format from base64 data by inspecting magic bytes,
 * and corrects the data URI MIME type if it doesn't match.
 */
function correctMimeType(dataUri: string): string {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUri;

  const [, declaredMime, b64] = match;

  // Decode the first few bytes to check magic numbers
  try {
    const binaryStr = atob(b64.slice(0, 16)); // only need first few bytes
    const bytes = Array.from(binaryStr, (c) => c.charCodeAt(0));

    let actualMime: string | null = null;

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      actualMime = "image/png";
    }
    // JPEG: FF D8 FF
    else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      actualMime = "image/jpeg";
    }
    // WebP: 52 49 46 46 ... 57 45 42 50
    else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
             bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      actualMime = "image/webp";
    }

    if (actualMime && actualMime !== declaredMime) {
      console.warn(`[fileToBase64] MIME mismatch: declared ${declaredMime}, actual ${actualMime} — correcting`);
      return `data:${actualMime};base64,${b64}`;
    }
  } catch {
    // If decoding fails, return as-is
  }

  return dataUri;
}

/**
 * Converts a File object to a base64 data URI string.
 * If the image is WebP, converts it to PNG.
 * e.g. "data:image/png;base64,iVBORw0KGgo..."
 */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      let dataUri = normalizeDataUri(reader.result as string);
      dataUri = correctMimeType(dataUri);
      
      // Check if the actual image data is WebP (regardless of file.type)
      if (dataUri.startsWith("data:image/webp")) {
        try {
          // Convert WebP to PNG using canvas
          const convertedDataUri = await convertWebPToPNG(dataUri);
          resolve(convertedDataUri);
        } catch (err) {
          reject(new Error(`Failed to convert WebP image: ${file.name}`));
        }
      } else if (dataUri.startsWith("data:image/png") || dataUri.startsWith("data:image/jpeg")) {
        resolve(dataUri);
      } else {
        reject(new Error(`Unsupported image format: ${file.name}. Please use PNG or JPEG.`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts AttachmentPreview objects (with blob URLs or data URIs) into API image format.
 * If the URL is already a data URI, uses it directly. Otherwise fetches the blob URL.
 * WebP images are automatically converted to PNG.
 */
export async function attachmentPreviewsToApiImages(
  attachments: { url: string; type: string }[]
): Promise<{ data: string; mediaType: string }[]> {
  const results = await Promise.all(
    attachments.map(async (att) => {
      let dataUri: string;
      
      // If already a data URI, use it directly
      if (att.url.startsWith("data:")) {
        dataUri = normalizeDataUri(att.url);
        dataUri = correctMimeType(dataUri);
      } else {
        // Otherwise fetch the blob URL and convert
        const response = await fetch(att.url);
        const blob = await response.blob();
        dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            let normalizedUri = normalizeDataUri(reader.result as string);
            normalizedUri = correctMimeType(normalizedUri);
            resolve(normalizedUri);
          };
          reader.onerror = () => reject(new Error("Failed to convert attachment"));
          reader.readAsDataURL(blob);
        });
      }
      
      // Convert WebP to PNG if needed
      if (dataUri.startsWith("data:image/webp")) {
        dataUri = await convertWebPToPNG(dataUri);
      } else if (!dataUri.startsWith("data:image/png") && !dataUri.startsWith("data:image/jpeg")) {
        throw new Error("Unsupported image format. Please use PNG or JPEG.");
      }
      
      return dataUri;
    })
  );
  return results.map((dataUri) => {
    // Extract mediaType from the data URI prefix
    const mimeMatch = dataUri.match(/^data:([^;]+);base64,/);
    const mediaType = mimeMatch ? mimeMatch[1] : 'image/png';
    return { data: dataUri, mediaType };
  });
}

/**
 * Converts a WebP data URI to PNG using canvas
 */
function convertWebPToPNG(webpDataUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      // Convert to PNG
      const pngDataUri = canvas.toDataURL("image/png");
      resolve(pngDataUri);
    };
    img.onerror = () => reject(new Error("Failed to load WebP image"));
    img.src = webpDataUri;
  });
}