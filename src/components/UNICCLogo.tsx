interface UNICCLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'white' | 'blue';
}

export const UNICCLogo = ({
  className = '',
  size = 'md',
}: UNICCLogoProps) => {
  const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  // Always use the new clean PNG logo
  const logoSrc = '/assets/UNICC_logo.png';

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
