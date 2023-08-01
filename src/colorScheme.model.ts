import { ExpressionSpecification } from 'maplibre-gl';
// import { Expression as ExpressionSpecification } from 'mapbox-gl';

export type ColorSchemeID = "blue" | "gender" | "type" | "country" | "startCentury" | "endCentury" | "source" | "black" | "red" | "orange";

export interface ColorScheme {
    textKey: string;
    color: string | ExpressionSpecification;
    urlCode: string | null;
}

export const colorSchemes: Record<ColorSchemeID, ColorScheme> = {
    blue: { textKey: 'color_scheme.blue', color: '#3bb2d0', urlCode: null },
    source: {
        textKey: "color_scheme.source",
        color: ['get', 'source_color'],
        urlCode: "sourceStats",
    },
    gender: {
        textKey: 'color_scheme.gender',
        color: ['get', 'gender_color'],
        urlCode: "genderStats",
    },
    type: {
        textKey: 'color_scheme.type',
        color: ['get', 'type_color'],
        urlCode: "typeStats",
    },
    country: {
        textKey: 'color_scheme.country',
        color: ['get', 'country_color'],
        urlCode: "countryStats",
    },
    startCentury: {
        textKey: 'color_scheme.start_century',
        color: ['get', 'start_century_color'],
        urlCode: "startCenturyStats",
    },
    endCentury: {
        textKey: 'color_scheme.end_century',
        color: ['get', 'end_century_color'],
        urlCode: "endCenturyStats",
    },
    black: { textKey: 'color_scheme.black', color: '#223b53', urlCode: null },
    red: { textKey: 'color_scheme.red', color: '#e55e5e', urlCode: null },
    orange: { textKey: 'color_scheme.orange', color: '#fbb03b', urlCode: null },
};
