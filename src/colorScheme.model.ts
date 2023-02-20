import { Expression } from "mapbox-gl";

export type ColorSchemeID = "blue" | "gender" | "type" | "century" | "source" | "black" | "red" | "orange";

export interface ColorScheme {
    text: string;
    color: string | Expression;
    colorField: string | null;
    urlCode: string | null;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    blue: { text: 'Uniform blue', color: '#3bb2d0', colorField: null, urlCode: null },
    gender: {
        colorField: 'gender_color',
        text: 'By gender',
        color: ['get', 'gender_color'],
        urlCode: "genderStats",
    },
    type: {
        colorField: 'type_color',
        text: 'By type',
        color: ['get', 'type_color'],
        urlCode: "typeStats",
    },
    century: {
        colorField: 'century_color',
        text: 'By century',
        color: ['get', 'century_color'],
        urlCode: "centuryStats",
    },
    source: {
        colorField: "source_color",
        text: "By source",
        color: ['get', 'source_color'],
        urlCode: "sourceStats",
    },
    black: { text: 'Uniform black', color: '#223b53', colorField: null, urlCode: null },
    red: { text: 'Uniform red', color: '#e55e5e', colorField: null, urlCode: null },
    orange: { text: 'Uniform orange', color: '#fbb03b', colorField: null, urlCode: null },
};
