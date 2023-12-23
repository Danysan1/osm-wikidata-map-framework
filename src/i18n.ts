import { Resource, TFunction } from "i18next";
import { debug, getBoolConfig, getConfig, getJsonConfig } from "./config";
import { logErrorMessage } from "./monitoring";

export function getLocale(): string | undefined {
    const langParam = new URLSearchParams(document.location.search).get("lang"),
        locale = langParam || navigator.languages?.at(0) || navigator.language;
    return locale.match(/^[a-zA-Z_-]+/)?.at(0);
}

export function setPageLocale() {
    const locale = getLocale(),
        lang = locale?.match(/^[a-zA-Z]{2,3}/)?.at(0) || getConfig("default_language") || 'en';

    if (debug) console.info("setPageLocale", {
        locale, lang, navLangs: navigator.languages, navLang: navigator.language
    });

    // <html lang='en'>
    document.documentElement.setAttribute("lang", lang);

    // <meta http-equiv='Content-Language' content='en' />
    const metaLanguage = document.createElement("meta");
    metaLanguage.httpEquiv = "Content-Language";
    metaLanguage.content = lang;
    document.head.appendChild(metaLanguage);

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
    });
}

let tPromise: Promise<TFunction>;
export function loadTranslator() {
    if (!tPromise)
        tPromise = loadI18n();

    return tPromise;
}

async function loadI18n() {
    const defaultNamespace = "app",
        defaultLanguage = getConfig("default_language") || 'en',
        locale = document.documentElement.lang,
        language = locale.split('-').at(0),
        { ChainedBackend, HttpBackend, i18next, resourcesToBackend } = await import('./i18next'),
        i18nOverride: Resource | null = getJsonConfig("i18n_override"),
        backends: object[] = [HttpBackend],
        backendOptions: object[] = [{ loadPath: 'locales/{{lng}}/{{ns}}.json' }];
    if (i18nOverride) {
        if (debug) console.info("loadTranslator: using i18n_override:", { defaultLanguage, language, i18nOverride });
        backends.unshift(resourcesToBackend(i18nOverride));
        backendOptions.unshift({});
    }
    return await i18next.use(ChainedBackend).init({
        debug: getBoolConfig("enable_debug_log"),
        fallbackLng: defaultLanguage,
        //lng: locale, // comment to use the language only, UNcomment to use the full locale
        lng: language, // UNcomment to use the language only, comment to use the full locale
        backend: { backends, backendOptions },
        ns: ["common", defaultNamespace],
        fallbackNS: "common",
        defaultNS: defaultNamespace
    });
}

export function translateContent(parent: HTMLElement, selector: string, key: string, defaultValue: string) {
    const domElement = parent.querySelector<HTMLElement>(selector);
    if (!domElement) {
        logErrorMessage("translateContent: failed finding element", "error", { parentClasses: parent.classList, selector });
    } else {
        loadTranslator().then(t => {
            const label = t(key, defaultValue);
            domElement.textContent = label;
            domElement.ariaLabel = label; // https://dequeuniversity.com/rules/axe/4.7/label-content-name-mismatch
        }).catch(e => logErrorMessage("Failed initializing or using i18next", "error", { e, key }));
    }
}

export function translateAnchorTitle(parent: HTMLElement, selector: string, key: string, defaultValue: string) {
    const domElement = parent.querySelector<HTMLAnchorElement>(selector);
    if (!domElement) {
        if (debug) console.info("translateTitle: failed finding element", { parentClasses: parent.classList, selector });
    } else {
        loadTranslator()
            .then(t => {
                const title = t(key, defaultValue);
                domElement.title = title;
                //domElement.ariaLabel = title;
            })
            .catch(e => logErrorMessage("Failed initializing or using i18next", "error", { e, key }));
    }
}