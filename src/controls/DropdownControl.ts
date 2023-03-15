import { logErrorMessage } from '../monitoring';
import { IControl, Map } from 'mapbox-gl';
import { debugLog } from '../config';

export interface DropdownItem {
    id: string;
    text: string;
    category?: string;
    onSelect: (event: Event) => void;
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
    private _leftButton: boolean;

    constructor(
        buttonContent: string,
        dropdownItems: DropdownItem[],
        startDropdownItemsId?: string,
        title?: string,
        leftButton = false
    ) {
        this._title = title;
        this._buttonContent = buttonContent;
        this._dropdownItems = dropdownItems;
        this._startDropdownItemId = startDropdownItemsId;
        this._leftButton = leftButton;
    }

    onAdd(map: Map): HTMLElement {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl dropdown-ctrl';

        const table = document.createElement('table');
        table.className = "dropdown-ctrl-table";
        this._container.appendChild(table);

        const tr = document.createElement('tr');
        table.appendChild(tr);

        const btnCell = document.createElement('td'),
            dropdownCell = document.createElement('td');
        tr.appendChild(this._leftButton ? btnCell : dropdownCell);
        tr.appendChild(this._leftButton ? dropdownCell : btnCell);

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'dropdown-ctrl-button';
        if (this._title) ctrlBtn.title = this._title;
        ctrlBtn.textContent = this._buttonContent;
        // https://stackoverflow.com/questions/36489579/this-within-es6-class-method
        ctrlBtn.onclick = this.btnClickHandler.bind(this);
        btnCell.appendChild(ctrlBtn);
        btnCell.className = 'button-cell';

        const ctrlDropDown = document.createElement('select');
        ctrlDropDown.className = 'dropdown-ctrl-dropdown hiddenElement';
        if (this._title)
            ctrlDropDown.title = this._title;
        ctrlDropDown.onchange = this.dropDownChangeHandler.bind(this);
        dropdownCell.appendChild(ctrlDropDown);
        dropdownCell.className = 'dropdown-cell';

        this._dropdownItems.forEach(item => {
            const option = document.createElement('option');
            option.innerText = item.text;
            option.value = item.id;
            if (item.id === this._startDropdownItemId) {
                option.selected = true;
            }

            let group: HTMLSelectElement | HTMLOptGroupElement | null = null;
            if (!item.category) {
                group = ctrlDropDown;
            } else {
                const children = ctrlDropDown.children;
                Array.from(children).forEach((child) => {
                    if (child instanceof HTMLOptGroupElement && child.label == item.category)
                        group = child;
                });
                if (!group) {
                    group = document.createElement("optgroup");
                    group.label = item.category;
                    ctrlDropDown.appendChild(group);
                }
            }
            group.appendChild(option);
        })
        this._ctrlDropDown = ctrlDropDown;

        if (this._dropdownItems.length < 2)
            this._container.classList.add("hiddenElement");

        return this._container;
    }

    onRemove() {
        this._container?.parentNode?.removeChild(this._container);
        this._map = undefined;
    }

    btnClickHandler(event: MouseEvent) {
        debugLog("EtymologyColorControl button click", event);
        this.toggleDropdown();
    }

    dropDownChangeHandler(event: Event) {
        const dropDown = event.target;
        if (!(dropDown instanceof HTMLSelectElement))
            throw new Error("Bad event target dropdown");
        const dropdownItemId = dropDown.value,
            dropdownItemObj = this._dropdownItems.find(item => item.id === dropdownItemId);
        debugLog("DropdownControl select", { dropdownItemObj, event });
        if (dropdownItemObj) {
            dropdownItemObj.onSelect(event)
        } else {
            logErrorMessage("Invalid selected dropdown item", "error", { dropdownItemId });
        }
    }

    protected getMap() {
        return this._map;
    }

    protected getContainer() {
        return this._container;
    }

    protected getDropdown() {
        return this._ctrlDropDown;
    }

    getCurrentID() {
        return this._ctrlDropDown?.value;
    }

    show(show = true) {
        if (!this._container)
            console.warn("Missing control container, failed showing/hiding it", { show });
        else if (show)
            this._container.classList?.remove("hiddenElement");
        else
            this._container.classList?.add("hiddenElement");
    }

    showDropdown(show = true) {
        if (!this._ctrlDropDown) {
            console.warn("Missing control dropdown, failed showing/hiding it", { show });
        } else if (show) {
            this._ctrlDropDown.classList.remove("hiddenElement");
        } else {
            this._ctrlDropDown.classList.add("hiddenElement");
        }
    }

    toggleDropdown() {
        if (!this._ctrlDropDown) {
            console.warn("Missing control dropdown, failed toggling it");
        } else {
            this.showDropdown(this._ctrlDropDown.classList.contains("hiddenElement"));
        }
    }
}