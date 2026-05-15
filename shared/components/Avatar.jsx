const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const Avatar = ({ src, alt = '', initials = '', size = 'md', className = '' }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={alt || initials}
      className={`rounded-full flex items-center justify-center font-bold
        bg-primary-100 text-primary-700 border-2 border-white shadow-sm
        ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;
