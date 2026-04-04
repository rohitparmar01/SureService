import React from 'react';

const PremiumBadge = ({ children, icon: Icon, variant = 'gold', className = '' }) => {
  const variants = {
    gold: 'bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] text-[#1f3c5d] border-[#c9d9ec]'
  };

  return (
    <div
      className={[
        'inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold shadow-sm',
        variants[variant] || variants.gold,
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      <span>{children}</span>
    </div>
  );
};

export default PremiumBadge;
