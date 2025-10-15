export const OSM_TITLE = process.env.NEXT_PUBLIC_OWMF_osm_instance_url?.includes("openhistoricalmap")
    ? "OpenHistoricalMap"
    : "OpenStreetMap",
    OSM_INSTANCE = process.env.NEXT_PUBLIC_OWMF_osm_instance_url?.replace("https://www.","") ?? "openstreetmap.org";

export function parseStringArrayConfig(rawValue: string): string[] {
    //console.debug("parseStringArrayConfig", { rawValue });
    const rawObject = rawValue ? JSON.parse(rawValue) as unknown : null;
    if (!Array.isArray(rawObject))
        throw new Error("Invalid JSON object");
    return rawObject.map(value => {
        if (typeof value === 'string')
            return value;
        else
            throw new Error("Non-string item in JSON object");
    });
}
