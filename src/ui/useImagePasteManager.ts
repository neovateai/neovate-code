import { useCallback, useRef } from 'react';
import { useAppStore } from './store';

export interface ImagePasteResult {
  success: boolean;
  error?: string;
  imageId?: string;
}

// Helper function to generate pasted image prompt with unique ID
function getPastedImagePrompt(imageId: string): string {
  return `[Image ${imageId}]`;
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
    ): Promise<ImagePasteResult & { prompt?: string }> => {
      try {
        // Validate base64 data
        if (!base64Data || !base64Data.trim()) {
          return { success: false, error: 'Empty image data' };
        }

        // Generate unique ID for this image
        const imageId = generateImageId();

        // Store the full image data
        await setPastedImageMap({
          ...pastedImageMap,
          [imageId]: base64Data,
        });

        // Generate the prompt placeholder
        const prompt = getPastedImagePrompt(imageId);

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
    const regex = /\[Image (#\d+)\]/g;
    const matches = [...message.matchAll(regex)];
    return matches.map((match) => match[1]);
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
          // Remove the placeholder from the message
          const placeholder = new RegExp(
            `\\[Image ${imageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
            'g',
          );
          expandedMessage = expandedMessage.replace(placeholder, '').trim();
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
