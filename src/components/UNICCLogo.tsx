interface UNICCLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'white' | 'blue';
}

export const UNICCLogo = ({
  className = '',
  size = 'md',
  variant = 'white',
}: UNICCLogoProps) => {
  const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  // Use your new assets instead of the deleted lovable-uploads paths
  const logoSrc =
    variant === 'blue'
      ? '/assets/favicon_unicc.jpg' // blue-background version
      : '/assets/unicc_logo.jpg';   // default logo

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img
        src={logoSrc}
        alt="UNICC Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
};
