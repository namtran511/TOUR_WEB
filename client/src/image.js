function cleanImageUrl(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function extractImageUrl(image) {
  if (typeof image === 'string') {
    return cleanImageUrl(image);
  }

  if (!image || typeof image !== 'object') {
    return '';
  }

  return cleanImageUrl(image.image_url || image.imageUrl || image.url || image.src);
}

export function resolveImageUrl(source, fallbackImage = '') {
  const fallback = cleanImageUrl(fallbackImage);

  if (!source) {
    return fallback;
  }

  if (typeof source === 'string') {
    return cleanImageUrl(source) || fallback;
  }

  if (typeof source !== 'object') {
    return fallback;
  }

  if (Array.isArray(source.images) && source.images.length > 0) {
    const relationImage = [...source.images]
      .sort((left, right) => Number(Boolean(right?.is_primary)) - Number(Boolean(left?.is_primary)))
      .map(extractImageUrl)
      .find(Boolean);

    if (relationImage) {
      return relationImage;
    }
  }

  return (
    cleanImageUrl(source.image_url)
    || cleanImageUrl(source.imageUrl)
    || cleanImageUrl(source.url)
    || cleanImageUrl(source.src)
    || fallback
  );
}

export function attachImageFallbacks(root = document) {
  if (!root?.querySelectorAll) {
    return;
  }

  root.querySelectorAll('img[data-fallback-src]').forEach((img) => {
    if (img.dataset.fallbackBound === 'true') {
      return;
    }

    img.dataset.fallbackBound = 'true';
    const applyFallback = () => {
      const fallback = cleanImageUrl(img.dataset.fallbackSrc);

      if (!fallback || img.getAttribute('src') === fallback) {
        return;
      }

      img.setAttribute('src', fallback);
    };

    img.addEventListener('error', applyFallback);

    if (img.complete && img.naturalWidth === 0) {
      applyFallback();
    }
  });
}
