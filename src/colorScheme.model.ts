export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "source" | "picture" | "black" | "red" | "orange";

export interface ColorScheme {
    /** i18n translation key for the label to be shown in the dropdown item for this color scheme */
    textKey: string;
    /** Fixed color to be shown */
    color?: string;
    /** Whether this color scheme should be available when no etymology is available */
    showWithoutEtymology?: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    source: {
        textKey: "color_scheme.source", showWithoutEtymology: true,
    },
    picture: {
        textKey: "color_scheme.feature_picture", showWithoutEtymology: true,
    },
    gender: {
        textKey: 'color_scheme.gender',
    },
    type: {
        textKey: 'color_scheme.type',
    },
    country: {
        textKey: 'color_scheme.country',
    },
    startCentury: {
        textKey: 'color_scheme.start_century',
    },
    endCentury: {
        textKey: 'color_scheme.end_century',
    },
    blue: {
        textKey: 'color_scheme.blue', color: '#3bb2d0', showWithoutEtymology: true,
    },
    black: {
        textKey: 'color_scheme.black', color: '#223b53', showWithoutEtymology: true,
    },
    red: {
        textKey: 'color_scheme.red', color: '#e55e5e', showWithoutEtymology: true,
    },
    orange: {
        textKey: 'color_scheme.orange', color: '#fbb03b', showWithoutEtymology: true,
    },
};
