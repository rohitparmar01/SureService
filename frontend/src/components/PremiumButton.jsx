import React from 'react';

const PremiumButton = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary:
      'text-white shadow-premium bg-[linear-gradient(120deg,#1b3958_0%,#1f3c5d_52%,#24496f_100%)] hover:brightness-105 hover:-translate-y-0.5',
    secondary:
      'bg-white/92 text-premium-text border border-[var(--premium-border)] shadow-premium-sm hover:border-[#c9d9ec] hover:bg-white'
  };

  return (
    <button
      type="button"
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3c5d]/40',
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] || variantClasses.primary,
        fullWidth ? 'w-full' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span>{children}</span>
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
    </button>
  );
};

export default PremiumButton;
