export async function imageUrlToBase64(url: string) {
  return new Promise<string>((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Get canvas 2d context failed.');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const base64String = canvas.toDataURL('image/png');
      resolve(base64String);
    };

    img.onerror = (e) => {
      console.error('Load image to canvas failed.', e);
    };
  });
}
