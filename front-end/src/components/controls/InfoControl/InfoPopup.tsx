import { useTranslation } from "next-i18next";
import Image from "next/image";
import { FC } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";

interface InfoPopupProps {
    lastUpdateDate?: string;
    className?: string;
    position: LngLat;
    onClose: () => void;
}

export const InfoPopup: FC<InfoPopupProps> = (props) => {
    const { t } = useTranslation();
    return <Popup longitude={props.position.lng} latitude={props.position.lat} className={props.className} maxWidth="none" closeButton closeOnClick closeOnMove onClose={props.onClose}>
        <header>
            <h1>{t("title")}</h1>
            <p>{t("description")}</p>
        </header>

        <div className="instructions_container hiddenElement">
            <p>{t("info_box.click_anywhere")}</p>
            <p>{t("info_box.use_controls")}</p>
            <table>
                <tbody>
                    <tr>
                        <td>📊</td>
                        <td>{t("info_box.to_see_statistics")}</td>
                    </tr>
                    <tr>
                        <td>🗃️</td>
                        <td>{t("info_box.to_choose_preset")}</td>
                    </tr>
                    <tr>
                        <td>⚙️</td>
                        <td>{t("info_box.to_choose_backend")}</td>
                    </tr>
                    <tr>
                        <td><Image src="img/Overpass-turbo.svg" width="16" height="16" alt="Overpass Turbo logo" loading="lazy" /></td>
                        <td>{t("info_box.to_overpass_query")}</td>
                    </tr>
                    <tr>
                        <td><Image src="img/Wikidata_Query_Service_Favicon.svg" width="16" height="16" alt="Wikidata Query Service logo" loading="lazy" /></td>
                        <td>{t("info_box.to_wikidata_query")}</td>
                    </tr>
                    <tr>
                        <td><Image src="img/Simple_icon_table.svg" width="16" height="13" alt="Table" loading="lazy" /></td>
                        <td>{t("info_box.to_view_data_table")}</td>
                    </tr>
                    <tr>
                        <td>🌍</td>
                        <td>{t("info_box.to_change_background")}</td>
                    </tr>
                    <tr>
                        <td>ℹ️</td>
                        <td>{t("info_box.to_open_again")}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <p>
            {process.env.owmf_contributing_url && <a title={t("info_box.contribute")} role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 contribute_button title_i18n_contribute" href={process.env.owmf_contributing_url} >
                <span className="button_img">📖</span> &nbsp;
                <span>{t("info_box.contribute")}</span>
            </a>}
            <a title="Download as dataset" role="button" className="hiddenElement k-button w3-button w3-white w3-border w3-round-large button-6 dataset_button title_i18n_download_dataset" href="dataset.csv">
                <span className="button_img">💾</span> &nbsp;
                <span>{t("info_box.download_dataset")}</span>
            </a>
        </p>

        <footer>
            {props.lastUpdateDate && <p><span>{t("info_box.last_db_update")}</span> {props.lastUpdateDate}</p>}
            <p>
                {t("info_box.based_on")}
                <a title="OSM-Wikidata Map Framework" aria-label="OSM-Wikidata Map Framework" href="https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework" target="_blank" rel="noopener noreferrer">OSM-Wikidata Map Framework</a>
                {process.env.owmf_framework_image_tag ?? ''}
            </p>
            <div id="last_info_row">
                {process.env.owmf_liberapay_id && <><a href={`https://liberapay.com/${process.env.owmf_liberapay_id}/donate`} id="liberapay_donate">
                    <Image alt="Donate using Liberapay" src="img/liberapay_donate.svg" width="72" height="26" />
                </a> | </>}

                {process.env.owmf_paypal_id && <><form action="https://www.paypal.com/donate" method="post" target="_top" id="paypal_donate">
                    <input type="hidden" name="business" value={process.env.owmf_paypal_id} />
                    <input type="hidden" name="no_recurring" value="0" />
                    <input type="hidden" name="item_name" value="This donation will help this project to stay up and running. Thank you!" />
                    <input type="hidden" name="currency_code" value="EUR" />
                    <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" className="paypal_donate_img" />
                </form>
                    |</>}
                <a title={t("info_box.about_me_title")} href="https://www.dsantini.it/" target="_blank" rel="noopener noreferrer">{t("about_me")}</a>
                {process.env.owmf_issues_url && <>
                    |
                    <a title={t("info_box.about_me_title")} className="i18n_report_issue title_i18n_report_issue" href={process.env.owmf_issues_url} target="_blank" rel="noopener noreferrer">Report a problem</a>
                </>}
            </div>
        </footer>
    </Popup>
}