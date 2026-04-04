import React from 'react';

const FeatureCard = ({ icon: Icon, title, description, bgVariant = 'white', className = '' }) => {
  const bgClass = bgVariant === 'card' ? 'bg-premium-bgCard' : 'bg-white';

  return (
    <article
      className={[
        'rounded-3xl border border-[var(--premium-border)] px-6 py-7 shadow-premium-sm transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-premium',
        bgClass,
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#eef4ff_0%,#dce9fb_100%)] text-[var(--premium-blue)] shadow-sm">
        {Icon ? <Icon className="h-6 w-6" aria-hidden="true" /> : null}
      </div>

      <h3 className="mb-2 text-xl font-semibold text-premium-text">{title}</h3>
      <p className="text-sm leading-6 text-premium-textSecondary">{description}</p>
    </article>
  );
};

export default FeatureCard;
