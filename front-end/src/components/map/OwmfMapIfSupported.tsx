"use client";

import { BackgroundStyleContextProvider } from "@/src/context/BackgroundStyleContext";
import { LoadingSpinnerContextProvider } from "@/src/context/LoadingSpinnerContext";
import { SnackbarContextProvider } from "@/src/context/SnackbarContext";
import { SourcePresetContextProvider } from "@/src/context/SourcePresetContext";
import { UrlFragmentContextProvider } from "@/src/context/UrlFragmentContext";
import { loadServerI18n } from "@/src/i18n/server";
import { useEffect, useState } from "react";
import { OwmfMap } from "./OwmfMap";

loadServerI18n().then(
  ({ i18n }) => { console.debug("Loaded i18n:", i18n.language); }
).catch((e) => { throw e; });

export function OwmfMapIfSupported() {
  const [isWebglSupported, setIsWebglSupported] = useState(true);

  useEffect(() => {
    // https://maplibre.org/maplibre-gl-js/docs/examples/check-for-support/
    // This must be run in a useEffect or Next would try to pre-render it causing an error "window is not defined"
    if (!window.WebGLRenderingContext) {
      console.warn("WebGL not supported");
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
            <SourcePresetContextProvider>
              <OwmfMap />
            </SourcePresetContextProvider>
          </BackgroundStyleContextProvider>
        </LoadingSpinnerContextProvider>
      </SnackbarContextProvider>
    </UrlFragmentContextProvider>
  ) : (
    "Your browser does not support WebGL and Maplibre GL JS, which are needed to render the map."
  );
}
