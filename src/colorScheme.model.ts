import { Expression } from "mapbox-gl";

export type ColorSchemeID = "blue" | "gender" | "type" | "century" | "source" | "black" | "red" | "orange";

export interface ColorScheme {
    textKey: string;
    color: string | Expression;
    colorField: string | null;
    urlCode: string | null;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    blue: { textKey: 'color_scheme.blue', color: '#3bb2d0', colorField: null, urlCode: null },
    source: {
        colorField: "source_color",
        textKey: "color_scheme.source",
        color: ['get', 'source_color'],
        urlCode: "sourceStats",
    },
    gender: {
        colorField: 'gender_color',
        textKey: 'color_scheme.gender',
        color: ['get', 'gender_color'],
        urlCode: "genderStats",
    },
    type: {
        colorField: 'type_color',
        textKey: 'color_scheme.type',
        color: ['get', 'type_color'],
        urlCode: "typeStats",
    },
    century: {
        colorField: 'century_color',
        textKey: 'color_scheme.century',
        color: ['get', 'century_color'],
        urlCode: "centuryStats",
    },
    black: { textKey: 'color_scheme.black', color: '#223b53', colorField: null, urlCode: null },
    red: { textKey: 'color_scheme.red', color: '#e55e5e', colorField: null, urlCode: null },
    orange: { textKey: 'color_scheme.orange', color: '#fbb03b', colorField: null, urlCode: null },
};
