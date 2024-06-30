'use client';

import { Resource, createInstance } from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import HttpBackend from 'i18next-http-backend';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, MAIN_NAMESPACE } from "./common";

/**
 * Order of priority:
 * 1. lang parameter of the html tag, set during initialization and used as single source of truth thereafter
 * 2. lang parameter of the URL, set by the user and used during initialization
 * 3. browser preferred language, used during initialization
 * 4. browser preferred language, used during initialization
 */
export function getLocale(): string | undefined {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return document.documentElement.lang || new URLSearchParams(document.location.search).get("lang") || navigator.languages?.at(0) || navigator.language;
}

export function getLanguage(): string {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return getLocale()?.match(/^[a-zA-Z]{2,3}/)?.at(0) || process.env.owmf_default_language || DEFAULT_LANGUAGE;
}

export async function loadClientI18n(lang?: string) {
    if (typeof window === 'undefined')
        throw new Error("loadClientI18n: trying to load client i18n from server component");

    const language = lang ?? getLanguage(),
        rawI18nOverride = process.env.owmf_i18n_override ? JSON.parse(process.env.owmf_i18n_override) as unknown : undefined,
        i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
        backends: object[] = [HttpBackend],
        backendOptions: object[] = [{ loadPath: 'locales/{{lng}}/{{ns}}.json' }];
    if (i18nOverride) {
        if (process.env.NODE_ENV === 'development') console.debug("loadClientI18n: using i18n_override:", { language, i18nOverride });
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
    }
    const i18nInstance = createInstance();
    const t = await i18nInstance.use(ChainedBackend)
        .use(initReactI18next)
        .init({
            debug: process.env.NODE_ENV === 'development',
            fallbackLng: DEFAULT_LANGUAGE,
            lng: language, // Currently uses only language, not locale
            backend: { backends, backendOptions },
            ns: [MAIN_NAMESPACE, DEFAULT_NAMESPACE],
            fallbackNS: DEFAULT_NAMESPACE,
            defaultNS: DEFAULT_NAMESPACE
        });
    return { t, i18nInstance };
}
