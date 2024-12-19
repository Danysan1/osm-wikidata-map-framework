import type { Etymology } from "../model/Etymology";
import type { OwmfFeature } from "../model/OwmfResponse";

export function getLinkedEntities(feature: OwmfFeature): Etymology[] | undefined {
    if (Array.isArray(feature.properties?.linked_entities)) {
        return feature.properties?.linked_entities;
    } else if (feature.properties?.linked_entities) {
        feature.properties.linked_entities = JSON.parse(feature.properties.linked_entities) as Etymology[];
        return feature.properties.linked_entities;
    }
    return undefined;
}