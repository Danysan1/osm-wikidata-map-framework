import { Resource, TFunction } from "i18next";
import ChainedBackend from 'i18next-chained-backend'
import resourcesToBackend from 'i18next-resources-to-backend'
import HttpBackend from 'i18next-http-backend'
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

    document.documentElement.setAttribute("lang", lang);

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
export async function loadTranslator() {
    if (!tPromise) {
        const defaultNamespace = "app",
            defaultLanguage = getConfig("default_language") || 'en',
            locale = document.documentElement.lang,
            language = locale.split('-').at(0),
            i18nOverride: Resource | null = getJsonConfig("i18n_override"),
            backends: object[] = [HttpBackend],
            backendOptions: object[] = [{ loadPath: 'locales/{{lng}}/{{ns}}.json' }];
        if (i18nOverride) {
            if (debug) console.info("loadTranslator: using i18n_override:", { defaultLanguage, language, i18nOverride });
            backends.unshift(resourcesToBackend(i18nOverride));
            backendOptions.unshift({});
        }
        tPromise = import("i18next").then(i18next => i18next.use(ChainedBackend).init({
            debug: getBoolConfig("enable_debug_log"),
            fallbackLng: defaultLanguage,
            //lng: locale, // comment to use the language only, UNcomment to use the full locale
            lng: language, // UNcomment to use the language only, comment to use the full locale
            backend: { backends, backendOptions },
            ns: ["common", defaultNamespace],
            fallbackNS: "common",
            defaultNS: defaultNamespace
        }));
    }

    return tPromise;
}

export function translateContent(parent: HTMLElement, selector: string, key: string) {
    const domElement = parent.querySelector<HTMLElement>(selector);
    if (!domElement) {
        logErrorMessage("translateContent: failed finding element", "error", { parentClasses: parent.classList, selector });
    } else {
        loadTranslator().then(t => domElement.textContent = t(key))
            .catch(e => logErrorMessage("Failed initializing or using i18next", "error", { e, key }));
    }
}

export function translateAnchorTitle(parent: HTMLElement, selector: string, key: string) {
    const domElement = parent.querySelector<HTMLAnchorElement>(selector);
    if (!domElement) {
        if (debug) console.info("translateTitle: failed finding element", { parentClasses: parent.classList, selector });
    } else {
        loadTranslator()
            .then(t => {
                const title = t(key);
                domElement.title = title;
                domElement.ariaLabel = title;
            })
            .catch(e => logErrorMessage("Failed initializing or using i18next", "error", { e, key }));
    }
}