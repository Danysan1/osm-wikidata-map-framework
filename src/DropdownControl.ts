import { logErrorMessage } from './monitoring';
import { IControl, Map } from 'mapbox-gl';
import { debugLog } from './config';

export interface DropdownItem {
    id: string;
    text: string;
    onSelect: () => void;
}

/**
 * Let the user choose something through a dropdown.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
export class DropdownControl implements IControl {
    private _buttonContent: string;
    private _dropdownItems: DropdownItem[];
    private _startDropdownItemId?: string;
    private _title?: string;
    private _map?: Map;
    private _container?: HTMLDivElement;
    private _ctrlDropDown?: HTMLSelectElement;

    constructor(buttonContent: string, dropdownItems: DropdownItem[], startDropdownItemsId?: string, title?: string) {
        this._title = title;
        this._buttonContent = buttonContent;
        this._dropdownItems = dropdownItems;
        this._startDropdownItemId = startDropdownItemsId;
    }

    onAdd(map: Map): HTMLElement {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl dropdown-ctrl';

        const table = document.createElement('table');
        this._container.appendChild(table);

        const tr = document.createElement('tr');
        table.appendChild(tr);

        const td1 = document.createElement('td'),
            td2 = document.createElement('td');
        tr.appendChild(td1);
        tr.appendChild(td2);

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'dropdown-ctrl-button';
        if (this._title) ctrlBtn.title = this._title;
        ctrlBtn.textContent = this._buttonContent;
        // https://stackoverflow.com/questions/36489579/this-within-es6-class-method
        ctrlBtn.onclick = this.btnClickHandler.bind(this);
        td2.appendChild(ctrlBtn);

        this._ctrlDropDown = document.createElement('select');
        this._ctrlDropDown.className = 'hiddenElement';
        if (this._title) this._ctrlDropDown.title = this._title;
        this._ctrlDropDown.onchange = this.dropDownChangeHandler.bind(this);
        td1.appendChild(this._ctrlDropDown);

        this._dropdownItems.forEach(item => {
            const option = document.createElement('option');
            option.innerText = item.text;
            option.value = item.id;
            if (item.id === this._startDropdownItemId) {
                option.selected = true;
            }
            this._ctrlDropDown?.appendChild(option);
        })

        return this._container;
    }

    onRemove() {
        this._container?.parentNode?.removeChild(this._container);
        this._map = undefined;
    }

    btnClickHandler(event: MouseEvent) {
        if (this._ctrlDropDown)
            this._ctrlDropDown.className = 'visibleDropDown';
    }

    dropDownChangeHandler(event: Event) {
        const dropDown = event.target;
        if (!(dropDown instanceof HTMLSelectElement))
            throw new Error("Bad event target dropdown");
        const dropdownItemId = dropDown.value,
            dropdownItemObj = this._dropdownItems.find(item => item.id === dropdownItemId);
        debugLog("DropdownControl select", { dropdownItemObj, event });
        if (dropdownItemObj) {
            dropdownItemObj.onSelect()
            if (this._ctrlDropDown)
                this._ctrlDropDown.className = 'hiddenElement';
        } else {
            logErrorMessage("Invalid selected dropdown item", "error", { dropdownItemId });
        }
    }

    protected getMap() {
        return this._map;
    }

    getCurrentID() {
        return this._ctrlDropDown?.value;
    }

    show(show: boolean) {
        if (show)
            this._container?.classList?.remove("hiddenElement");
        else
            this._container?.classList?.add("hiddenElement");
    }
}