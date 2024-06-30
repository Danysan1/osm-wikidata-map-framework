import { parseStringArrayConfig } from "@/src/config";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { DEFAULT_SOURCE_PRESET_ID } from "@/src/model/SourcePreset";
import { ControlPosition } from "maplibre-gl";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DropdownControl } from "./DropdownControl";

interface SourcePresetControlProps {
    position?: ControlPosition;
}

/**
 * Let the user choose the source preset from a list of presets.
 **/
export const SourcePresetControl: FC<SourcePresetControlProps> = (props) => {
    const { t } = useTranslation(),
        {sourcePresetID, setSourcePresetID} = useUrlFragmentContext(),
        dropdownItems = useMemo(() => {
            const sourcePresetIDs = process.env.owmf_source_presets ? parseStringArrayConfig(process.env.owmf_source_presets) : [DEFAULT_SOURCE_PRESET_ID];
            return sourcePresetIDs.map(
                sourcePresetID => ({
                    id: sourcePresetID,
                    text: t("preset." + sourcePresetID),
                    onSelect: () => setSourcePresetID(sourcePresetID)
                })
            );
        }, [setSourcePresetID, t]);

    return <DropdownControl
        buttonContent="🗃️"
        dropdownItems={dropdownItems}
        selectedValue={sourcePresetID}
        title={t("preset.choose_preset")}
        position={props.position}
        className='preset-ctrl'
    />;
}
