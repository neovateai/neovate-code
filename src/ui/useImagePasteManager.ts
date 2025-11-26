import { useCallback, useRef } from 'react';
import { useAppStore } from './store';

export interface ImagePasteResult {
  success: boolean;
  error?: string;
  imageId?: string;
}

// Helper function to get image dimensions from base64 data
// In Node.js environment, we'll extract dimensions from image headers when possible
function getImageDimensions(
  base64Data: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const dimensions = extractImageDimensionsFromBuffer(buffer);
      resolve(dimensions);
    } catch (error) {
      // Default dimensions if unable to get actual size
      resolve({ width: 100, height: 100 });
    }
  });
}

// Extract dimensions from image buffer headers
function extractImageDimensionsFromBuffer(buffer: Buffer): {
  width: number;
  height: number;
} {
  if (buffer.length < 24) {
    return { width: 100, height: 100 };
  }

  // PNG file header: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    // PNG IHDR chunk starts at byte 16
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // JPEG file header: FF D8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    // Scan for SOF0 (Start of Frame) marker: FF C0
    for (let i = 2; i < buffer.length - 8; i++) {
      if (buffer[i] === 0xff && buffer[i + 1] === 0xc0) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
    }
  }

  // GIF file header: 47 49 46 38 (GIF8)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { width, height };
  }

  // WebP file header: RIFF...WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    // Simple WebP format
    if (
      buffer[12] === 0x56 &&
      buffer[13] === 0x50 &&
      buffer[14] === 0x38 &&
      buffer[15] === 0x20
    ) {
      const width = buffer.readUInt16LE(26) + 1;
      const height = buffer.readUInt16LE(28) + 1;
      return { width, height };
    }
  }

  // Default dimensions if format not recognized
  return { width: 100, height: 100 };
}

// Helper function to truncate filename with middle ellipsis if too long
function truncateFilename(filename: string, maxLength: number = 20): string {
  if (filename.length <= maxLength) {
    return filename;
  }

  const extension = filename.split('.').pop() || '';
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));

  if (extension.length >= maxLength - 3) {
    // If extension is too long, just truncate the whole thing
    return filename.substring(0, maxLength - 3) + '...';
  }

  const availableLength = maxLength - extension.length - 4; // 4 for '...' and '.'
  const prefixLength = Math.ceil(availableLength / 2);
  const suffixLength = Math.floor(availableLength / 2);

  return (
    nameWithoutExt.substring(0, prefixLength) +
    '...' +
    nameWithoutExt.substring(nameWithoutExt.length - suffixLength) +
    '.' +
    extension
  );
}

// Helper function to generate pasted image prompt with dimensions and filename
function getPastedImagePrompt(
  imageId: string,
  width: number,
  height: number,
  filename?: string,
): string {
  const displayFilename = filename ? truncateFilename(filename) : 'image.png';
  // Include the ID as a data attribute for mapping purposes
  return `[Image ${width}X${height} ${displayFilename}${imageId}]`;
}

export function useImagePasteManager() {
  const { pastedImageMap, setPastedImageMap } = useAppStore();
  const imageCounterRef = useRef(0);

  const generateImageId = useCallback((): string => {
    return `#${++imageCounterRef.current}`;
  }, []);

  const handleImagePaste = useCallback(
    async (
      base64Data: string,
      filename?: string,
    ): Promise<ImagePasteResult & { prompt?: string }> => {
      try {
        // Validate base64 data
        if (!base64Data || !base64Data.trim()) {
          return { success: false, error: 'Empty image data' };
        }

        // Generate unique ID for this image
        const imageId = generateImageId();

        // Get image dimensions
        const dimensions = await getImageDimensions(base64Data);

        // Store the full image data
        await setPastedImageMap({
          ...pastedImageMap,
          [imageId]: base64Data,
        });

        // Generate the prompt placeholder with dimensions and filename
        const prompt = getPastedImagePrompt(
          imageId,
          dimensions.width,
          dimensions.height,
          filename,
        );

        return {
          success: true,
          imageId,
          prompt,
        };
      } catch (error) {
        console.error('Failed to handle image paste:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [generateImageId, pastedImageMap, setPastedImageMap],
  );

  const getPastedImage = useCallback(
    (imageId: string): string | undefined => {
      return pastedImageMap[imageId];
    },
    [pastedImageMap],
  );

  const clearPastedImage = useCallback(
    async (imageId: string) => {
      const newMap = { ...pastedImageMap };
      delete newMap[imageId];
      await setPastedImageMap(newMap);
    },
    [pastedImageMap, setPastedImageMap],
  );

  const clearAllPastedImages = useCallback(async () => {
    await setPastedImageMap({});
  }, [setPastedImageMap]);

  // Extract pasted image references from a message
  const extractImageReferences = useCallback((message: string): string[] => {
    const regex = /\[Image \d+X\d+ [^\]]+#\d+\]/g;
    const matches = [...message.matchAll(regex)];
    return matches.map((match) => {
      // Extract the image ID from the placeholder
      const placeholder = match[0];
      const idMatch = placeholder.match(/#(\d+)\]$/);
      return idMatch ? `#${idMatch[1]}` : placeholder;
    });
  }, []);

  // Replace image placeholders with actual base64 data and return images array
  const expandImageReferences = useCallback(
    (message: string): { expandedMessage: string; images: string[] } => {
      let expandedMessage = message;
      const images: string[] = [];
      const references = extractImageReferences(message);

      for (const imageId of references) {
        const imageData = getPastedImage(imageId);
        if (imageData) {
          images.push(imageData);
          // Remove the placeholder from the message by finding and replacing it
          const placeholderRegex = new RegExp(
            `\\[Image \\d+X\\d+ [^\\]]+${imageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
            'g',
          );
          expandedMessage = expandedMessage
            .replace(placeholderRegex, '')
            .trim();
        }
      }

      return { expandedMessage, images };
    },
    [extractImageReferences, getPastedImage],
  );

  return {
    pastedImageMap,
    handleImagePaste,
    getPastedImage,
    clearPastedImage,
    clearAllPastedImages,
    extractImageReferences,
    expandImageReferences,
  };
}
