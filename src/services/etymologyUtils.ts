import type { Etymology } from "../model/Etymology";
import type { EtymologyFeature } from "../model/EtymologyResponse";

export function getEtymologies(feature: EtymologyFeature): Etymology[] | undefined {
    if (Array.isArray(feature.properties?.etymologies)) {
        return feature.properties?.etymologies;
    } else if (feature.properties?.etymologies) {
        feature.properties.etymologies = JSON.parse(feature.properties.etymologies) as Etymology[];
        return feature.properties.etymologies;
    }
    return undefined;
}