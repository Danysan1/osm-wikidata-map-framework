export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "feature_source" | "etymology_source" | "picture" | "black" | "red" | "orange";

export interface ColorScheme {
    /** i18n translation key for the label to be shown in the dropdown item for this color scheme */
    textKey: string;
    /** Fallback text for the label to be shown in the dropdown item for this color scheme */
    defaultText: string;
    /** i18n translation key for the label to be shown in the dropdown category for this  */
    categoryKey: string;
    /** Fallback text for the label to be shown in the dropdown category for this  */
    defaultCategoryText: string;
    /** Fixed color to be shown */
    color?: string;
    /** Whether this color scheme should be available when no etymology is available */
    showWithoutEtymology?: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    feature_source: {
        textKey: "color_scheme.feature_source", defaultText: "By source", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", showWithoutEtymology: true,
    },
    picture: {
        textKey: "color_scheme.feature_picture", defaultText: "By picture availability", categoryKey: "color_scheme.feature_statistics", defaultCategoryText: "Feature statistics", showWithoutEtymology: true,
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
    startCentury: {
        textKey: 'color_scheme.start_century', defaultText: "By start/birth century", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    endCentury: {
        textKey: 'color_scheme.end_century', defaultText: "By end/death century", categoryKey: "color_scheme.etymology_statistics", defaultCategoryText: "Linked entity statistics",
    },
    blue: {
        textKey: 'color_scheme.blue', defaultText: "Blue", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", color: '#3bb2d0', showWithoutEtymology: true,
    },
    black: {
        textKey: 'color_scheme.black', defaultText: "Black", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", color: '#223b53', showWithoutEtymology: true,
    },
    red: {
        textKey: 'color_scheme.red', defaultText: "Red", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", color: '#e55e5e', showWithoutEtymology: true,
    },
    orange: {
        textKey: 'color_scheme.orange', defaultText: "Orange", categoryKey: "color_scheme.uniform", defaultCategoryText: "Uniform", color: '#fbb03b', showWithoutEtymology: true,
    },
};
