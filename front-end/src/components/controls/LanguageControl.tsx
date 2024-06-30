import type { ControlPosition } from "maplibre-gl";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DropdownControl, DropdownItem } from "./DropdownControl";

interface LanguageControlProps {
    position?: ControlPosition;
}

/**
 * Let the user choose the source preset from a list of presets.
 **/
export const LanguageControl: FC<LanguageControlProps> = (props) => {
    const { t, i18n } = useTranslation(),
        dropdownItems = useMemo(() => {
            const languageNames: Record<string, string> = {
                da: "Dansk",
                de: "Deutsch",
                en: "English",
                es: "Español",
                fr: "Français",
                it: "Italiano",
                ml: "മലയാളം",
            };
            return Object.keys(languageNames).map((lang): DropdownItem => ({
                id: lang,
                text: lang in languageNames ? languageNames[lang] : lang,
                onSelect: () => {
                    i18n.changeLanguage(lang).then(() => {
                        if (process.env.NODE_ENV === 'development') console.warn("LanguageControl: Changed language to " + lang);
                    }).catch((e) => {
                        if (process.env.NODE_ENV === 'development') console.error("LanguageControl: Failed changing language to " + lang, e);
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
        <tr>
            <td colSpan={2}>
                <a href="https://app.transifex.com/osm-wikidata-maps/osm-wikidata-map-framework/dashboard/" target="_blank" role="button" className="hiddenElement k-button w3-button w3-white w3-border w3-round-large button-6 translate_button" title={t("translate")} aria-label={t("translate")} >
                    <span className="button_img">🔣 &nbsp;</span>
                    <span>{t("translate")}</span>
                </a>
            </td>
        </tr>
    </DropdownControl>;
}
