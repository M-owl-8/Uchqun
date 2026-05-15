import SharedLanguageSwitcher from '../../shared/components/LanguageSwitcher';

const LanguageSwitcher = () => (
  <SharedLanguageSwitcher
    wrapperClassName="inline-flex items-center gap-2 bg-white text-gray-700 rounded-lg px-2 py-1 shadow-sm border border-gray-200"
    selectClassName="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
  />
);

export default LanguageSwitcher;
