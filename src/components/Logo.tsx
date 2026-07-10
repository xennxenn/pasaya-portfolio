import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

export default function Logo({ 
  className = '', 
  size = 40, 
  color = '#000000', 
  bgColor = '#ffffff' 
}: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('pasaya_app_logo_url');
  });

  useEffect(() => {
    // Poll local storage to update real-time across tabs or components
    const interval = setInterval(() => {
      const current = localStorage.getItem('pasaya_app_logo_url');
      if (current !== logoUrl) {
        setLogoUrl(current);
      }
    }, 1000);

    const handleStorageChange = () => {
      setLogoUrl(localStorage.getItem('pasaya_app_logo_url'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [logoUrl]);

  if (logoUrl) {
    return (
      <div 
        className={`${className} flex items-center justify-center overflow-hidden select-none transition-all duration-300`}
        style={{ 
          width: size, 
          height: size, 
          backgroundColor: bgColor || 'transparent',
          borderRadius: '8px'
        }}
      >
        <img 
          src={logoUrl} 
          alt="PASAYA Custom Logo" 
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none transition-all duration-300`}
    >
      {/* Background (Optional but matches original design) */}
      {bgColor && <rect width="500" height="500" fill={bgColor} rx="24" />}
      
      {/* Outer Square Border */}
      <rect 
        x="55" 
        y="55" 
        width="390" 
        height="390" 
        rx="2" 
        stroke={color} 
        strokeWidth="11" 
      />
      
      {/* Inner Square Border */}
      <rect 
        x="71" 
        y="71" 
        width="358" 
        height="358" 
        rx="1" 
        stroke={color} 
        strokeWidth="3" 
      />
      
      {/* PASAYA text - tall, high-contrast, elegant serif */}
      <text 
        x="250" 
        y="245" 
        textAnchor="middle" 
        fill={color} 
        style={{
          fontFamily: "'Playfair Display', 'Didot', 'Georgia', 'Times New Roman', serif",
          fontSize: "112px",
          fontWeight: "400",
          letterSpacing: "2px"
        }}
      >
        PASAYA
      </text>
      
      {/* CURTAIN text - clean sans-serif */}
      <text 
        x="250" 
        y="325" 
        textAnchor="middle" 
        fill={color} 
        style={{
          fontFamily: "'Inter', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif",
          fontSize: "48px",
          fontWeight: "800",
          letterSpacing: "6px"
        }}
      >
        CURTAIN
      </text>

      {/* CENTER text - clean, wide-spaced sans-serif */}
      <text 
        x="250" 
        y="382" 
        textAnchor="middle" 
        fill={color} 
        style={{
          fontFamily: "'Inter', 'Montserrat', 'Helvetica Neue', 'Arial', sans-serif",
          fontSize: "36px",
          fontWeight: "600",
          letterSpacing: "18px"
        }}
      >
        CENTER
      </text>
    </svg>
  );
}
