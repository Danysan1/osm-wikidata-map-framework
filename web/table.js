
// https://docs.sentry.io/clients/javascript/tips/
$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    const responseText = jqXHR.responseText.substring(0, 100);
    Sentry.captureMessage(thrownError || jqXHR.statusText, {
        extra: {
            type: ajaxSettings.type,
            url: ajaxSettings.url,
            data: ajaxSettings.data,
            status: jqXHR.status,
            error: thrownError || jqXHR.statusText,
            response: responseText,
        },
    });
    console.error("AJAX error", {event, jqXHR, ajaxSettings, thrownError});
    kendo.alert(thrownError || jqXHR.statusText || responseText);
});

function initOverpassGrid() {
    if ( ! $("#overpass_grid").data("kendoGrid")) {
        $("#overpass_grid").kendoGrid({
            sortable: true,
            filterable: true,
            resizable: true,
            columns: [{
                title: "OSM ID",
                width: "8em",
                field: "id"
            }, {
                title: "OSM Type",
                width: "8em",
                field: "type"
            }, {
                title: "Name",
                template: element => element["tags"]["name"]
            }, {
                title: "Etymology on Wikidata",
                width: "25em",
                template: function(element) {
                    const wikidataIDs = element["tags"]["name:etymology:wikidata"].split(";");
                    if(wikidataIDs.every(id => id.match(/Q[0-9]+/))) {
                        return wikidataIDs.map(function(id) {
                            return '<a class="k-button" href="https://www.wikidata.org/wiki/'+id+'"><span class="k-icon k-i-hyperlink-open"></span> wikidata.org</a>'
                                + ' <a class="k-button analyse" data-id="'+id+'"><span class="k-icon k-i-zoom"></span> Wikidata tab</a>'
                                + id;
                        }).join('<br />');
                    } else {
                        return 'Wikidata ID badly formatted';
                    }
                }
            }],
            dataBound: function(e){
                const buttonsToAnalyse = $("#overpass_grid a.analyse");
                //console.info("overpass_grid dataBound", {e,buttonsToAnalyse});
                buttonsToAnalyse.each(takeUserToWikidataTabAndAddID);
            },
            detailTemplate: '<div class="element_map"></div><div class="element_nodes"></div>',
            detailInit: overpassDetailInit,
        });
    }
}

