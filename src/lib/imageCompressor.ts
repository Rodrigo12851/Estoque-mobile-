// Utilities for compressing and optimizing images before storage or Firestore transmission

/**
 * Calculates estimated size of image string in Kilobytes (KB)
 */
export function calcularTamanhoImagemKB(origem: string): number {
  if (!origem) return 0;
  if (origem.startsWith('http://') || origem.startsWith('https://')) {
    return 1; // External URL reference occupies negligible database bytes
  }
  if (origem.startsWith('data:')) {
    const base64Data = origem.split(',')[1] || '';
    const bytes = (base64Data.length * 3) / 4;
    return Math.round((bytes / 1024) * 10) / 10;
  }
  return Math.round((origem.length / 1024) * 10) / 10;
}

/**
 * Compresses an image (File, Blob, base64 DataURL or Image URL) to the minimal possible size
 * for ultra-efficient database storage (Firestore & LocalStorage) while maintaining sharp visual quality
 * for mobile, tablet and desktop displays.
 * 
 * @param origem File, Blob, base64 or URL
 * @param maxDimensao Max width or height in pixels (default 300px, optimal for product thumbnails)
 * @param qualidade Compression quality factor (0.65 to 0.70)
 */
export async function comprimirImagemParaArmazenamento(
  origem: File | Blob | string,
  maxDimensao: number = 300,
  qualidade: number = 0.68
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!origem) {
      resolve('');
      return;
    }

    // Short external CDN URLs can be kept as-is if they are standard web links
    if (
      typeof origem === 'string' &&
      (origem.startsWith('http://') || origem.startsWith('https://')) &&
      !origem.includes('data:image')
    ) {
      // It's a direct web URL (takes ~100 bytes in database, zero storage overhead)
      resolve(origem);
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

        // Calculate new dimensions preserving aspect ratio strictly
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

        // Enforce minimum dimension constraint to prevent collapse
        width = Math.max(width, 1);
        height = Math.max(height, 1);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          resolve(typeof origem === 'string' ? origem : '');
          return;
        }

        // Smooth image downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Clean white background for transparency handling
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try modern WebP first (ultra lightweight), fallback to JPEG
        let compressedBase64 = '';
        try {
          const webpResult = canvas.toDataURL('image/webp', qualidade);
          if (webpResult && webpResult.startsWith('data:image/webp') && webpResult.length > 50) {
            compressedBase64 = webpResult;
          }
        } catch {
          // WebP not supported in current environment
        }

        if (!compressedBase64) {
          compressedBase64 = canvas.toDataURL('image/jpeg', qualidade);
        }

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
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo de imagem'));
      };
      reader.readAsDataURL(origem);
    }
  });
}

