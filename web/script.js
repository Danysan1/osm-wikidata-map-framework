
// https://docs.sentry.io/clients/javascript/tips/
$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    Sentry.captureMessage(thrownError || jqXHR.statusText, {
        extra: {
            type: ajaxSettings.type,
            url: ajaxSettings.url,
            data: ajaxSettings.data,
            status: jqXHR.status,
            error: thrownError || jqXHR.statusText,
            response: jqXHR.responseText.substring(0, 100),
        },
    });
    console.error("AJAX error", {event, jqXHR, ajaxSettings, thrownError});
    kendo.alert(thrownError || jqXHR.statusText);
});


$("#element_grid").kendoGrid({
    dataSource: {
        transport: {
            read: {
                url: "./data.php",
                data: { minLat, minLon, maxLat, maxLon }
            }
        }
    }
});
