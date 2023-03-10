import { debugLog } from "./config";

const timeoutIDs: Record<string, NodeJS.Timeout> = {};

/**
 * Show an error/info snackbar
 * 
 * @param message The message to show
 * @param color The color of the snackbar
 * @param timeout The timeout in milliseconds
 * @see https://www.w3schools.com/howto/howto_js_snackbar.asp
 */
function showSnackbar(message: string, color = "lightcoral", timeout = 3000, id?: string) {
    let snackbar = !id ? null : document.querySelector<HTMLDivElement>("div.show#" + id);

    if (!snackbar) {
        snackbar = document.createElement("div");
        document.body.appendChild(snackbar);
        snackbar.innerText = message;
        snackbar.style.backgroundColor = color;
        if (id) snackbar.id = id;
        debugLog("Showing snackbar", snackbar);
        snackbar.classList.add("snackbar", "show");
    } else if (id && id in timeoutIDs) {
        clearTimeout(timeoutIDs[id]);
    }

    if (timeout) {
        // After N milliseconds, remove the show class from DIV
        const timeoutID = setTimeout(function () { snackbar?.classList.remove("show"); }, timeout);
        if (id)
            timeoutIDs[id] = timeoutID;
    }
}

/**
 * Enable or disable the loading spinner
 * 
 * @see https://github.com/mapbox/mapbox-gl-js/issues/6178#issuecomment-366394651
 * @see https://projects.lukehaas.me/css-loaders/
 */
function showLoadingSpinner(on = true) {
    let spinnerEl = document.getElementById('spinner');
    if (!spinnerEl) {
        spinnerEl = document.createElement("div");
        document.body.appendChild(spinnerEl);
        spinnerEl.className = "spinner";
        spinnerEl.id = "spinner";
    }

    if (on) {
        debugLog("Showing spinner", spinnerEl);
        spinnerEl.classList.add('show');
    } else {
        debugLog("Hiding spinner", spinnerEl);
        spinnerEl.classList.remove('show');
    }
}

export { showSnackbar, showLoadingSpinner };
