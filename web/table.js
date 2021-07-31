
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

function initGrid() {
    let element_grid = $("#element_grid").data("kendoGrid");
    if (!element_grid) {
        element_grid = $("#element_grid").kendoGrid({
            columns: [{
                title: "OSM ID",
                field: "id"
            }, {
                title: "OSM Type",
                field: "type"
            }, {
                title: "Etymology on Wikidata",
                template: function(element) {
                    wikidataID = element["tags"]["name:etymology:wikidata"];
                    return '<a href="https://www.wikidata.org/wiki/'+wikidataID+'">'+wikidataID+'</a>';
                }
            }],
            detailTemplate: '<div class="element_nodes"></div>',
            detailInit: function(e) {
                const nodes = e.data.nodes.map(id => e.sender.dataSource.data().find(node => node.id === id));
                //console.info("detailInit", nodes);
                e.detailCell.find(".element_nodes").kendoGrid({
                    dataSource: {
                        data: nodes
                    }
                });
            }
        }).data("kendoGrid");
    }
    element_grid.setDataSource({
        requestStart: function(e) {
            console.info("requestStart", e);
            kendo.ui.progress($(document.body), true);
        },
        requestEnd: function(e) {
            console.info("requestEnd", e);
            kendo.ui.progress($(document.body), false);
        },
        serverFiltering: false,
        filter: { field:"type", operator:"neq", value:"node" },
        transport: {
            read: {
                url: "./data.php",
                data: {
                    minLat: $("#minLat").val(),
                    minLon: $("#minLon").val(),
                    maxLat: $("#maxLat").val(),
                    maxLon: $("#maxLon").val()
                }
            }
        },
        schema: {
            model: {
                id: "id",
            }
        }
    });
}

$("#searchBBox").click(initGrid);

initGrid();
