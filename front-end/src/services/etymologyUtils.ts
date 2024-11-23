import type { Etymology } from "../model/Etymology";
import type { EtymologyFeature } from "../model/EtymologyResponse";

export function getLinkedEntities(feature: EtymologyFeature): Etymology[] | undefined {
    if (Array.isArray(feature.properties?.linked_entities)) {
        return feature.properties?.linked_entities;
    } else if (feature.properties?.linked_entities) {
        feature.properties.linked_entities = JSON.parse(feature.properties.linked_entities) as Etymology[];
        return feature.properties.linked_entities;
    }
    return undefined;
}