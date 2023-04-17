import { TFunction } from "i18next";
import ChainedBackend from 'i18next-chained-backend'
import resourcesToBackend from 'i18next-resources-to-backend'
import HttpBackend from 'i18next-http-backend'
import { debugLog, getBoolConfig, getConfig } from "./config";
import { logErrorMessage } from "./monitoring";


export function setPageLocale() {
    const langParam = new URLSearchParams(document.location.search).get("lang"),
        locale = langParam || navigator.languages?.at(0) || navigator.language,
        lang = locale?.match(/^[a-zA-Z]{2,3}/)?.at(0) || 'en';

    debugLog("setPageLocale", {
        langParam, locale, lang, navLangs: navigator.languages, navLang: navigator.language
    });

    document.documentElement.setAttribute("lang", lang);
}

let tPromise: Promise<TFunction>;
export async function loadTranslator() {
    if (!tPromise) {
        const hostNamespace = new URL(document.URL).hostname,
            locale = document.documentElement.getAttribute("lang") || 'en-US',
            rawI18nOverride = getConfig("i18n_override"),
            backends: object[] = [HttpBackend];
        if (rawI18nOverride) {
            try {
                const i18nOverride = JSON.parse(rawI18nOverride);
                debugLog("loadTranslator: using i18n_override:", { locale, rawI18nOverride, i18nOverride });
                backends.unshift(resourcesToBackend(i18nOverride));
            } catch (e) {
                logErrorMessage("Failed parsing i18n_override", "error", { locale, rawI18nOverride, e });
            }
        }
        tPromise = import("i18next").then(i18next => i18next.use(ChainedBackend).init({
            debug: getBoolConfig("enable_debug_log"),
            fallbackLng: "en",
            //lng: locale, // comment to use the language only, UNcomment to use the full locale
            lng: locale.split("-")[0], // UNcomment to use the language only, comment to use the full locale
            backend: { backends },
            ns: ["common", hostNamespace],
            fallbackNS: "common",
            defaultNS: hostNamespace
        }));
    }

    return tPromise;
}

export function translateContent(parent: HTMLElement, selector: string, key: string) {
    const domElement = parent.querySelector<HTMLElement>(selector);
    if (!domElement) {
        logErrorMessage("translateContent: failed finding element", "error", { parent, selector });
    } else {
        loadTranslator().then(t => domElement.textContent = t(key))
            .catch(e => logErrorMessage("Failed initializing or using i18next", "error", { e, key }));
    }
}

export function translateTitle(parent: HTMLElement, selector: string, key: string) {
    const domElement = parent.querySelector<HTMLAnchorElement>(selector);
    if (!domElement) {
        debugLog("translateTitle: failed finding element", { parent, selector });
    } else {
        loadTranslator().then(t => domElement.title = t(key))
            .catch(e => logErrorMessage("Failed initializing or using i18next", "error", { e, key }));
    }
}