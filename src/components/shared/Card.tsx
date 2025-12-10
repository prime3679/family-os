import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle' | 'warm';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

const variantStyles = {
  default: 'bg-surface border border-border',
  elevated: 'bg-surface border border-border shadow-md',
  subtle: 'bg-surface-alt border border-transparent',
  warm: 'bg-gradient-to-br from-surface to-surface-alt border border-border',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  style,
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        transition-calm
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
}

// Sub-components for semantic structure
Card.Header = function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`font-serif text-xl text-text-primary ${className}`}>
      {children}
    </h3>
  );
};

Card.Description = function CardDescription({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-1 text-text-secondary ${className}`}>
      {children}
    </p>
  );
};

Card.Content = function CardContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
};

Card.Footer = function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mt-6 pt-4 border-t border-border ${className}`}>
      {children}
    </div>
  );
};
