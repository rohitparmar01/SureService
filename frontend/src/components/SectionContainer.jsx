import React from 'react';

const SectionContainer = ({
  children,
  id,
  background = 'main',
  padding = 'default',
  className = ''
}) => {
  const backgroundClasses = {
    main: 'bg-premium-bgMain',
    card: 'bg-premium-bgCard',
    white: 'bg-white'
  };

  const paddingClasses = {
    compact: 'pt-12 pb-12',
    default: 'pt-16 pb-16',
    large: 'pt-20 pb-20'
  };

  return (
    <section
      id={id}
      className={[
        'relative',
        'first:pt-0',
        backgroundClasses[background] || backgroundClasses.main,
        paddingClasses[padding] || paddingClasses.default,
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
};

export default SectionContainer;
