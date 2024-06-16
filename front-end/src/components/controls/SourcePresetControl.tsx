import { parseStringArrayConfig } from "@/src/config";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { DEFAULT_SOURCE_PRESET_ID } from "@/src/model/SourcePreset";
import { useTranslation } from "next-i18next";
import { FC, useMemo } from "react";
import { DropdownControl } from "./DropdownControl";

interface SourcePresetControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    className?: string;
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
        buttonPosition={props.position === 'top-left' || props.position === 'bottom-left' ? 'left' : 'right'}
        className={props.className}
    />;
}
