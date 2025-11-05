"use client";
import Image from "next/image";
import * as React from "react";

export function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = React.useState(false);
  if (error) return <img src={src} alt={alt} className={className} />;
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      className={className}
      onError={() => setError(true)}
    />
  );
}
