import "@maptiler/geocoding-control/style.css";
import { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// import "maplibre-gl-inspect/dist/maplibre-gl-inspect.css";

import { logErrorMessage } from '../owmf-front-end/src/monitoring';
import { showSnackbar } from '../owmf-front-end/src/snackbar';
import { loadTranslator } from './i18n';
import './style.css';

export class EtymologyMap extends Map {

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
     */
    private async mapErrorHandler(err: ErrorEvent & { sourceId?: string }) {
        let errorMessage;
        const t = await loadTranslator();
        if (err.sourceId && [ELEMENTS_SOURCE, DETAILS_SOURCE].includes(err.sourceId)) {
            this.fetchCompleted();
            showSnackbar(t("snackbar.fetch_error", "An error occurred while fetching the data"));
            errorMessage = "An error occurred while fetching " + err.sourceId;
        } else {
            showSnackbar(t("snackbar.map_error"));
            errorMessage = "Map error: " + err.sourceId
        }
        logErrorMessage(errorMessage, "error", { error: err });
    }
}