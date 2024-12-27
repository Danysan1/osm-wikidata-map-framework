import { LANGUAGES } from "@/src/i18n/common";
import type { ControlPosition } from "maplibre-gl";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { DropdownControl, DropdownItem } from "./DropdownControl/DropdownControl";

interface LanguageControlProps {
    position?: ControlPosition;
}

/**
 * Let the user choose the source preset from a list of presets.
 **/
export const LanguageControl: FC<LanguageControlProps> = (props) => {
    const { t, i18n } = useTranslation(),
        dropdownItems = useMemo(() => {
            return Object.keys(LANGUAGES).map((lang): DropdownItem => ({
                id: lang,
                text: lang in LANGUAGES ? LANGUAGES[lang] : lang,
                onSelect: () => {
                    i18n.changeLanguage(lang).then(() => {
                        console.warn("LanguageControl: Changed language to " + lang);
                    }).catch((e) => {
                        console.error("LanguageControl: Failed changing language to " + lang, e);
                    });
                }
            }));
        }, [i18n]);

    return <DropdownControl
        buttonContent="🔣"
        dropdownItems={dropdownItems}
        selectedValue={i18n.language}
        title={t("change_language")}
        position={props.position}
        className='language-ctrl'
    >
        <Button
            href="https://app.transifex.com/osm-wikidata-maps/osm-wikidata-map-framework/dashboard/"
            className="translate_button"
            title={t("translate")}
            iconText="🔣"
            iconAlt="Translation symbol"
            text={t("translate")}
            showText
        />
    </DropdownControl>;
}
