import { logErrorMessage } from '../monitoring';
import { IControl, Map, MapSourceDataEvent, MapboxEvent } from 'mapbox-gl';
import { debugLog } from '../config';
import { loadTranslator } from '../i18n';
import { mapboxBackgroundStyle } from './BackgroundStyleControl';

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
    private _startDropdownItemId: string;
    private _titleKey: string;
    private _map?: Map;
    private _container?: HTMLDivElement;
    private _ctrlDropDown?: HTMLSelectElement;
    private _leftButton: boolean;
    private hashChangeHandler?: (e: HashChangeEvent) => void;
    private sourceDataHandler?: (e: MapSourceDataEvent) => void;
    private moveEndHandler: (e: MapboxEvent) => void;

    constructor(
        buttonContent: string,
        dropdownItems: DropdownItem[],
        startDropdownItemsId: string,
        titleKey: string,
        leftButton = false,
        minZoomLevel = 0,
        onHashChange?: (e: HashChangeEvent) => void,
        onSourceData?: (e: MapSourceDataEvent) => void
    ) {
        this._titleKey = titleKey;
        this._buttonContent = buttonContent;
        this._startDropdownItemId = startDropdownItemsId;
        this._leftButton = leftButton;

        if (dropdownItems.length == 0)
            throw new Error("Tried to instantiate DropdownControl with no items");
        this._dropdownItems = dropdownItems;
        this.moveEndHandler = this.createMoveEndHandler(minZoomLevel).bind(this);
        this.hashChangeHandler = onHashChange;
        this.sourceDataHandler = onSourceData;
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
        ctrlBtn.textContent = this._buttonContent;
        // https://stackoverflow.com/questions/36489579/this-within-es6-class-method
        ctrlBtn.onclick = this.btnClickHandler.bind(this);
        btnCell.appendChild(ctrlBtn);
        btnCell.className = 'button-cell';

        const ctrlDropDown = document.createElement('select');
        ctrlDropDown.className = 'dropdown-ctrl-dropdown hiddenElement';
        ctrlDropDown.onchange = this.dropDownChangeHandler.bind(this);
        dropdownCell.appendChild(ctrlDropDown);
        dropdownCell.className = 'dropdown-cell';

        if (this._titleKey) {
            loadTranslator().then(t => {
                const title = t(this._titleKey);
                ctrlBtn.title = title;
                ctrlBtn.ariaLabel = title;
                ctrlDropDown.title = title;
            });
        }

        const okStartID = !!this._startDropdownItemId && this._dropdownItems.map(i => i.id).includes(this._startDropdownItemId),
            actualStartID = okStartID ? this._startDropdownItemId : this._dropdownItems[0].id;
        if (!okStartID) {
            setTimeout(() => this._dropdownItems[0].onSelect(new Event("change")), 200);
            console.warn(
                "Original starting source is null or invalid, using the first valid source",
                { originalStartID: this._startDropdownItemId, actualStartID, items: this._dropdownItems }
            );
        }

        this._dropdownItems.forEach(item => {
            const option = document.createElement('option');
            option.innerText = item.text;
            option.value = item.id;
            if (item.id === actualStartID)
                option.selected = true;

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
        });
        this._ctrlDropDown = ctrlDropDown;

        if (this._dropdownItems.length < 2)
            this._container.classList.add("hiddenElement");

        this.moveEndHandler({ target: map, type: "moveend", originalEvent: undefined });
        map.on("moveend", this.moveEndHandler);
        if (this.sourceDataHandler)
            map.on("sourcedata", this.sourceDataHandler);
        if (this.hashChangeHandler)
            window.addEventListener("hashchange", this.hashChangeHandler);

        return this._container;
    }

    onRemove(map: Map) {
        map.off("moveend", this.moveEndHandler);
        if (this.sourceDataHandler)
            map.off("sourcedata", this.sourceDataHandler);
        if (this.hashChangeHandler)
            window.removeEventListener("hashchange", this.hashChangeHandler);
        this._container?.remove();
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
        if (dropdownItemObj) {
            debugLog("DropdownControl select", { dropdownItemObj, event });
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

    /**
     * Gets the ID of the currently selected dropdown value
     */
    getCurrentID() {
        return this._ctrlDropDown?.value;
    }

    /**
     * Selects a new value of the dropdown by its ID
     */
    setCurrentID(id: string) {
        const dropdown = this.getDropdown();
        if (!dropdown?.options) {
            console.warn("setCurrentID: dropdown not yet initialized", { id });
        } else {
            dropdown.value = id;
            dropdown.dispatchEvent(new Event("change"));
        }
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

    createMoveEndHandler(minZoomLevel: number) {
        return (e: MapboxEvent) => {
            const zoomLevel = e.target.getZoom(),
                show = zoomLevel >= minZoomLevel;
            debugLog("moveend", { zoomLevel, minZoomLevel, show });
            this.show(show);
        }
    }
}