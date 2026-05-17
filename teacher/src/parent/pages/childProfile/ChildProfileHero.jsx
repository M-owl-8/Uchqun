import { User, School, Baby, Users } from 'lucide-react';
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
    <div className="relative overflow-hidden bg-surface rounded-[2rem] shadow-xl border border-slate-100 p-8 md:p-10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full -mr-32 -mt-32 opacity-50" />

      <div className="relative flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <div className="relative group cursor-pointer">
            {imageLoading && (
              <div className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-slate-200 animate-pulse flex items-center justify-center">
                <User className="w-12 h-12 md:w-16 md:h-16 text-slate-400" />
              </div>
            )}
            <img
              key={`${child.photo}-${photoTimestamp}`}
              src={photoSrc}
              alt={`${child.firstName} ${child.lastName}`}
              className={`w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover shadow-2xl border-4 border-white transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={onImageLoad}
              onError={onImageError}
            />
            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <span className="text-white text-sm font-semibold">Rasmni o&apos;zgartirish</span>
            </div>
            <button
              onClick={onAvatarClick}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-success-500 w-6 h-6 rounded-full border-4 border-white shadow-sm" title="Active" />
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-slate-900 leading-tight">
                {child.firstName} {child.lastName}
              </h1>
              <span className="px-4 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {t(`child.gender.${child.gender?.toLowerCase()}`) || child.gender}
              </span>
            </div>
            <p className="text-lg text-slate-700 font-medium flex items-center justify-center md:justify-start gap-2">
              <Baby className="w-5 h-5 text-brand-600" />
              {t('child.ageYears', { count: age })}
            </p>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-surface/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <School className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold text-slate-800">{child.childSchool?.name || ''}</span>
            </div>
            {parentGroupName && (
              <div className="flex items-center gap-2 px-4 py-2 bg-surface/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <Users className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-bold text-slate-800">{parentGroupName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildProfileHero;
