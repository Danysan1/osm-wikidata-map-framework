/**
 * Get the value for a configuration key
 */
export function getConfig(key: string): string | null {
    //const configElement = document.head.querySelector<HTMLMetaElement>(`meta[name="config_${key}"]`);
    //return configElement?.content?.length ? configElement.content : null;
    return process.env["owmf_" + key] ?? null;
}

export function getBoolConfig(key: string): boolean {
    const rawValue = getConfig(key);
    return !!rawValue && rawValue != "0" && rawValue != "false";
}

export function getIntConfig(key: string): number | undefined {
    const rawValue = getConfig(key);
    return rawValue ? parseInt(rawValue) : undefined;
}

export function getFloatConfig(key: string): number | undefined {
    const rawValue = getConfig(key);
    return rawValue ? parseFloat(rawValue) : undefined;
}

export function getJsonConfig(key: string): unknown {
    // const configElement = document.head.querySelector<HTMLScriptElement>(`script#config_${key}`),
    //     out = configElement?.textContent ? JSON.parse(configElement.textContent) as unknown : null;
    const raw = getConfig(key),
        out = raw ? JSON.parse(raw) as unknown : null;
    console.debug("getJsonConfig", { key, raw, out, env:process.env });
    return out;
}

export function getStringArrayConfig(key: string): string[] | undefined {
    const rawValues = getJsonConfig(key),
        out = Array.isArray(rawValues) ? rawValues.map(value => {
            if (typeof value === 'string')
                return value;
            else
                throw new Error("Non-string item in " + key);
        }) : undefined;
    // console.debug("getStringArrayConfig", { key, rawValues, out });
    return out;
}
