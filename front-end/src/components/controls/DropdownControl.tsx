import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import type { IControl, Map, MapSourceDataEvent } from 'maplibre-gl';
import { ChangeEvent, ChangeEventHandler, FC, cloneElement, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';

/**
 * Let the user choose something through a dropdown.
 * 
 * Control implemented as ES6 class and integrated in React through createPortal()
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 * @see https://react.dev/reference/react-dom/createPortal
 * @see https://github.com/visgl/react-map-gl/blob/7.0-release/examples/custom-overlay/src/custom-overlay.tsx
 */
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

interface DropdownControlProps {
    buttonContent: string;
    dropdownItems: DropdownItem[],
    startDropdownItemsId: string,
    title: string;
    buttonPosition: 'left' | 'right';
    minZoomLevel?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    className?: string;
    onSourceData?: (e: MapSourceDataEvent) => void;
}

export const DropdownControl: FC<DropdownControlProps> = (props) => {
    const { zoom } = useUrlFragmentContext(),
        dropdownId = `dropdown_${props.className}`,
        ctrl = useControl<DropdownControlObject>(() => {
            return new DropdownControlObject(props.onSourceData);
        }, { position: props.position }),
        map = ctrl.getMap(),
        container = ctrl.getContainer(),
        visible = useMemo(
            () => props.dropdownItems.length > 1 && (props.minZoomLevel === undefined || zoom >= props.minZoomLevel),
            [props.dropdownItems.length, props.minZoomLevel, zoom]
        ),
        [dropdownVisible, setDropdownVisible] = useState(true),
        onBtnClick = useCallback(() => setDropdownVisible(prev => !prev), []),
        btnCell = useMemo(() => <td className='title-cell'><button onClick={onBtnClick} className='dropdown-ctrl-button' title={props.title} aria-label={props.title}>{props.buttonContent}</button></td>, [onBtnClick, props.buttonContent, props.title]),
        titleCell = useMemo(() => <td className='button-cell'><label htmlFor={dropdownId} className='dropdown-ctrl-title'>{props.title}</label></td>, [dropdownId, props.title]),
        dropDownChangeHandler: ChangeEventHandler<HTMLSelectElement> = useCallback((e) => {
            const selectedID = e.target.value,
                selectedItem = props.dropdownItems.find(item => item.id === selectedID);
            selectedItem && selectedItem.onSelect(e);
        }, [props.dropdownItems]),
        dropdownCell = useMemo(() => {
            if (!dropdownVisible) return null;
            const itemToOption = (item: DropdownItem): JSX.Element => (
                <option
                    key={item.id}
                    value={item.id}
                    title={item.text}
                    aria-label={item.text}
                    selected={item.id == props.startDropdownItemsId}>
                    {item.text}
                </option>
            );
            const categories = new Set(props.dropdownItems.filter(item => item.category).map(item => item.category!));

            return <td colSpan={2} className='dropdown-cell content-cell'>
                <select id={dropdownId} className='dropdown-ctrl-dropdown' onChange={dropDownChangeHandler} name={props.className} title={props.title} >
                    {Array.from(categories).map(category =>
                        <optgroup key={category} label={category}>
                            {props.dropdownItems.filter(item => item.category === category).map(itemToOption)}
                        </optgroup>
                    )}
                    {props.dropdownItems.filter(item => !item.category).map(itemToOption)}
                </select>
            </td>;
        }, [dropDownChangeHandler, dropdownId, dropdownVisible, props.className, props.dropdownItems, props.startDropdownItemsId, props.title]);

    const element = useMemo(() =>
        visible ? <div className={`maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl dropdown-ctrl ${props.className} ${visible ? '' : 'hiddenElement'}`}>
            <table className='dropdown-ctrl-table custom-ctrl-table'>
                <tbody>
                    <tr>
                        {props.buttonPosition === 'left' ? btnCell : titleCell}
                        {props.buttonPosition === 'left' ? titleCell : btnCell}
                    </tr>
                    <tr>
                        {dropdownCell}
                    </tr>
                </tbody>
            </table>
        </div> : null,
        [btnCell, dropdownCell, props.buttonPosition, props.className, titleCell, visible]);

    return element && map && container && createPortal(cloneElement(element, { map }), container);
}
