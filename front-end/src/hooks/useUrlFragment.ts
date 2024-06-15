'use client';
import { ColorSchemeID } from "../model/colorScheme";

/**
 * @deprecated Use useUrlFragment instead
 */
export function getLon(): number | null {
    const raw = window.location.search.split(',')[0];
    if (!raw) return null;
    return parseFloat(raw);
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getLat(): number | null {
    const raw = window.location.search.split(',')[1];
    if (!raw) return null;
    return parseFloat(raw);
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getZoom(): number | null {
    const raw = window.location.search.split(',')[2];
    if (!raw) return null;
    return parseFloat(raw)
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getColorSchemeID(): ColorSchemeID | null {
    const raw = window.location.search.split(',')[3];
    if (!raw || !(raw in ColorSchemeID)) return null;
    return raw as ColorSchemeID;
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getBackEndID(): string | null {
    return window.location.search.split(',')[4] ?? null;
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getBackgroundStyleID(): string | null {
    return window.location.search.split(',')[5] ?? null;
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getSourcePresetID(): string | null {
    return window.location.search.split(',')[6] ?? null;
}