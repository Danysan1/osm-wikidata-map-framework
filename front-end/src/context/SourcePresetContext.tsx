"use client";

import { SourcePreset } from "@/src/model/SourcePreset";
import { CombinedCachedMapService } from "@/src/services/CombinedCachedMapService";
import { MapService } from "@/src/services/MapService";
import { fetchSourcePreset } from "@/src/SourcePreset/client";
import {
    FC,
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useState
} from "react";
import { useTranslation } from "react-i18next";
import { useSnackbarContext } from "./SnackbarContext";
import { useUrlFragmentContext } from "./UrlFragmentContext";

interface SourcePresetState {
    sourcePreset?: SourcePreset;
    backEndService?: MapService;
}

const SourcePresetContext = createContext<SourcePresetState>({});

/**
 * Handles the fetch of the source preset and the update of the back-end service each time the selected preset changes
 */
export const useSourcePresetContext = () => useContext(SourcePresetContext);

export const SourcePresetContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const { sourcePresetID } = useUrlFragmentContext(),
        [fetchedSourcePreset, setFetchedSourcePreset] = useState<SourcePreset>(),
        [sourcePreset, setSourcePreset] = useState<SourcePreset>(),
        [backEndService, setBackEndService] = useState<MapService>(),
        { showSnackbar } = useSnackbarContext(),
        { t } = useTranslation();

    useEffect(() => {
        if (sourcePreset?.id === sourcePresetID) {
            console.log("Skipping redundant source preset fetch", {
                new: sourcePresetID,
                old: sourcePreset?.id,
            });
            return;
        }

        console.debug("Fetching source preset", {
            new: sourcePresetID,
            old: sourcePreset?.id,
        });
        fetchSourcePreset(sourcePresetID)
            .then(setFetchedSourcePreset)
            .catch((e) => {
                //setBackEndService(null);
                //setSourcePreset(null);
                console.error("Failed updating source preset", e);
                showSnackbar(t("snackbar.map_error"));
            });
    }, [showSnackbar, sourcePreset?.id, sourcePresetID, t]);

    // The intermediate variable fetchedSourcePreset is needed to prevent setting the wrong sourcePreset when different presets are fetched in very close succession
    useEffect(() => {
        if (!fetchedSourcePreset) return;

        if (fetchedSourcePreset.id !== sourcePresetID) {
            console.warn("Not setting wrong source preset", {
                sourcePresetID,
                new: fetchedSourcePreset.id,
            });
            return;
        }

        setSourcePreset((oldPreset) => {
            if (oldPreset?.id === fetchedSourcePreset?.id) {
                console.log("Skipping redundant source preset update", {
                    old: oldPreset?.id,
                    new: fetchedSourcePreset.id,
                });
                return oldPreset;
            }

            console.debug("Updating source preset", {
                old: oldPreset?.id,
                new: fetchedSourcePreset.id,
            });
            setBackEndService(new CombinedCachedMapService(fetchedSourcePreset));
            return fetchedSourcePreset;
        });
    }, [fetchedSourcePreset, sourcePresetID]);

    return (
        <SourcePresetContext.Provider value={{ sourcePreset, backEndService }} >
            {children}
        </SourcePresetContext.Provider>
    );
};
