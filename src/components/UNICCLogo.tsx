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
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="currentColor"
      >
        {/* UN Emblem Circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        
        {/* World Map Projection */}
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          {/* Meridian lines */}
          <path d="M50 10 Q75 30 75 50 Q75 70 50 90 Q25 70 25 50 Q25 30 50 10" />
          <path d="M50 10 Q60 25 65 50 Q60 75 50 90" />
          <path d="M50 10 Q40 25 35 50 Q40 75 50 90" />
          
          {/* Latitude lines */}
          <ellipse cx="50" cy="30" rx="20" ry="5" />
          <ellipse cx="50" cy="50" rx="25" ry="6" />
          <ellipse cx="50" cy="70" rx="20" ry="5" />
          
          {/* Continental outlines simplified */}
          <path d="M30 35 Q40 30 50 35 Q60 30 70 35" />
          <path d="M35 45 Q45 40 55 45 Q65 40 65 50" />
          <path d="M30 55 Q40 60 50 55 Q60 60 70 55" />
        </g>
        
        {/* Olive branches */}
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          {/* Left branch */}
          <path d="M15 60 Q20 65 25 70 Q30 75 25 80" />
          <path d="M18 62 L22 65 M20 67 L24 70 M22 72 L26 75" />
          
          {/* Right branch */}
          <path d="M85 60 Q80 65 75 70 Q70 75 75 80" />
          <path d="M82 62 L78 65 M80 67 L76 70 M78 72 L74 75" />
        </g>
      </svg>
    </div>
  );
};