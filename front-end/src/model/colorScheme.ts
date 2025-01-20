export enum ColorSchemeID {
    blue = "blue",
    gender = "gender",
    type = "type",
    country = "country",
    line_of_work = "line_of_work",
    occupation = "occupation",
    startCentury = "startCentury",
    endCentury = "endCentury",
    feature_source = "feature_source",
    feature_link_count = "feature_link_count",
    etymology_source = "etymology_source",
    etymology_link_count = "etymology_link_count",
    picture = "picture",
    black = "black",
    red = "red",
    orange = "orange",
}

export interface ColorScheme {
    /** Fallback text for the label to be shown in the dropdown item for this color scheme */
    defaultText: string;
    /** i18n translation key for the label to be shown in the dropdown category for this  */
    categoryKey: string;
    /** Fallback text for the label to be shown in the dropdown category for this  */
    defaultCategoryText: string;
    /** Whether this color scheme should be available only when linked entity are available (=> not with base preset) */
    requiresLinkedEntities: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    [ColorSchemeID.feature_source]: {
        defaultText: "By source", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", requiresLinkedEntities: false,
    },
    [ColorSchemeID.picture]: {
        defaultText: "By picture availability", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", requiresLinkedEntities: false,
    },
    [ColorSchemeID.feature_link_count]: {
        defaultText: "By Wikilink count", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", requiresLinkedEntities: false,
    },
    [ColorSchemeID.etymology_source]: {
        defaultText: "By source", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.gender]: {
        defaultText: "By gender", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.type]: {
        defaultText: "By type", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.country]: {
        defaultText: "By country", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.line_of_work]: {
        defaultText: "By line of work", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.occupation]: {
        defaultText: "By occupation", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.startCentury]: {
        defaultText: "By start/birth century", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.endCentury]: {
        defaultText: "By end/death century", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.etymology_link_count]: {
        defaultText: "By Wikilink count", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics", requiresLinkedEntities: true,
    },
    [ColorSchemeID.blue]: {
        defaultText: "Blue", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", requiresLinkedEntities: false,
    },
    [ColorSchemeID.black]: {
        defaultText: "Black", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", requiresLinkedEntities: false,
    },
    [ColorSchemeID.red]: {
        defaultText: "Red", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", requiresLinkedEntities: false,
    },
    [ColorSchemeID.orange]: {
        defaultText: "Orange", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", requiresLinkedEntities: false,
    },
};
