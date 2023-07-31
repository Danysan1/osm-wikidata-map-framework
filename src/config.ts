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

export function getJsonConfig(key: string): string | null {
    const configElement = document.head.querySelector<HTMLScriptElement>(`script#config_${key}`);
    return configElement ? configElement.textContent : null;
}

let enable_debug_log: boolean | null = null;
export function debugLog(msg: string, extra?: object) {
    if (enable_debug_log === null)
        enable_debug_log = getBoolConfig("enable_debug_log");

    if (enable_debug_log) console.info(msg, extra);
}
