import { useState } from 'react';
import { ERROR_MESSAGES, IMAGE_CONFIG, PASTE_CONFIG } from './constants';

export interface PastedImage {
  id: string;
  base64: string;
  placeholder: string;
}

export function useImagePaste() {
  const [pastedImages, setPastedImages] = useState<PastedImage[]>([]);
  const [imagePasteMessage, setImagePasteMessage] = useState<string | null>(
    null,
  );

  const handleImagePaste = (image: string) => {
    if (pastedImages.length >= IMAGE_CONFIG.MAX_IMAGES) {
      setImagePasteMessage(
        ERROR_MESSAGES.MAX_IMAGES_EXCEEDED(IMAGE_CONFIG.MAX_IMAGES),
      );
      setTimeout(
        () => setImagePasteMessage(null),
        PASTE_CONFIG.IMAGE_PASTE_MESSAGE_TIMEOUT_MS,
      );
      return;
    }

    const imageId = `img_${Date.now()}_${crypto.randomUUID()}`;
    const placeholder = `${IMAGE_CONFIG.PLACEHOLDER_PREFIX}#${pastedImages.length + 1}${IMAGE_CONFIG.PLACEHOLDER_SUFFIX}`;

    setPastedImages((prev) => [
      ...prev,
      { id: imageId, base64: image, placeholder },
    ]);

    return placeholder;
  };

  const clearImages = () => {
    setPastedImages([]);
  };

  const removeImageByPlaceholder = (placeholder: string) => {
    setPastedImages((prev) =>
      prev.filter((img) => img.placeholder !== placeholder),
    );
  };

  const updateImagesFromValue = (value: string) => {
    const updatedImages = pastedImages.filter((img) =>
      value.includes(img.placeholder),
    );
    if (updatedImages.length !== pastedImages.length) {
      setPastedImages(updatedImages);
    }
  };

  const replaceImagePlaceholders = (value: string) => {
    let finalValue = value;
    if (pastedImages.length > 0) {
      pastedImages.forEach(({ placeholder }) => {
        if (finalValue.includes(placeholder)) {
          finalValue = finalValue.replace(placeholder, '').trim();
        }
      });
    }
    return finalValue;
  };

  const getImageData = () => {
    return pastedImages.length > 0
      ? pastedImages.map((img) => img.base64)
      : null;
  };

  const setMessage = (message: string | null) => {
    setImagePasteMessage(message);
  };

  return {
    pastedImages,
    imagePasteMessage,
    handleImagePaste,
    clearImages,
    removeImageByPlaceholder,
    updateImagesFromValue,
    replaceImagePlaceholders,
    getImageData,
    setMessage,
    maxImages: IMAGE_CONFIG.MAX_IMAGES,
  };
}
