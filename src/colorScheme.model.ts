export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "source" | "picture" | "black" | "red" | "orange";

export interface ColorScheme {
    /** i18n translation key for the label to be shown in the dropdown item for this color scheme */
    textKey: string;
    /** Fallback text for the label to be shown in the dropdown item for this color scheme */
    defaultText: string;
    /** Fixed color to be shown */
    color?: string;
    /** Whether this color scheme should be available when no etymology is available */
    showWithoutEtymology?: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    source: {
        textKey: "color_scheme.source", defaultText: "By source", showWithoutEtymology: true,
    },
    picture: {
        textKey: "color_scheme.feature_picture", defaultText: "By picture availability", showWithoutEtymology: true,
    },
    gender: {
        textKey: 'color_scheme.gender', defaultText: "By gender",
    },
    type: {
        textKey: 'color_scheme.type', defaultText: "By type",
    },
    country: {
        textKey: 'color_scheme.country', defaultText: "By country",
    },
    startCentury: {
        textKey: 'color_scheme.start_century', defaultText: "By start/birth century",
    },
    endCentury: {
        textKey: 'color_scheme.end_century', defaultText: "By end/death century",
    },
    blue: {
        textKey: 'color_scheme.blue', defaultText: "Blue", color: '#3bb2d0', showWithoutEtymology: true,
    },
    black: {
        textKey: 'color_scheme.black', defaultText: "Black", color: '#223b53', showWithoutEtymology: true,
    },
    red: {
        textKey: 'color_scheme.red', defaultText: "Red", color: '#e55e5e', showWithoutEtymology: true,
    },
    orange: {
        textKey: 'color_scheme.orange', defaultText: "Orange", color: '#fbb03b', showWithoutEtymology: true,
    },
};
