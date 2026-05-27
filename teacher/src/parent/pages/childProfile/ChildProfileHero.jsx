import { User, School, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const defaultAvatar = '/avatars/avatar1.jfif';

const ChildProfileHero = ({
  child,
  photoTimestamp,
  imageLoading,
  onImageLoad,
  onImageError,
  onAvatarClick,
  parentGroupName,
  API_BASE,
}) => {
  const { t } = useTranslation();

  const photoSrc = child.photo
    ? child.photo.startsWith('/avatars/')
      ? child.photo
      : child.photo.startsWith('http://') || child.photo.startsWith('https://')
      ? child.photo
      : `${API_BASE}${child.photo.startsWith('/') ? '' : '/'}${child.photo}?t=${photoTimestamp}`
    : defaultAvatar;

  const age = (() => {
    const today = new Date();
    const birth = new Date(child.dateOfBirth);
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  })();

  return (
    <div className="page-card page-corner rounded-xl p-5 flex items-center gap-5">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="relative group cursor-pointer">
          {imageLoading && (
            <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-p-sepia-200 animate-pulse" />
          )}
          <img
            key={`${child.photo}-${photoTimestamp}`}
            src={photoSrc}
            alt={`${child.firstName} ${child.lastName}`}
            className={`w-20 h-20 rounded-2xl object-cover border-2 border-p-sepia-200 transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={onImageLoad}
            onError={onImageError}
          />
          <div className="absolute inset-0 bg-p-ink/30 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition pointer-events-none">
            <span className="text-white text-[11px] font-medium">O&apos;zgartirish</span>
          </div>
          <button
            onClick={onAvatarClick}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Rasmni o'zgartirish"
          />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-500 rounded-full border-2 border-p-surface" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-2 mb-1">
          <h2 className="font-serif text-[20px] font-semibold text-p-ink leading-tight truncate">
            {child.firstName} {child.lastName}
          </h2>
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-p-brand-100 text-p-brand-700 text-[11px] font-medium">
            {t(`child.gender.${child.gender?.toLowerCase()}`) || child.gender}
          </span>
        </div>
        <p className="text-[13px] text-p-sepia-500 mb-2">
          {t('child.ageYears', { count: age })}
        </p>
        <div className="flex flex-wrap gap-2">
          {child.childSchool?.name && (
            <span className="inline-flex items-center gap-1 text-[12px] text-p-sepia-600 bg-p-sepia-100 rounded-md px-2 py-0.5">
              <School className="w-3 h-3" />
              {child.childSchool.name}
            </span>
          )}
          {parentGroupName && (
            <span className="inline-flex items-center gap-1 text-[12px] text-p-sepia-600 bg-p-sepia-100 rounded-md px-2 py-0.5">
              <Users className="w-3 h-3" />
              {parentGroupName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildProfileHero;