function searchOverpassFromBBox () {
    //console.info("searchOverpassFromBBox");
    initOverpassGrid();
    
    $("#overpass_grid").data("kendoGrid").setDataSource({
        /*requestStart: function(e) {
            console.info("requestStart", e);
            kendo.ui.progress($(document.body), true);
        },
        requestEnd: function(e) {
            console.info("requestEnd", e);
            kendo.ui.progress($(document.body), false);
        },*/
        serverFiltering: false,
        filter: { field:"type", operator:"neq", value:"node" },
        transport: {
            read: {
                url: "./overpass.php",
                data: {
                    from: "bbox",
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

    $("#tabstrip").data("kendoTabStrip").select(0);
}

function searchOverpassFromCenter () {
    //console.info("searchOverpassFromCenter");
    initOverpassGrid();
    
    $("#overpass_grid").data("kendoGrid").setDataSource({
        /*requestStart: function(e) {
            console.info("requestStart", e);
            kendo.ui.progress($(document.body), true);
        },
        requestEnd: function(e) {
            console.info("requestEnd", e);
            kendo.ui.progress($(document.body), false);
        },*/
        serverFiltering: false,
        filter: { field:"type", operator:"neq", value:"node" },
        transport: {
            read: {
                url: "./overpass.php",
                data: {
                    from: "center",
                    centerLat: $("#centerLat").val(),
                    centerLon: $("#centerLon").val(),
                    radius: $("#radius").val()
                }
            }
        },
        schema: {
            model: {
                id: "id",
            }
        }
    });

    $("#tabstrip").data("kendoTabStrip").select(0);
}

function takeUserToWikidataTabAndAddID (index, button){
    const id = $(button).data("id");
    //console.info("takeUserToWikidataTabAndAddID", {id,index,button});
    $(button).unbind("click");
    $(button).click(function(){
        addToMultiSelect("wdIDs", id);
        $("#tabstrip").data("kendoTabStrip").select(1);
    });
}

function overpassDetailInit (e) {
    const nodes = e.data.nodes.map(id => e.sender.dataSource.data().find(node => node.id === id));
    //console.info("detailInit", nodes);
    e.detailCell.find(".element_nodes").kendoGrid({
        dataSource: {
            data: nodes
        }
    });
}

function initWikidataGrid() {
    if ( ! $("#wikidata_grid").data("kendoGrid")) {
        $("#wikidata_grid").kendoGrid({
            sortable: true,
            filterable: true,
            resizable: true,
            columns: [{
                title: "Wikidata",
                width: "10em",
                field: "wikidata",
                template: it => '<a href="'+it.wikidata+'" target="_blank">'+it.wikidata.replace("http://www.wikidata.org/entity/","")+'</a>'
            }, {
                title: "Name",
                width: "20em",
                field: "name"
            }, {
                title: "Description",
                field: "description"
            }, {
                title: "Gender",
                width: "6em",
                field: "gender"
            }, {
                title: "Wikipedia",
                field: "wikipedia",
                template: it => !(it.wikipedia) ? "" : ('<a href="'+it.wikipedia+'" target="_blank">'+it.wikipedia.replace(/^http[s]?:\/\/[a-z]+\.wikipedia\.org\/wiki\//i,"")+'</a>')
            }, {
                title: "Occupations",
                field: "occupations"
            }, {
                title: "Pictures",
                width: "15em",
                field: "pictures",
                template: it => !(it.pictures) ? "" : (it.pictures.map(url => '<a href="'+url+'" target="_blank"><img src="'+url+'"></img></a>').join(""))
            }],
        });
    }
}

function searchWikidataFromIDs () {
    //console.info("searchWikidataFromIDs");
    initWikidataGrid();

    $("#wikidata_grid").data("kendoGrid").setDataSource({
        /*requestStart: function(e) {
            console.info("requestStart", e);
            kendo.ui.progress($(document.body), true);
        },
        requestEnd: function(e) {
            console.info("requestEnd", e);
            kendo.ui.progress($(document.body), false);
        },*/
        serverFiltering: false,
        filter: { field:"type", operator:"neq", value:"node" },
        transport: {
            read: {
                url: "./wikidata.php",
                data: { wikidataIDs: $("#wdIDs").data("kendoMultiSelect").value() }
            }
        },
        schema: {
            model: {
                id: "id",
            }
        }
    });

    $("#tabstrip").data("kendoTabStrip").select(1);
}

/**
 * https://demos.telerik.com/kendo-ui/multiselect/addnewitem
 */
function addToMultiSelect(widgetId, newValue) {
    let widget = $("#" + widgetId).getKendoMultiSelect(),
        dataSource = widget.dataSource;

    //dataSource.add( newValue );
    dataSource.add({value:newValue, text:newValue});
    //dataSource.sync();
    const currentValues = widget.value(),
        newValues = currentValues.concat([newValue]);
    console.info("addToMultiSelect", {widgetId, newValue, widget, dataSource, currentValues, newValues});
    widget.value(newValues);

}

$("#wdIDs").kendoMultiSelect({
    dataTextField: "text",
    dataValueField: "value",
    minLength: 1,
    noDataTemplate: function(e) {
        const inputText = e.instance.input.val();
        if(inputText.length > 0) {
            console.info("noDataTemplate", inputText);
            const insertBtn = $('<button class="k-button">Add '+kendo.htmlEncode(inputText)+'</button>')
            insertBtn.click(()=>addToMultiSelect("wdIDs", inputText));
            return insertBtn
        } else {
            return "";
        }
    }
});

$("#tabstrip").kendoTabStrip();

$("#searchBBox").click(searchOverpassFromBBox);
$("#searchCenter").click(searchOverpassFromCenter);
$("#searchWdIDs").click(searchWikidataFromIDs);

if ($("#bboxAutoStart").val()) {
    searchOverpassFromBBox();
} else if ($("#centerAutoStart").val()) {
    searchOverpassFromCenter();
} else if ($("#wdIDsAutoStart").val()) {
    searchWikidataFromIDs();
}
