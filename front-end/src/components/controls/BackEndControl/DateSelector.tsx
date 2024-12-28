import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { ChangeEventHandler, FC, useCallback } from "react";
import { useTranslation } from "react-i18next";

export const DateSelector: FC = () => {
  const { year, setYear } = useUrlFragmentContext(),
    {t} = useTranslation(),
    changeDate: ChangeEventHandler<HTMLInputElement> = useCallback(
      (e) => setYear(parseInt(e.target.value)),
      [setYear]
    );
  return <label>{t("choose_year")} <input type="number" value={year} onChange={changeDate}></input></label>;
};
