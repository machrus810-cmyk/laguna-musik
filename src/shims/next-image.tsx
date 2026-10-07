import React from 'react';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean;
  priority?: boolean;
  quality?: number;
}

export default function Image({
  fill,
  priority,
  quality,
  className = '',
  style = {},
  ...props
}: ImageProps) {
  const combinedClassName = fill
    ? `absolute inset-0 w-full h-full object-cover ${className}`
    : className;

  return (
    <img
      className={combinedClassName}
      style={style}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
}
