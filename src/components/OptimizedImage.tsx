'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  alt: string;
}

export default function OptimizedImage({
  src,
  fallbackSrc = '/placeholder-image.png',
  alt,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  // If the source is empty or errored, use the fallback
  const imageSrc = error || !src ? fallbackSrc : src;

  // Some external URLs might not have protocol, ensure https
  const secureSrc = imageSrc.startsWith('http://') 
    ? imageSrc.replace('http://', 'https://')
    : imageSrc.startsWith('//') 
      ? `https:${imageSrc}` 
      : imageSrc;

  return (
    <Image
      src={secureSrc}
      alt={alt}
      onError={() => setError(true)}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
