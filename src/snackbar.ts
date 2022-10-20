/**
 * Show an error/info snackbar
 * 
 * @param {string} message The message to show
 * @param {string} color The color of the snackbar
 * @param {number} timeout The timeout in milliseconds
 * @see https://www.w3schools.com/howto/howto_js_snackbar.asp
 */
function showSnackbar(message: string, color = "lightcoral", timeout = 3000) {
    const x = document.createElement("div");
    document.body.appendChild(x);
    x.innerText = message;
    x.style.backgroundColor = color;
    //console.info("Showing snackbar", x);
    x.classList.add("snackbar", "show");

    if (timeout) {
        // After N milliseconds, remove the show class from DIV
        //console.info("Hiding snackbar", x);
        setTimeout(function () { x.classList.remove("show"); }, timeout);
    }
    return x;
}

/**
 * Enable or disable the loading spinner
 * 
 * @see https://github.com/mapbox/mapbox-gl-js/issues/6178#issuecomment-366394651
 * @see https://projects.lukehaas.me/css-loaders/
 */
function showLoadingSpinner(on = true) {
    let spinnerEl = document.getElementById('spinner');
    if(!spinnerEl) {
        spinnerEl = document.createElement("div");
        document.body.appendChild(spinnerEl);
        spinnerEl.className = "spinner";
        spinnerEl.id = "spinner";
    }

    if (on) {
        //console.info("Showing spinner", spinnerEl);
        spinnerEl.classList.add('show');
    } else {
        //console.info("Hiding spinner", spinnerEl);
        spinnerEl.classList.remove('show');
    }
}

export {showSnackbar, showLoadingSpinner};
