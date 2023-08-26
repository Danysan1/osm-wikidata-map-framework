export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "source" | "black" | "red" | "orange";

export interface ColorScheme {
    textKey: string;
    color?: string;
    urlCode: string | null;
    requiresEtymology: boolean;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    blue: { textKey: 'color_scheme.blue', color: '#3bb2d0', urlCode: null, requiresEtymology: false },
    source: {
        textKey: "color_scheme.source",
        urlCode: "sourceStats",
        requiresEtymology: false,
    },
    gender: {
        textKey: 'color_scheme.gender',
        urlCode: "genderStats",
        requiresEtymology: true,
    },
    type: {
        textKey: 'color_scheme.type',
        urlCode: "typeStats",
        requiresEtymology: true,
    },
    country: {
        textKey: 'color_scheme.country',
        urlCode: "countryStats",
        requiresEtymology: true,
    },
    startCentury: {
        textKey: 'color_scheme.start_century',
        urlCode: "startCenturyStats",
        requiresEtymology: true,
    },
    endCentury: {
        textKey: 'color_scheme.end_century',
        urlCode: "endCenturyStats",
        requiresEtymology: true,
    },
    black: { textKey: 'color_scheme.black', color: '#223b53', urlCode: null, requiresEtymology: false },
    red: { textKey: 'color_scheme.red', color: '#e55e5e', urlCode: null, requiresEtymology: false },
    orange: { textKey: 'color_scheme.orange', color: '#fbb03b', urlCode: null, requiresEtymology: false },
};
