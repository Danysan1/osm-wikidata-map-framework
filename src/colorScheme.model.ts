export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "source" | "picture" | "black" | "red" | "orange";

export interface ColorScheme {
    /** i18n translation key for the label to be shown in the dropdown item for this color scheme */
    textKey: string;
    /** Fixed color to be shown */
    color?: string;
    /** Whether this color scheme should be available when no etymology is available */
    showWithoutEtymology?: boolean;
    /** Whether this color scheme should be available when any etymology is available */
    showWithEtymology?: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    blue: {
        textKey: 'color_scheme.blue', color: '#3bb2d0', showWithoutEtymology: true, showWithEtymology: true,
    },
    source: {
        textKey: "color_scheme.source", showWithoutEtymology: true, showWithEtymology: true,
    },
    gender: {
        textKey: 'color_scheme.gender', showWithEtymology: true,
    },
    type: {
        textKey: 'color_scheme.type', showWithEtymology: true,
    },
    country: {
        textKey: 'color_scheme.country', showWithEtymology: true,
    },
    startCentury: {
        textKey: 'color_scheme.start_century', showWithEtymology: true,
    },
    endCentury: {
        textKey: 'color_scheme.end_century', showWithEtymology: true,
    },
    picture: {
        textKey: "color_scheme.feature_picture", showWithoutEtymology: true,
    },
    black: {
        textKey: 'color_scheme.black', color: '#223b53', showWithoutEtymology: true, showWithEtymology: true,
    },
    red: {
        textKey: 'color_scheme.red', color: '#e55e5e', showWithoutEtymology: true, showWithEtymology: true,
    },
    orange: {
        textKey: 'color_scheme.orange', color: '#fbb03b', showWithoutEtymology: true, showWithEtymology: true,
    },
};
