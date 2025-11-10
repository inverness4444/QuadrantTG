import { useLocalizationContext } from "../providers/LocalizationProvider";

export const useLocalization = () => {
  const { language, setLanguage, t } = useLocalizationContext();
  return { language, setLanguage, t };
};
