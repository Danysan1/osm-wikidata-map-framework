import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const LastDbUpdate: FC = () => {
  const { t } = useTranslation(),
    [lastUpdateDate, setLastUpdateDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url) {
      fetch(process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url + "date.txt")
        .then((res) => {
          if (!res.ok) {
            console.error("Failed to fetch last update date: ", res);
          } else {
            res
              .text()
              .then((text) => setLastUpdateDate(text.trim()))
              .catch(console.error);
          }
        })
        .catch((e) => console.error("Failed to fetch last update date: ", e));
    }
  }, []);

  return (
    lastUpdateDate && (
      <p>
        <span>{t("info_box.last_db_update")}</span> {lastUpdateDate}
      </p>
    )
  );
};
