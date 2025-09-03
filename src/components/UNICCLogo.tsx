interface UNICCLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UNICCLogo = ({ className = '', size = 'md' }: UNICCLogoProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img 
        src="/lovable-uploads/9b1ff971-59a4-4a4f-b3ce-b52733146abe.png"
        alt="UNICC Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
};