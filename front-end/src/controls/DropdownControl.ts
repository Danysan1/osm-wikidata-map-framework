import type { IControl, Map, MapLibreEvent as MapEvent, MapSourceDataEvent } from 'maplibre-gl';
import { loadTranslator } from '../i18n/client';
import { logErrorMessage } from '../monitoring';

export interface DropdownItem {
    id: string;
    text: string;
    category?: string | null;
    onSelect: (event: Event) => void;
}

/**
 * Let the user choose something through a dropdown.
 * 
 * Control implemented as ES6 class
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
export class DropdownControl implements IControl {
    private readonly _buttonContent: string;
    private readonly _dropdownItems: DropdownItem[];
    private readonly _startDropdownItemId: string;
    private readonly _titleKey: string;
    private _map?: Map;
    private _container?: HTMLDivElement;
    private _dropdown?: HTMLSelectElement;
    private _title?: HTMLLabelElement;
    private readonly _leftButton: boolean;
    private readonly hashChangeHandler?: (e: HashChangeEvent) => void;
    private readonly sourceDataHandler?: (e: MapSourceDataEvent) => void;
    private readonly moveEndHandler?: (e: MapEvent) => void;

    constructor(
        buttonContent: string,
        dropdownItems: DropdownItem[],
        startDropdownItemsId: string,
        titleKey: string,
        leftButton = false,
        minZoomLevel?: number,
        onHashChange?: (e: HashChangeEvent) => void,
        onSourceData?: (e: MapSourceDataEvent) => void
    ) {
        if (process.env.NODE_ENV === 'development') console.debug(buttonContent, "Initializing DropdownControl", { dropdownItems, startDropdownItemsId, titleKey, leftButton, minZoomLevel });
        this._titleKey = titleKey;
        this._buttonContent = buttonContent;
        this._startDropdownItemId = startDropdownItemsId;
        this._leftButton = leftButton;

        if (dropdownItems.length == 0)
            throw new Error("Tried to instantiate DropdownControl with no items");
        this._dropdownItems = dropdownItems;
        if (minZoomLevel !== undefined)
            this.moveEndHandler = this.createMoveEndHandler(minZoomLevel).bind(this);
        this.hashChangeHandler = onHashChange;
        this.sourceDataHandler = onSourceData;
    }

    onAdd(map: Map): HTMLElement {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl dropdown-ctrl';
        this._container.ariaHidden = "true";

        const table = document.createElement('table');
        table.className = "dropdown-ctrl-table custom-ctrl-table";
        table.ariaHidden = "true";
        this._container.appendChild(table);

        const firstRow = document.createElement('tr'),
            secondRow = document.createElement('tr');
        table.appendChild(firstRow);
        table.appendChild(secondRow);

        const btnCell = document.createElement('td'),
            titleCell = document.createElement('td'),
            dropdownCell = document.createElement('td');
        firstRow.appendChild(this._leftButton ? btnCell : titleCell);
        firstRow.appendChild(this._leftButton ? titleCell : btnCell);

        dropdownCell.colSpan = 2;
        secondRow.appendChild(dropdownCell);

        const titleElement = document.createElement('label'),
            dropdownId = `dropdown_${this._titleKey}`;
        titleElement.className = 'dropdown-ctrl-title hiddenElement';
        titleElement.htmlFor = dropdownId;
        this._title = titleElement;
        titleCell.appendChild(titleElement);

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
        ctrlDropDown.name = this._titleKey;
        ctrlDropDown.id = dropdownId;
        dropdownCell.appendChild(ctrlDropDown);
        dropdownCell.className = 'dropdown-cell content-cell';
        this._dropdown = ctrlDropDown;

        loadTranslator().then(({ t }) => {
            const title = t(this._titleKey);
            titleElement.innerText = title;
            ctrlBtn.title = title;
            ctrlBtn.ariaLabel = title;
            ctrlDropDown.title = title;
        }).catch(console.error);

        const okStartID = !!this._startDropdownItemId && this._dropdownItems.map(i => i.id).includes(this._startDropdownItemId),
            actualStartID = okStartID ? this._startDropdownItemId : this._dropdownItems[0].id;
        if (!okStartID) {
            setTimeout(() => this._dropdownItems[0].onSelect(new Event("change")), 200);
            if (process.env.NODE_ENV === 'development') console.warn(
                this._buttonContent,
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

        if (this._dropdownItems.length < 2) {
            if (process.env.NODE_ENV === 'development') console.debug(this._buttonContent, "Only one dropdown item, hiding dropdown", { items: this._dropdownItems });
            this.show(false);
        }

        if (this.moveEndHandler) {
            this.moveEndHandler({ target: map, type: "moveend", originalEvent: undefined });
            map.on("moveend", this.moveEndHandler);
        }
        if (this.sourceDataHandler)
            map.on("sourcedata", this.sourceDataHandler);
        if (this.hashChangeHandler)
            window.addEventListener("hashchange", this.hashChangeHandler);

        return this._container;
    }

    onRemove(map: Map) {
        if (this.moveEndHandler)
            map.off("moveend", this.moveEndHandler);
        if (this.sourceDataHandler)
            map.off("sourcedata", this.sourceDataHandler);
        if (this.hashChangeHandler)
            window.removeEventListener("hashchange", this.hashChangeHandler);
        if (this._container?.parentNode) {
            console.debug(this._buttonContent, "Removing dropdown container", { container: this._container, parent: this._container?.parentNode });
            this._container.parentNode.removeChild(this._container);
        } else {
            console.warn(this._buttonContent, "Empty dropdown container parent node", { container: this._container, parent: this._container?.parentNode });
        }
        this._container = undefined;
        this._dropdown = undefined;
        this._title = undefined;
        this._map = undefined;
    }

    private btnClickHandler(event: MouseEvent) {
        if (process.env.NODE_ENV === 'development') console.debug(this._buttonContent, "DropdownControl button click", event);
        this.toggleDropdown(true);
    }

    private dropDownChangeHandler(event: Event) {
        const dropDown = event.target;
        if (!(dropDown instanceof HTMLSelectElement))
            throw new Error("Bad event target dropdown");
        const dropdownItemId = dropDown.value,
            dropdownItemObj = this._dropdownItems.find(item => item.id === dropdownItemId);
        if (dropdownItemObj) {
            if (process.env.NODE_ENV === 'development') console.debug(this._buttonContent, "DropdownControl select", { dropdownItemObj, event });
            dropdownItemObj.onSelect(event)
        } else {
            logErrorMessage("Invalid selected dropdown item", "error", { dropdownItemId });
        }
    }

    private createMoveEndHandler(minZoomLevel: number) {
        return (e: MapEvent) => {
            const zoomLevel = e.target.getZoom(),
                show = zoomLevel >= minZoomLevel;
            if (process.env.NODE_ENV === 'development') console.debug(this._buttonContent, "DropdownControl moveend", { e, zoomLevel, minZoomLevel, show });
            this.show(show);
        }
    }

    protected getMap() {
        return this._map;
    }

    protected getContainer() {
        return this._container;
    }

    protected getDropdown() {
        return this._dropdown;
    }

    /**
     * ID of the currently selected dropdown value
     */
    protected get value() {
        const out = this.getDropdown()?.value;
        if (!out)
            throw new Error("DropdownControl: currentID: dropdown not yet initialized");

        return out;
    }

    protected set value(id: string) {
        const dropdown = this.getDropdown();
        if (!dropdown?.options) {
            console.warn(this._buttonContent, "setCurrentID: dropdown not yet initialized", { id });
        } else if (dropdown.value === id) {
            if (process.env.NODE_ENV === 'development') console.debug(this._buttonContent, "setCurrentID: skipping change to same value", { id });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug(this._buttonContent, "setCurrentID: updating", { old: dropdown.value, next: id });
            dropdown.value = id;
            dropdown.dispatchEvent(new Event("change"));
        }
    }

    protected show(show = true) {
        if (!this._container)
            console.warn(this._buttonContent, "Missing control container, failed showing/hiding it", { show });
        else if (show)
            this._container.classList?.remove("hiddenElement");
        else
            this._container.classList?.add("hiddenElement");
    }

    protected showDropdown(show = true) {
        if (!this._dropdown) {
            console.warn(this._buttonContent, "Missing control dropdown, failed showing/hiding it", { show });
        } else if (show) {
            this._dropdown.classList.remove("hiddenElement");
            this._title?.classList?.remove("hiddenElement");
        } else {
            this._dropdown.classList.add("hiddenElement");
            this._title?.classList?.add("hiddenElement");
        }
    }

    protected toggleDropdown(focusOnShow = false) {
        if (!this._dropdown) {
            console.warn(this._buttonContent, "Missing control dropdown, failed toggling it");
        } else if (this._dropdown.classList.contains("hiddenElement")) {
            this.showDropdown(true);
            if (focusOnShow) this._dropdown?.focus();
        } else {
            this.showDropdown(false);
        }
    }
}