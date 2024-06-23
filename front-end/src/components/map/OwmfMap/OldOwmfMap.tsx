"use client";
import { EtymologyColorControl } from '@/src/controls/EtymologyColorControl';
import { SourcePreset } from '@/src/model/SourcePreset';
import { CombinedCachedMapService } from '@/src/services/CombinedCachedMapService';
import { ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback } from 'react';
import styles from "./OwmfMap.module.css";

export default function OwmfMap() {

  const updatePresetDependantControls = useCallback((preset: SourcePreset) => {
    console.debug("updatePresetDependantControls: updating", preset);
    setBackEndService(new CombinedCachedMapService(preset));

    const thresholdZoomLevel = parseInt(process.env.owmf_threshold_zoom_level ?? "14"),
      setLayerColor = (color: string | ExpressionSpecification) => {
        if (process.env.NODE_ENV === 'development') console.debug("initWikidataControls set layer color", { color });
        [
          [DETAILS_SOURCE + POINT_LAYER, "circle-color"],
          [DETAILS_SOURCE + LINE_LAYER, 'line-color'],
          [DETAILS_SOURCE + POLYGON_FILL_LAYER, 'fill-extrusion-color'],
          [DETAILS_SOURCE + POLYGON_BORDER_LAYER, 'line-color'],
        ].forEach(([layerID, property]) => {
          if (map.current?.getLayer(layerID)) {
            map.current.setPaintProperty(layerID, property, color);
          } else {
            console.warn("Layer does not exist, can't set property", { layerID, property, color });
          }
        });
      },
      newColorControl = new EtymologyColorControl(
        preset,
        colorScheme,
        setColorScheme,
        setLayerColor,
        t,
        DETAILS_SOURCE,
        [DETAILS_SOURCE + POINT_LAYER, DETAILS_SOURCE + LINE_LAYER, DETAILS_SOURCE + POLYGON_BORDER_LAYER]
      );
    setColorControl(oldControl => {
      if (!map.current || oldControl === newColorControl) return oldControl;
      if (oldControl) map.current?.removeControl(oldControl);
      map.current.addControl(newColorControl, 'top-left');
      return newColorControl;
    });
  }, [backEndID, colorScheme, setBackEndID, setColorScheme, t]);

  return (
    <div className={styles["map-wrap"]}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
}
