interface UNICCLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'white' | 'blue';
}

export const UNICCLogo = ({ className = '', size = 'md', variant = 'white' }: UNICCLogoProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  const logoSrc = variant === 'blue' 
    ? "/lovable-uploads/ef4b71f6-878c-4e97-9492-f1c5b7fdc8ed.png"
    : "/lovable-uploads/9b1ff971-59a4-4a4f-b3ce-b52733146abe.png";

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