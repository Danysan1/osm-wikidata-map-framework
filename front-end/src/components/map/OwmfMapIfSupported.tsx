"use client";

import { BackgroundStyleContextProvider } from "@/src/context/BackgroundStyleContext";
import { LoadingSpinnerContextProvider } from "@/src/context/LoadingSpinnerContext";
import { SnackbarContextProvider } from "@/src/context/SnackbarContext";
import { UrlFragmentContextProvider } from "@/src/context/UrlFragmentContext";
import { loadClientI18n } from "@/src/i18n/client";
import { useEffect, useState } from "react";
import { OwmfMap } from "./OwmfMap";

loadClientI18n().catch((e) => {
  throw e;
});

export function OwmfMapIfSupported() {
  const [isWebglSupported, setIsWebglSupported] = useState(true);

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

  return isWebglSupported ? (
    <UrlFragmentContextProvider>
      <SnackbarContextProvider>
        <LoadingSpinnerContextProvider>
          <BackgroundStyleContextProvider>
            <OwmfMap />
          </BackgroundStyleContextProvider>
        </LoadingSpinnerContextProvider>
      </SnackbarContextProvider>
    </UrlFragmentContextProvider>
  ) : (
    "Your browser does not support WebGL and Maplibre GL JS, which are needed to render the map."
  );
}
