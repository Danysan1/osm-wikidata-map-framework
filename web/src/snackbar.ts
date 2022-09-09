/**
 * Show an error/info snackbar
 * 
 * @param {string} message The message to show
 * @param {string} color The color of the snackbar
 * @param {number} timeout The timeout in milliseconds
 * @see https://www.w3schools.com/howto/howto_js_snackbar.asp
 */
export function showSnackbar(message: string, color: string = "lightcoral", timeout: number = 3000) {
    const x = document.createElement("div");
    document.body.appendChild(x);
    //const x = document.getElementById("snackbar");
    x.className = "snackbar show";
    x.innerText = message;
    x.style.backgroundColor = color;

    if (timeout) {
        // After N milliseconds, remove the show class from DIV
        setTimeout(function () { x.className = x.className.replace("show", ""); }, timeout);
    }
    return x;
}