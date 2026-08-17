// Utilities for compressing and optimizing images before storage or Firestore transmission

export async function comprimirImagemParaArmazenamento(
  origem: File | Blob | string,
  maxDimensao: number = 480,
  qualidade: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's an external http/https URL and not a large data URL, return as-is
    if (typeof origem === 'string' && (origem.startsWith('http://') || origem.startsWith('https://'))) {
      resolve(origem);
      return;
    }

    if (!origem) {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const onImageLoaded = () => {
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          resolve(typeof origem === 'string' ? origem : '');
          return;
        }

        // Calculate new dimensions preserving aspect ratio
        if (width > height) {
          if (width > maxDimensao) {
            height = Math.round((height * maxDimensao) / width);
            width = maxDimensao;
          }
        } else {
          if (height > maxDimensao) {
            width = Math.round((width * maxDimensao) / height);
            height = maxDimensao;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(typeof origem === 'string' ? origem : '');
          return;
        }

        // Clean white background for transparency handling in jpeg
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', qualidade);
        resolve(compressedBase64);
      } catch (err) {
        console.warn('Erro durante compressão em canvas:', err);
        resolve(typeof origem === 'string' ? origem : '');
      }
    };

    img.onload = onImageLoaded;
    img.onerror = () => {
      resolve(typeof origem === 'string' ? origem : '');
    };

    if (typeof origem === 'string') {
      img.src = origem;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo de imagem'));
      };
      reader.readAsDataURL(origem);
    }
  });
}
