import { Resource, createInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ChainedBackend from 'i18next-chained-backend';
import HttpBackend from 'i18next-http-backend';
import resourcesToBackend from "i18next-resources-to-backend";
import { join } from "path";
import { DEFAULT_LANGUAGE, FALLBACK_NAMESPACE, LANGUAGES, MAIN_NAMESPACE } from "./common";

/**
 * @see https://www.locize.com/blog/i18n-next-app-router/
 * @see https://react.i18next.com/
 */
export async function loadServerI18n(lang?: string) {
    const serverSide = typeof window === "undefined",
        language = serverSide
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            ? lang || process.env.owmf_default_language || DEFAULT_LANGUAGE
            : undefined; // let detect the language on client side
    if (language && !Object.keys(LANGUAGES).includes(language))
        throw new Error("Invalid language: " + language);

    const rawI18nOverride = process.env.NEXT_PUBLIC_OWMF_i18n_override ? JSON.parse(process.env.NEXT_PUBLIC_OWMF_i18n_override) as unknown : undefined,
        i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
        backends: object[] = [],
        backendOptions: object[] = [],
        i18n = createInstance().use(ChainedBackend);
    console.debug("loadServerI18n", { serverSide, lang, language, i18nOverride })
    if (!serverSide) {
        backends.push(HttpBackend);
        backendOptions.push({
            loadPath: `${process.env.NEXT_PUBLIC_OWMF_base_path ?? ""}/locales/{{lng}}/{{ns}}.json`
        });
        const { initReactI18next } = await import('react-i18next');
        i18n.use(LanguageDetector).use(initReactI18next);
        console.debug("loadServerI18n: client side");
    }
    if (serverSide && language) {
        const commonBackendPath = join(process.cwd(), "public", "locales", language, FALLBACK_NAMESPACE + '.json'),
            { existsSync, readFileSync } = await import("fs"),
            rawCommonBackend = existsSync(commonBackendPath) ? JSON.parse(readFileSync(commonBackendPath, 'utf8')) as unknown : undefined,
            commonBackend = rawCommonBackend && typeof rawCommonBackend === 'object' ? { [language]: { [FALLBACK_NAMESPACE]: rawCommonBackend } } as Resource : undefined;
        if (commonBackend) {
            backends.unshift(resourcesToBackend(commonBackend));
            backendOptions.unshift({});
        }
        console.debug("loadServerI18n: server side", { language, commonBackendPath, commonBackend });
    }
    if (i18nOverride) {
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
        console.debug("loadServerI18n: loading site override");
    }

    const t = await i18n.init({
        supportedLngs: Object.keys(LANGUAGES).flatMap(
            locale => locale.includes("_") ? [locale.split("_")[0], locale] : [locale]
        ),
        debug: false,
        fallbackLng: DEFAULT_LANGUAGE,
        lng: language, // Currently uses only language, not locale
        backend: { backends, backendOptions },
        ns: [MAIN_NAMESPACE, FALLBACK_NAMESPACE],
        fallbackNS: FALLBACK_NAMESPACE,
        defaultNS: MAIN_NAMESPACE,
        detection: {
            lookupQuerystring: 'lang', // default is lng
            order: ['querystring', 'path', 'htmlTag', 'cookie', 'localStorage', 'sessionStorage', 'navigator'],
        },
    });
    return { t, i18n };
}