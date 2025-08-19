export interface ThemeImageProps {
  lightImage: string;
  darkImage: string;
  mobileLightImage: string;
  mobileDarkImage: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  mobileBreakpoint?: number;
  width?: number;
  height?: number;
  fill?: boolean;
}
