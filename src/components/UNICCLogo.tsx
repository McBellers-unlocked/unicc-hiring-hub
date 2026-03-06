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

  // UNIQTalent logo
  const logoSrc = '/assets/uniqtalent_logo.png';

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img
        src={logoSrc}
        alt="UNIQTalent Logo"
        className="w-full h-full object-contain drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]"
      />
    </div>
  );
};
