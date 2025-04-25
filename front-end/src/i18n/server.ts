import { existsSync, readFileSync } from "fs";
import { Resource, createInstance } from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import resourcesToBackend from "i18next-resources-to-backend";
import { join } from "path";
import { DEFAULT_LANGUAGE, FALLBACK_NAMESPACE, LANGUAGES, MAIN_NAMESPACE } from "./common";

export async function loadServerI18n(lang?: string) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const language = lang || process.env.owmf_default_language || DEFAULT_LANGUAGE;
    if (!Object.keys(LANGUAGES).includes(language))
        throw new Error("Invalid language: " + language);

    const commonBackendPath = join(process.cwd(), "public", "locales", language, FALLBACK_NAMESPACE + '.json'),
        rawCommonBackend = existsSync(commonBackendPath) ? JSON.parse(readFileSync(commonBackendPath, 'utf8')) as unknown : undefined,
        commonBackend = rawCommonBackend && typeof rawCommonBackend === 'object' ? { [language]: { [FALLBACK_NAMESPACE]: rawCommonBackend } } as Resource : undefined,
        rawI18nOverride = process.env.NEXT_PUBLIC_OWMF_i18n_override ? JSON.parse(process.env.NEXT_PUBLIC_OWMF_i18n_override) as unknown : undefined,
        i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
        backends: object[] = [],
        backendOptions: object[] = [];
    // console.debug("loadServerI18n", { language, commonBackendPath, commonBackend, i18nOverride });
    if (commonBackend) {
        backends.unshift(resourcesToBackend(commonBackend));
        backendOptions.unshift({});
    }
    if (i18nOverride) {
        console.debug("loadServerI18n: using i18n_override:", { language, languages: Object.keys(i18nOverride) });
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
    }
    const i18n = createInstance();
    const t = await i18n.use(ChainedBackend)
        .init({
            supportedLngs: Object.keys(LANGUAGES),
            debug: false,//process.env.NODE_ENV === 'development',
            fallbackLng: DEFAULT_LANGUAGE,
            lng: language, // Currently uses only language, not locale
            backend: { backends, backendOptions },
            ns: [MAIN_NAMESPACE, FALLBACK_NAMESPACE],
            fallbackNS: FALLBACK_NAMESPACE,
            defaultNS: MAIN_NAMESPACE,
        });
    return { t, i18n };
}