import Image from 'next/image';

type Props = {
  className?: string;
  alt?: string;
  size?: number;
};

export function Logo({ className, alt = 'Bookmark Assistant', size = 40 }: Props) {
  return (
    <Image
      src="/brand/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
