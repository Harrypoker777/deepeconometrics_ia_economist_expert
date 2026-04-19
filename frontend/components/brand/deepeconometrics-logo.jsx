import Image from 'next/image';

export function DeepEconometricsLogo({ className = 'h-16 w-auto' }) {
  return (
    <Image
      src="/logo_deepeconometrics.png"
      alt="DeepEconometrics logo"
      width={2000}
      height={2000}
      priority
      className={className}
    />
  );
}
