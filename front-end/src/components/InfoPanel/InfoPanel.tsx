import overpassLogo from "@/src/img/Overpass-turbo.svg";
import dataTableIcon from "@/src/img/Simple_icon_table.svg";
import wikidataLogo from "@/src/img/Wikidata_Query_Service_Favicon.svg";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import styles from "./InfoPanel.module.css";
import liberapayDonate from "./liberapay_donate.svg";
import { getActiveSourcePresetIDs } from "@/src/SourcePreset/common";

interface InfoPanelProps {
  showInstructions?: boolean;
}

export const InfoPanel: FC<InfoPanelProps> = ({ showInstructions }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className={styles.info_panel}>
      <header>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </header>

      {showInstructions && <div className={styles.instructions_container}>
        <p>{t("info_box.click_anywhere")}</p>
        <p>{t("info_box.use_controls")}</p>
        <table>
          <tbody>
            <tr>
              <td>📊</td>
              <td>{t("info_box.to_see_statistics")}</td>
            </tr>
            {getActiveSourcePresetIDs().length > 1 && (
              <tr>
                <td>🗃️</td>
                <td>{t("info_box.to_choose_preset")}</td>
              </tr>
            )}
            <tr>
              <td>⚙️</td>
              <td>{t("info_box.to_choose_backend")}</td>
            </tr>
            <tr>
              <td>
                <Image
                  src={overpassLogo as StaticImport}
                  width="16"
                  height="16"
                  alt="Overpass Turbo logo"
                  loading="lazy"
                  className={styles.table_img}
                />
              </td>
              <td>{t("info_box.to_overpass_query")}</td>
            </tr>
            <tr>
              <td>
                <Image
                  src={wikidataLogo as StaticImport}
                  width="16"
                  height="16"
                  alt="Wikidata Query Service logo"
                  loading="lazy"
                  className={styles.table_img}
                />
              </td>
              <td>{t("info_box.to_wikidata_query")}</td>
            </tr>
            <tr>
              <td>
                <Image
                  src={dataTableIcon as StaticImport}
                  width="16"
                  height="13"
                  alt="Table symbol"
                  loading="lazy"
                  className={styles.table_img}
                />
              </td>
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
      </div>}

      <p>
        <Button
          className={styles.contribute_button}
          href={`/${i18n.language}/contributing`}
          iconText="📖"
          iconAlt="Contribute symbol"
          showText
          text={t("info_box.contribute")}
          title={t("info_box.contribute")}
        />
      </p>

      <footer>
        <p>
          {t("info_box.based_on")}&nbsp;
          <a
            title="OSM-Wikidata Map Framework"
            aria-label="OSM-Wikidata Map Framework"
            href="https://wiki.openstreetmap.org/wiki/OSM-Wikidata_Map_Framework"
            target="_blank"
            rel="noopener noreferrer"
          >
            OSM-Wikidata Map Framework
          </a>
          &nbsp;
          {process.env.NEXT_PUBLIC_OWMF_version}
        </p>
        <div className={styles.last_info_row}>
          {process.env.NEXT_PUBLIC_OWMF_liberapay_id && (
            <>
              <a
                href={`https://liberapay.com/${process.env.NEXT_PUBLIC_OWMF_liberapay_id}/donate`}
                className={styles.liberapay_donate}
              >
                <Image
                  alt="Donate using Liberapay"
                  src={liberapayDonate as StaticImport}
                  width="72"
                  height="26"
                />
              </a>
              &nbsp;|&nbsp;
            </>
          )}

          {process.env.NEXT_PUBLIC_OWMF_paypal_id && (
            <>
              <form
                action="https://www.paypal.com/donate"
                method="post"
                target="_top"
                id="paypal_donate"
                className={styles.paypal_donate}
              >
                <input type="hidden" name="business" value={process.env.NEXT_PUBLIC_OWMF_paypal_id} />
                <input type="hidden" name="no_recurring" value="0" />
                <input
                  type="hidden"
                  name="item_name"
                  value="This donation will help this project to stay up and running. Thank you!"
                />
                <input type="hidden" name="currency_code" value="EUR" />
                <input
                  type="image"
                  src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif"
                  name="submit"
                  title="PayPal - The safer, easier way to pay online!"
                  alt="Donate with PayPal button"
                  className="paypal_donate_img"
                />
              </form>
              &nbsp;|&nbsp;
            </>
          )}
          <a
            title={t("info_box.about_me_title")}
            href="https://www.dsantini.it/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("info_box.about_me")}
          </a>
          {process.env.NEXT_PUBLIC_OWMF_issues_url && (
            <>
              &nbsp;|&nbsp;
              <a
                title={t("info_box.report_issue_title")}
                href={process.env.NEXT_PUBLIC_OWMF_issues_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("info_box.report_issue")}
              </a>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
