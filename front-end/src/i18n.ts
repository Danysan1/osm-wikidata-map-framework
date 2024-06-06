/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import type { Resource, TFunction } from "i18next";
import i18next from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import HttpBackend from 'i18next-http-backend';
import resourcesToBackend from 'i18next-resources-to-backend';

export const DEFAULT_LANGUAGE = "en",
    MAIN_NAMESPACE = "app",
    DEFAULT_NAMESPACE = "common";

export function getLocale(): string | undefined {
    return document.documentElement.lang || // lang parameter of the html tag, set during initialization and used as single source of truth thereafter
        new URLSearchParams(document.location.search).get("lang") || // lang parameter of the URL, set by the user and used during initialization
        navigator.languages?.at(0) || // browser preferred language, used during initialization
        navigator.language; // browser preferred language, used during initialization
}

export function getLanguage(): string {
    return getLocale()?.match(/^[a-zA-Z]{2,3}/)?.at(0) || process.env.owmf_default_language || DEFAULT_LANGUAGE;
}

export function setPageLocale() {
    const lang = getLanguage();

    if (process.env.NODE_ENV === 'development') console.debug("setPageLocale", {
        lang, navLangs: navigator.languages, navLang: navigator.language
    });

    // <html lang='en'>
    document.documentElement.setAttribute("lang", lang);

    // <meta http-equiv='Content-Language' content='en' />
    const metaLanguage = document.createElement("meta");
    metaLanguage.httpEquiv = "Content-Language";
    metaLanguage.content = lang;
    document.head.appendChild(metaLanguage);

    const preloadLang = document.createElement("link");
    preloadLang.rel = "preload";
    preloadLang.as = "fetch";
    preloadLang.crossOrigin = "anonymous";
    preloadLang.href = `locales/${lang}/common.json`;
    document.head.appendChild(preloadLang);

    loadTranslator().then(t => {
        const title = document.head.querySelector<HTMLTitleElement>("title"),
            descr = document.head.querySelector<HTMLMetaElement>('meta[name="description"]'),
            og_title = document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]'),
            og_name = document.head.querySelector<HTMLMetaElement>('meta[property="og:site_name"]'),
            og_description = document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]');
        if (title) title.innerText = t("title");
        if (descr) descr.content = t("description");
        if (og_title) og_title.content = t("title");
        if (og_name) og_name.content = t("title");
        if (og_description) og_description.content = t("description");
    }).catch(console.error);
}

let tPromise: Promise<TFunction> | undefined;
export function loadTranslator() {
    if (tPromise === undefined)
        tPromise = loadI18n();

    return tPromise;
}



async function loadI18n() {
    const defaultNamespace = "app",
        language = getLanguage(),
        rawI18nOverride = process.env.owmf_i18n_override ? JSON.parse(process.env.owmf_i18n_override) as unknown : undefined,
        i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
        backends: object[] = [HttpBackend],
        backendOptions: object[] = [{ loadPath: 'locales/{{lng}}/{{ns}}.json' }];
    if (i18nOverride) {
        if (process.env.NODE_ENV === 'development') console.debug("loadTranslator: using i18n_override:", { language, i18nOverride });
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
    }
    return await i18next.use(ChainedBackend).init({
        debug: process.env.NODE_ENV === 'development',
        fallbackLng: DEFAULT_LANGUAGE,
        lng: language, // Currently uses only language, not locale
        backend: { backends, backendOptions },
        ns: ["common", defaultNamespace],
        fallbackNS: "common",
        defaultNS: defaultNamespace
    });
}

export function translateContent(parent: HTMLElement, selector: string, key: string, defaultValue: string) {
    const domElement = parent.querySelector<HTMLElement>(selector);
    if (!domElement) {
        if (process.env.NODE_ENV === 'development') console.error("translateContent: failed finding element", "error", { parentClasses: parent.classList, selector });
    } else {
        loadTranslator().then(t => {
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
        loadTranslator().then(t => {
            const title = t(key, defaultValue);
            domElement.title = title;
            //domElement.ariaLabel = title;
        }).catch(
            (e: unknown) => { if (process.env.NODE_ENV === 'development') console.error("Failed initializing or using i18next", "error", { error: e, key }); }
        );
    }
}