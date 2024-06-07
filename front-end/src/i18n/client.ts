import { Resource, i18n } from 'i18next';
import HttpBackend from 'i18next-http-backend';
import resourcesToBackend from 'i18next-resources-to-backend';
import { TFunction } from 'next-i18next';
import { DEFAULT_LANGUAGE, loadI18n } from "./common";


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

let tPromise: Promise<{ t: TFunction, i18nInstance: i18n }> | undefined;
export function loadTranslator() {
    if (tPromise === undefined)
        tPromise = loadClientI18n();

    return tPromise;
}

async function loadClientI18n() {
    const language = getLanguage(),
        rawI18nOverride = process.env.owmf_i18n_override ? JSON.parse(process.env.owmf_i18n_override) as unknown : undefined,
        i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
        backends: object[] = [HttpBackend],
        backendOptions: object[] = [{ loadPath: 'locales/{{lng}}/{{ns}}.json' }];
    if (i18nOverride) {
        if (process.env.NODE_ENV === 'development') console.debug("loadI18n: using i18n_override:", { language, i18nOverride });
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
    }
    return await loadI18n(language, backends, backendOptions);
}

export function translateContent(parent: HTMLElement, selector: string, key: string, defaultValue: string) {
    const domElement = parent.querySelector<HTMLElement>(selector);
    if (!domElement) {
        if (process.env.NODE_ENV === 'development') console.error("translateContent: failed finding element", "error", { parentClasses: parent.classList, selector });
    } else {
        loadTranslator().then(({ t }) => {
            const label = t(key, defaultValue);
            domElement.textContent = label;
            domElement.ariaLabel = label; // https://dequeuniversity.com/rules/axe/4.7/label-content-name-mismatch
        }).catch(
            (e: unknown) => { if (process.env.NODE_ENV === 'development') console.error("Failed initializing or using i18next", "error", { error: e, key }); }
        );
    }
}

export function translateAnchorTitle(parent: HTMLElement, selector: string, key: string, defaultValue: string) {
    const domElement = parent.querySelector<HTMLAnchorElement>(selector);
    if (!domElement) {
        if (process.env.NODE_ENV === 'development') console.debug("translateTitle: failed finding element", { parentClasses: parent.classList, selector });
    } else {
        loadTranslator().then(({ t }) => {
            const title = t(key, defaultValue);
            domElement.title = title;
            //domElement.ariaLabel = title;
        }).catch(
            (e: unknown) => { if (process.env.NODE_ENV === 'development') console.error("Failed initializing or using i18next", "error", { error: e, key }); }
        );
    }
}
