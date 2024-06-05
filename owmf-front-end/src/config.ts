export function parseBoolConfig(rawValue?: string): boolean {
    return !!rawValue && rawValue != "0" && rawValue != "false";
}

export function parseStringArrayConfig(rawValue?: string): string[] | undefined {
    console.debug("parseStringArrayConfig", { rawValue });
    const rawObject = rawValue ? JSON.parse(rawValue) as unknown : null,
        out = Array.isArray(rawObject) ? rawObject.map(value => {
            if (typeof value === 'string')
                return value;
            else
                throw new Error("Non-string item in JSON object");
        }) : undefined;
    return out;
}
