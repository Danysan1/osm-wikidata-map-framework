import { parseBoolConfig } from '@/src/config';
import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import type { ControlPosition, IControl, Map, MapSourceDataEvent } from 'maplibre-gl';
import { ChangeEvent, ChangeEventHandler, FC, PropsWithChildren, cloneElement, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';
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
        if (this._onSourceData) map.on('sourcedata', this._onSourceData);
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl dropdown-ctrl';
        return this._container;
    }

    onRemove() {
        this._container?.remove();
        this._container = undefined;
        if (this._onSourceData) {
            this._map?.off('sourcedata', this._onSourceData);
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
    dropdownItems: DropdownItem[],
    selectedValue: string,
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
export const DropdownControl: FC<DropdownControlProps> = (props) => {
    const { zoom } = useUrlFragmentContext(),
        dropdownId = `dropdown_${props.className}`,
        ctrl = useControl<DropdownControlObject>(() => {
            return new DropdownControlObject(props.onSourceData);
        }, { position: props.position }),
        buttonOnTheLeft = props.position === 'top-left' || props.position === 'bottom-left',
        visible = props.dropdownItems.length > 1 && (props.minZoomLevel === undefined || zoom >= props.minZoomLevel),
        [dropdownVisible, setDropdownVisible] = useState(parseBoolConfig(process.env.owmf_start_dropdown_open)),
        onBtnClick = useCallback(() => setDropdownVisible(prev => !prev), []),
        btnCell = useMemo(() => <td className='title-cell'><button onClick={onBtnClick} className={styles.button} title={props.title} aria-label={props.title}>{props.buttonContent}</button></td>, [onBtnClick, props.buttonContent, props.title]),
        titleCell = useMemo(() => dropdownVisible && <td className='button-cell'><label htmlFor={dropdownId} className={styles.title} >{props.title}</label></td>, [dropdownId, dropdownVisible, props.title]),
        dropDownChangeHandler: ChangeEventHandler<HTMLSelectElement> = useCallback((e) => {
            const selectedID = e.target.value,
                selectedItem = props.dropdownItems.find(item => item.id === selectedID);
            selectedItem && selectedItem.onSelect(e);
        }, [props.dropdownItems]),
        options = useMemo(() => {
            const itemToOption = (item: DropdownItem): JSX.Element => (
                <option
                    key={item.id}
                    value={item.id}
                    title={item.text}
                    aria-label={item.text}>
                    {item.text}
                </option>
            );
            const categories = new Set(props.dropdownItems.filter(item => item.category).map(item => item.category!));

            return <>
                {Array.from(categories).map(category =>
                    <optgroup key={category} label={category}>
                        {props.dropdownItems.filter(item => item.category === category).map(itemToOption)}
                    </optgroup>
                )}
                {props.dropdownItems.filter(item => !item.category).map(itemToOption)}
            </>
        }, [props.dropdownItems]);

    const element = useMemo(() =>
        visible ? <div className={props.className}>
            <table className='dropdown-ctrl-table custom-ctrl-table'>
                <tbody>
                    <tr>
                        {buttonOnTheLeft ? btnCell : titleCell}
                        {buttonOnTheLeft ? titleCell : btnCell}
                    </tr>
                    <tr>
                        {dropdownVisible && <td colSpan={2} className='dropdown-cell content-cell'>
                            <select id={dropdownId} value={props.selectedValue} className={styles.dropdown_select} onChange={dropDownChangeHandler} name={props.className} title={props.title} >
                                {options}
                            </select>
                        </td>}
                    </tr>
                    {dropdownVisible && props.children}
                </tbody>
            </table>
        </div> : null,
        [btnCell, buttonOnTheLeft, dropDownChangeHandler, dropdownId, dropdownVisible, options, props.children, props.className, props.selectedValue, props.title, titleCell, visible]);

    const map = ctrl.getMap(),
        container = ctrl.getContainer();
    return element && map && container && createPortal(cloneElement(element, { map }), container);
}
