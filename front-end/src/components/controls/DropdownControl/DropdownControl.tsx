import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import type { ControlPosition, IControl, Map, MapSourceDataEvent } from "maplibre-gl";
import {
  ChangeEvent,
  ChangeEventHandler,
  FC,
  PropsWithChildren,
  cloneElement,
  useCallback,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useControl } from "react-map-gl/maplibre";
import styles from "./DropdownControl.module.css";

class DropdownControlObject implements IControl {
  private _map?: Map;
  private _container?: HTMLElement;
  private _onSourceData?: (e: MapSourceDataEvent) => void;

  constructor(onSourceData?: (e: MapSourceDataEvent) => void) {
    this._onSourceData = onSourceData;
  }

  onAdd(map: Map) {
    this._map = map;
    if (this._onSourceData) map.on("sourcedata", this._onSourceData);
    this._container = document.createElement("div");
    this._container.className = `maplibregl-ctrl maplibregl-ctrl-group ${styles.control}`;
    return this._container;
  }

  onRemove() {
    this._container?.remove();
    this._container = undefined;
    if (this._onSourceData) {
      this._map?.off("sourcedata", this._onSourceData);
      this._onSourceData = undefined;
    }
    this._map = undefined;
  }

  getMap() {
    return this._map;
  }

  getContainer() {
    return this._container;
  }
}

export interface DropdownItem {
  id: string;
  text: string;
  category?: string | null;
  onSelect: (event: ChangeEvent<HTMLSelectElement>) => void;
}

interface DropdownControlProps extends PropsWithChildren {
  buttonContent: string;
  dropdownItems: DropdownItem[];
  selectedValue: string;
  title: string;
  minZoomLevel?: number;
  position?: ControlPosition;
  className?: string;
  onSourceData?: (e: MapSourceDataEvent) => void;
}

/**
 * Let the user choose something through a dropdown.
 *
 * Control implemented as ES6 class and integrated in React through createPortal()
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 * @see https://react.dev/reference/react-dom/createPortal
 * @see https://github.com/visgl/react-map-gl/blob/7.0-release/examples/custom-overlay/src/custom-overlay.tsx
 */
export const DropdownControl: FC<DropdownControlProps> = ({
  buttonContent, dropdownItems, selectedValue, title, minZoomLevel, position, className, onSourceData, children
}) => {
  const { zoom } = useUrlFragmentContext(),
    dropdownId = `dropdown_${className}`,
    ctrl = useControl<DropdownControlObject>(
      () => {
        return new DropdownControlObject(onSourceData);
      },
      { position: position }
    ),
    buttonOnTheLeft = position === "top-left" || position === "bottom-left",
    visible =
      dropdownItems.length > 1 &&
      (minZoomLevel === undefined || zoom >= minZoomLevel),
    [dropdownToggled, setDropdownToggled] = useState(false),
    onBtnClick = useCallback(() => setDropdownToggled((prev) => !prev), []),
    btnCell = useMemo(
      () => (
        <td className={styles.button_cell}>
          <button
            onClick={onBtnClick}
            className={styles.button}
            title={title}
            aria-label={title}
          >
            {buttonContent}
          </button>
        </td>
      ),
      [onBtnClick, buttonContent, title]
    ),
    titleCell = useMemo(
      () => (
        <td className={dropdownToggled ? styles.show_on_mobile : styles.show_on_desktop}>
          <label htmlFor={dropdownId} className={styles.title}>
            {title}
          </label>
        </td>
      ),
      [dropdownId, dropdownToggled, title]
    ),
    dropDownChangeHandler: ChangeEventHandler<HTMLSelectElement> = useCallback(
      (e) => {
        const selectedID = e.target.value,
          selectedItem = dropdownItems.find((item) => item.id === selectedID);
        selectedItem && selectedItem.onSelect(e);
      },
      [dropdownItems]
    ),
    options = useMemo(() => {
      const itemToOption = (item: DropdownItem): JSX.Element => (
        <option key={item.id} value={item.id} title={item.text} aria-label={item.text}>
          {item.text}
        </option>
      );
      const categories = new Set(
        dropdownItems.filter((item) => item.category).map((item) => item.category!)
      );

      return (
        <>
          {Array.from(categories).map((category) => (
            <optgroup key={category} label={category}>
              {dropdownItems
                .filter((item) => item.category === category)
                .map(itemToOption)}
            </optgroup>
          ))}
          {dropdownItems.filter((item) => !item.category).map(itemToOption)}
        </>
      );
    }, [dropdownItems]);

  const element = useMemo(
    () =>
      visible ? (
        <div className={className}>
          <table className={styles.ctrl_table}>
            <tbody>
              <tr>
                {buttonOnTheLeft ? btnCell : titleCell}
                {buttonOnTheLeft ? titleCell : btnCell}
              </tr>
              <tr className={dropdownToggled ? styles.show_on_mobile : styles.show_on_desktop}>
                <td colSpan={2} className={styles.dropdown_cell}>
                  <select
                    id={dropdownId}
                    value={selectedValue}
                    className={styles.dropdown_select}
                    onChange={dropDownChangeHandler}
                    name={className}
                    title={title}
                  >
                    {options}
                  </select>
                </td>
              </tr>
              {children && (
                <tr className={dropdownToggled ? styles.show_on_mobile : styles.show_on_desktop}>
                  <td colSpan={2}>
                    {children}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null,
    [
      btnCell,
      buttonOnTheLeft,
      dropDownChangeHandler,
      dropdownId,
      dropdownToggled,
      options,
      children,
      className,
      selectedValue,
      title,
      titleCell,
      visible,
    ]
  );

  const map = ctrl.getMap(),
    container = ctrl.getContainer();
  return (
    element && map && container && createPortal(cloneElement(element, { map }), container)
  );
};
