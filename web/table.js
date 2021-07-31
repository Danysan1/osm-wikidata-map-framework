
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
    let overpass_grid = $("#overpass_grid").data("kendoGrid");
    if (!overpass_grid) {
        overpass_grid = $("#overpass_grid").kendoGrid({
            sortable: true,
            filterable: true,
            resizable: true,
            columns: [{
                title: "OSM ID",
                field: "id"
            }, {
                title: "OSM Type",
                field: "type"
            }, {
                title: "Name",
                template: element => element["tags"]["name"]
            }, {
                title: "Etymology on Wikidata",
                template: function(element) {
                    const wikidataIDs = element["tags"]["name:etymology:wikidata"].split(";");
                    if(wikidataIDs.every(id => id.match(/Q[0-9]+/))) {
                        return wikidataIDs.map(function(id) {
                            return id
                                + ' <a class="k-button" href="https://www.wikidata.org/wiki/'+id+'"><span class="k-icon k-i-hyperlink-open"></span> wikidata.org</a>'
                                + ' <a class="k-button analyse" data-id="'+id+'"><span class="k-icon k-i-zoom"></span> Wikidata tab</a>';
                        }).join('<br />');
                    } else {
                        return 'Wikidata ID badly formatted';
                    }
                }
            }],
            dataBound: function(e){
                const buttonsToAnalyse = $("#overpass_grid a.analyse");
                //console.info("overpass_grid dataBound", {e,buttonsToAnalyse});
                buttonsToAnalyse.each(takeUserToWikidataGrid);
            },
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

    overpass_grid.setDataSource({
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
                url: "./overpass.php",
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

function takeUserToWikidataGrid (index, button){
    const id = $(button).data("id");
    //console.info("takeUserToWikidataGrid", {id,index,button});
    $(button).unbind("click");
    $(button).click(function(){
        addToMultiSelect("wdIDs", id);
        $("#tabstrip").data("kendoTabStrip").select(1);
    });
}

function initWikidataGrid(wikidataIDs) {
    let wikidata_grid = $("#wikidata_grid").data("kendoGrid");
    if (!wikidata_grid) {
        wikidata_grid = $("#wikidata_grid").kendoGrid({
            sortable: true,
            filterable: true,
            resizable: true,
            columns: [{
                title: "Wikidata",
                width: "10em",
                template: function(element) {
                    const url = element.binding.find(b => b["@attributes"]["name"] == "etymology_wikidata")["uri"];
                    return '<a href="'+url+'">'+url.replace("http://www.wikidata.org/entity/", "")+'</a>';
                } 
            }, {
                title: "Name",
                width: "20em",
                template: element => element.binding.find(b => b["@attributes"]["name"] == "etymology_name")["literal"]
            }, {
                title: "Wikipedia",
                template: function(element) {
                    const wikipediaObject = element.binding.find(b => b["@attributes"]["name"] == "wikipedia"),
                        url = wikipediaObject ? wikipediaObject["uri"] : "";
                    return '<a href="'+url+'">'+url.replace(/^http[s]?:\/\/[a-z]+\.wikipedia\.org\/wiki\//i, "")+'</a>';
                } 
            }, {
                title: "Occupations",
                template: function(element) {
                    const occupations = element.binding.find(b => b["@attributes"]["name"] == "occupation_names")["literal"];
                    console.info("occupations template", occupations);
                    return (occupations && typeof occupations == "string") ? occupations : "";
                }
            }, {
                title: "Pictures",
                width: "15em",
                template: function(element){
                    const picturesBlock = element.binding.find(b => b["@attributes"]["name"] == "pictures"),
                        urls = picturesBlock["literal"];
                    console.info("pictures template", {picturesBlock, urls});
                    if(urls && typeof urls == "string") {
                        return urls.split("\t").map(url => '<a href="'+url+'" target="_blank"><img src="'+url+'"></img></a>').join("")
                    } else {
                        return "";
                    }
                }
            }],
        }).data("kendoGrid");
    }

    wikidata_grid.setDataSource({
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

$("#searchBBox").click(initOverpassGrid);
$("#searchWdIDs").click(initWikidataGrid);

if ($("#bboxAutoStart").val()) {
    initOverpassGrid();
    $("#tabstrip").data("kendoTabStrip").select(0);
} else if ($("#wdIDsAutoStart").val()) {
    initWikidataGrid();
    $("#tabstrip").data("kendoTabStrip").select(1);
}
