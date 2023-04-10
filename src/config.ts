import { use } from "i18next";
import Backend from "i18next-http-backend";

/**
 * Get the value for a configuration key
 */
export function getConfig(key: string): string | null {
    const configElement = document.head.querySelector<HTMLMetaElement>(`meta[name="config_${key}"]`);
    return configElement ? configElement.content : null;
}

export function getBoolConfig(key: string): boolean {
    const rawValue = getConfig(key);
    return !!rawValue && rawValue != "0" && rawValue != "false";
}

let enable_debug_log: boolean | null = null;
export function debugLog(msg: string, extra?: object) {
    if (enable_debug_log === null) enable_debug_log = ["true", "1"].includes(getConfig("enable_debug_log") ?? "");

    if (enable_debug_log) console.info(msg, extra);
}

export function setPageLocale() {
    const langParam = new URLSearchParams(document.location.search).get("lang"),
        locale = langParam || navigator.languages?.find(x => x.includes("-")) || navigator.language || 'en-US';

    debugLog("setPageLocale", {
        langParam, lang: navigator.language, langs: navigator.languages, locale
    });

    document.documentElement.setAttribute("lang", locale);

    const hostNamespace = new URL(document.URL).hostname;
    use(Backend).init({
        fallbackLng: "en",
        lng: locale,
        ns: ["translation", hostNamespace],
        fallbackNS: "translation",
        defaultNS: hostNamespace,
    });
}