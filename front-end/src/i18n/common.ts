import { createInstance } from 'i18next';
import ChainedBackend from 'i18next-chained-backend';

export const DEFAULT_LANGUAGE = "en",
    MAIN_NAMESPACE = "app",
    DEFAULT_NAMESPACE = "common";

export async function loadI18n(lang: string, backends: object[], backendOptions: object[]) {
    const i18nInstance = createInstance();
    const t = await i18nInstance.use(ChainedBackend).init({
        debug: process.env.NODE_ENV === 'development',
        fallbackLng: DEFAULT_LANGUAGE,
        lng: lang, // Currently uses only language, not locale
        backend: { backends, backendOptions },
        ns: [MAIN_NAMESPACE, DEFAULT_NAMESPACE],
        fallbackNS: DEFAULT_NAMESPACE,
        defaultNS: DEFAULT_NAMESPACE
    });
    return { t, i18nInstance };
}
