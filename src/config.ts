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

export function getJsonConfig(key: string): any | null {
    const configElement = document.head.querySelector<HTMLScriptElement>(`script#config_${key}`);
    return configElement?.textContent ? JSON.parse(configElement.textContent) : null;
}

export const debug = getBoolConfig("enable_debug_log");

export const getKeyID = (key: string) => "osm_" + key.replace(":wikidata", "").replace(":", "_");
