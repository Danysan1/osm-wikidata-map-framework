import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { ChangeEventHandler, FC, useCallback } from "react";
import { useTranslation } from "react-i18next";

export const DateSelector: FC = () => {
  const { year, setYear } = useUrlFragmentContext(),
    { t } = useTranslation(),
    changeDate: ChangeEventHandler<HTMLInputElement> = useCallback(
      (e) => setYear(parseInt(e.target.value)),
      [setYear]
    );
  return (
    <label>
      {t("choose_year", "Choose the year:")}
      <input
        type="number"
        name="year"
        value={isNaN(year) ? "" : year}
        onChange={changeDate}
        min="-1000"
        max="2030"
        inputMode="numeric"
      ></input>
    </label>
  );
};
