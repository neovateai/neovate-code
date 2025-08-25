import { useState } from 'react';

// Image placeholder constants and settings
const IMAGE_PLACEHOLDER_PREFIX = '[Image ';
const IMAGE_PLACEHOLDER_SUFFIX = ']';
const MAX_IMAGES = 5;

interface PastedImage {
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
    if (pastedImages.length >= MAX_IMAGES) {
      setImagePasteMessage(`Maximum ${MAX_IMAGES} images allowed`);
      setTimeout(() => setImagePasteMessage(null), 3000);
      return;
    }

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const placeholder = `${IMAGE_PLACEHOLDER_PREFIX}${pastedImages.length + 1}${IMAGE_PLACEHOLDER_SUFFIX}`;

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
    maxImages: MAX_IMAGES,
  };
}
