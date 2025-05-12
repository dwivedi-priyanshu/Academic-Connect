import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showText?: boolean;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl", showText = true }: LogoProps) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-2 ${className}`}>
      <GraduationCap size={iconSize} className="text-primary" />
      {showText && <span className={`font-bold ${textSize} text-primary`}>Academic Connect</span>}
    </Link>
  );
}
