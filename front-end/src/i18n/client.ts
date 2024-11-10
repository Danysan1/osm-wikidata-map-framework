'use client';

import { Resource, createInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ChainedBackend from 'i18next-chained-backend';
import HttpBackend from 'i18next-http-backend';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, FALLBACK_NAMESPACE, LANGUAGES, MAIN_NAMESPACE } from "./common";

/**
 * 
 * @see https://react.i18next.com/
 */
export async function loadClientI18n() {
    const rawI18nOverride = process.env.owmf_i18n_override ? JSON.parse(process.env.owmf_i18n_override) as unknown : undefined,
        i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
        backends: object[] = [HttpBackend],
        backendOptions: object[] = [{ loadPath: `${process.env.owmf_base_path ?? ""}/locales/{{lng}}/{{ns}}.json` }];
    if (i18nOverride) {
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
    }
    const i18nInstance = createInstance();
    return await i18nInstance
        .use(ChainedBackend)
        .use(initReactI18next)
        .use(LanguageDetector)
        .init({
            supportedLngs: Object.keys(LANGUAGES),
            detection: {
                lookupQuerystring: 'lang', // default is lng
                order: ['querystring', 'path', 'htmlTag', 'cookie', 'localStorage', 'sessionStorage', 'navigator'],
            },
            debug: false,//process.env.NODE_ENV === 'development',
            fallbackLng: DEFAULT_LANGUAGE,
            backend: { backends, backendOptions },
            ns: [MAIN_NAMESPACE, FALLBACK_NAMESPACE],
            fallbackNS: FALLBACK_NAMESPACE,
            defaultNS: MAIN_NAMESPACE
        });
}
