export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "source" | "picture" | "black" | "red" | "orange";

export interface ColorScheme {
    /** i18n translation key for the label to be shown in the dropdown item for this color scheme */
    textKey: string;
    /** i18n translation key for the category of this color scheme */
    categoryKey: string;
    /** Fixed color to be shown */
    color?: string;
    /** Whether this color scheme should be available when no etymology is available */
    showWithoutEtymology?: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    source: {
        textKey: "color_scheme.source", categoryKey: 'color_scheme.feature_statistics', showWithoutEtymology: true,
    },
    picture: {
        textKey: "color_scheme.feature_picture", categoryKey: 'color_scheme.feature_statistics', showWithoutEtymology: true,
    },
    gender: {
        textKey: 'color_scheme.gender', categoryKey: 'color_scheme.etymology_statistics',
    },
    type: {
        textKey: 'color_scheme.type', categoryKey: 'color_scheme.etymology_statistics',
    },
    country: {
        textKey: 'color_scheme.country', categoryKey: 'color_scheme.etymology_statistics',
    },
    startCentury: {
        textKey: 'color_scheme.start_century', categoryKey: 'color_scheme.etymology_statistics',
    },
    endCentury: {
        textKey: 'color_scheme.end_century', categoryKey: 'color_scheme.etymology_statistics',
    },
    blue: {
        textKey: 'color_scheme.blue', categoryKey: 'color_scheme.uniform', color: '#3bb2d0', showWithoutEtymology: true,
    },
    black: {
        textKey: 'color_scheme.black', categoryKey: 'color_scheme.uniform', color: '#223b53', showWithoutEtymology: true,
    },
    red: {
        textKey: 'color_scheme.red', categoryKey: 'color_scheme.uniform', color: '#e55e5e', showWithoutEtymology: true,
    },
    orange: {
        textKey: 'color_scheme.orange', categoryKey: 'color_scheme.uniform', color: '#fbb03b', showWithoutEtymology: true,
    },
};
