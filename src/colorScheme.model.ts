export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "source" | "black" | "red" | "orange";

export interface ColorScheme {
    textKey: string;
    color?: string;
    urlCode: string | null;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    blue: { textKey: 'color_scheme.blue', color: '#3bb2d0', urlCode: null },
    source: {
        textKey: "color_scheme.source",
        urlCode: "sourceStats",
    },
    gender: {
        textKey: 'color_scheme.gender',
        urlCode: "genderStats",
    },
    type: {
        textKey: 'color_scheme.type',
        urlCode: "typeStats",
    },
    country: {
        textKey: 'color_scheme.country',
        urlCode: "countryStats",
    },
    startCentury: {
        textKey: 'color_scheme.start_century',
        urlCode: "startCenturyStats",
    },
    endCentury: {
        textKey: 'color_scheme.end_century',
        urlCode: "endCenturyStats",
    },
    black: { textKey: 'color_scheme.black', color: '#223b53', urlCode: null },
    red: { textKey: 'color_scheme.red', color: '#e55e5e', urlCode: null },
    orange: { textKey: 'color_scheme.orange', color: '#fbb03b', urlCode: null },
};
