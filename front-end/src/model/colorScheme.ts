export enum ColorSchemeID {
    blue = "blue",
    gender = "gender",
    type = "type",
    country = "country",
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
    /** i18n translation key for the label to be shown in the dropdown item for this color scheme */
    textKey: string;
    /** Fallback text for the label to be shown in the dropdown item for this color scheme */
    defaultText: string;
    /** i18n translation key for the label to be shown in the dropdown category for this  */
    categoryKey: string;
    /** Fallback text for the label to be shown in the dropdown category for this  */
    defaultCategoryText: string;
    /** Whether this color scheme should be available also when no etymology is available (es. https://osmwd.dsantini.it ) */
    showWithoutEtymology?: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    feature_source: {
        textKey: "color_scheme.feature_source", defaultText: "By source", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", showWithoutEtymology: true,
    },
    picture: {
        textKey: "color_scheme.feature_picture", defaultText: "By picture availability", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", showWithoutEtymology: true,
    },
    feature_link_count: {
        textKey: "color_scheme.link_count", defaultText: "By Wikilink count", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", showWithoutEtymology: true,
    },
    etymology_source: {
        textKey: "color_scheme.etymology_source", defaultText: "By source", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    gender: {
        textKey: 'color_scheme.gender', defaultText: "By gender", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    type: {
        textKey: 'color_scheme.type', defaultText: "By type", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    country: {
        textKey: 'color_scheme.country', defaultText: "By country", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    occupation: {
        textKey: 'color_scheme.occupation', defaultText: "By occupation", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    startCentury: {
        textKey: 'color_scheme.start_century', defaultText: "By start/birth century", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    endCentury: {
        textKey: 'color_scheme.end_century', defaultText: "By end/death century", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    etymology_link_count: {
        textKey: "color_scheme.link_count", defaultText: "By Wikilink count", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    blue: {
        textKey: 'color_scheme.blue', defaultText: "Blue", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", showWithoutEtymology: true,
    },
    black: {
        textKey: 'color_scheme.black', defaultText: "Black", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", showWithoutEtymology: true,
    },
    red: {
        textKey: 'color_scheme.red', defaultText: "Red", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", showWithoutEtymology: true,
    },
    orange: {
        textKey: 'color_scheme.orange', defaultText: "Orange", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", showWithoutEtymology: true,
    },
};
