import { existsSync, readFileSync } from "fs";
import { Resource, createInstance } from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import resourcesToBackend from "i18next-resources-to-backend";
import { join } from "path";
import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, MAIN_NAMESPACE } from "./common";

export async function loadServerI18n(lang?: string) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const language = lang || process.env.owmf_default_language || DEFAULT_LANGUAGE,
        commonBackendPath = join(process.cwd(), "public", "locales", language, DEFAULT_NAMESPACE + '.json'),
        rawCommonBackend = existsSync(commonBackendPath) ? JSON.parse(readFileSync(commonBackendPath, 'utf8')) as unknown : undefined,
        commonBackend = rawCommonBackend && typeof rawCommonBackend === 'object' ? { [language]: { [DEFAULT_NAMESPACE]: rawCommonBackend } } as Resource : undefined,
        rawI18nOverride = process.env.owmf_i18n_override ? JSON.parse(process.env.owmf_i18n_override) as unknown : undefined,
        i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
        backends: object[] = [],
        backendOptions: object[] = [];
    // if (process.env.NODE_ENV === 'development') console.debug("loadServerI18n", { language, commonBackendPath, commonBackend, i18nOverride });
    if (commonBackend) {
        backends.unshift(resourcesToBackend(commonBackend));
        backendOptions.unshift({});
    }
    if (i18nOverride) {
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
    }
    const i18nInstance = createInstance();
    const t = await i18nInstance.use(ChainedBackend)
        .init({
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