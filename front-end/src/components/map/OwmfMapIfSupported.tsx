"use client";

import { UrlFragmentContextProvider } from "@/src/context/UrlFragmentContext";
import { loadClientI18n } from "@/src/i18n/client";
import { useEffect, useState } from "react";
import { OwmfMap } from "./OwmfMap/OwmfMap";

interface Props {
    lang?: string;
}

export function OwmfMapIfSupported({ lang }: Props) {
    const [isWebglSupported, setIsWebglSupported] = useState(false);

    useEffect(() => {
        // https://maplibre.org/maplibre-gl-js/docs/examples/check-for-support/
        if (!window.WebGLRenderingContext) {
            console.warn("WebGL not supported");
            setIsWebglSupported(false);
        } else {
            const canvas = document.createElement("canvas");
            try {
                const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
                if (context && typeof context.getParameter == "function") {
                    setIsWebglSupported(true);
                } else {
                    console.warn("WebGL not supported", context);
                    setIsWebglSupported(false);
                }
            } catch (e) {
                console.warn("WebGL is supported, but disabled", e);
                setIsWebglSupported(false);
            }
        }
    }, []);

    useEffect(() => {
        loadClientI18n(lang).catch((e) => {
            if (process.env.NODE_ENV === "development")
                console.error("Failed loading translator", e);
        });
    });

    return isWebglSupported ? (
        <UrlFragmentContextProvider>
            <OwmfMap />
        </UrlFragmentContextProvider>
    ) : "Your browser does not support WebGL and Maplibre GL JS, which are needed to render the map.";
}