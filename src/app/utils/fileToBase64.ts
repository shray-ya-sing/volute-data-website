/**
 * Converts a File object to a base64 data URI string.
 * If the image is WebP, converts it to PNG.
 * e.g. "data:image/png;base64,iVBORw0KGgo..."
 */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      
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
): Promise<{ data: string }[]> {
  const results = await Promise.all(
    attachments.map(async (att) => {
      let dataUri: string;
      
      // If already a data URI, use it directly
      if (att.url.startsWith("data:")) {
        dataUri = att.url;
      } else {
        // Otherwise fetch the blob URL and convert
        const response = await fetch(att.url);
        const blob = await response.blob();
        dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
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
  return results.map((dataUri) => ({ data: dataUri }));
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