import { useTranslation } from "next-i18next";

export function useOwmfTranslation() {
    return useTranslation('app', { i18n });
}