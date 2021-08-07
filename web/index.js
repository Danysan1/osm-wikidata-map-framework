mapboxgl.accessToken = mapbox_gl_token;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
    center: [default_center_lon, default_center_lat], // starting position [lon, lat]
    zoom: default_zoom, // starting zoom
    /*pitch: 45, // starting pitch
    bearing: -17.6,
    antialias: true*/
});

function rotateCamera(timestamp) {
    // clamp the rotation between 0 -360 degrees
    // Divide timestamp by 100 to slow rotation to ~10 degrees / sec
    map.rotateTo((timestamp / 100) % 360, { duration: 0 });
    // Request the next frame of the animation.
    requestAnimationFrame(rotateCamera);
}

/**
 * @see https://docs.mapbox.com/mapbox-gl-js/example/external-geojson/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-polygon/
 */
function updateDataSource(e) {
    // https://stackoverflow.com/questions/48592137/bounding-box-in-mapbox-js
    // https://leafletjs.com/reference-1.7.1.html#map-getbounds
    const bounds = map.getBounds(),
        southWest = bounds.getSouthWest(),
        minLat = southWest.lat,
        minLon = southWest.lng,
        northEast = bounds.getNorthEast(),
        maxLat = northEast.lat,
        maxLon = northEast.lng,
        overpass_source = map.getSource("overpass_source"),
        queryString = new URLSearchParams({
            from: "bbox",
            minLat: minLat,
            minLon: minLon,
            maxLat: maxLat,
            maxLon: maxLon,
            language: "it",
            format: "geojson"
        }).toString(),
        overpass_url = './etymologyMap.php?' + queryString;
    console.info("updateDataSource", { e, minLat, minLon, maxLat, maxLon, overpass_url, overpass_source });

    if (overpass_source) {
        overpass_source.setData(overpass_url);
    } else {
        map.addSource('overpass_source', {
            type: 'geojson',
            buffer: 512,
            data: overpass_url,
        });

        map.addLayer({
            'id': 'overpass_layer_point',
            'source': 'overpass_source',
            'type': 'circle',
            "filter": ["==", ["geometry-type"], "Point"],
            'paint': {
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-color': '#0080ff',
                'circle-stroke-color': 'white'
            }
        });

        map.addLayer({
            'id': 'overpass_layer_lineString',
            'source': 'overpass_source',
            'type': 'line',
            "filter": ["==", ["geometry-type"], "LineString"],
            'paint': {
                'line-color': '#0080ff',
                'line-opacity': 0.5,
                'line-width': 6
            }
        });

        map.addLayer({
            'id': 'overpass_layer_polygon',
            'source': 'overpass_source',
            'type': 'fill',
            "filter": ["==", ["geometry-type"], "Polygon"],
            'paint': {
                'fill-color': '#0080ff', // blue color fill
                'fill-opacity': 0.5
            }
        });
    }
};

map.on('load', function(e) {
    updateDataSource(e)
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:idle
        //map.on('idle', updateDataSource); //! Called continuously, avoid
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:moveend
    map.on('moveend', updateDataSource);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:zoomend
    //map.on('zoomend', updateDataSource); // moveend is sufficient

    // https://docs.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
    // https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
    ["overpass_layer_point", "overpass_layer_lineString", "overpass_layer_polygon"].forEach(function(layerID) {
        // When a click event occurs on a feature in the states layer,
        // open a popup at the location of the click, with description
        // HTML from the click event's properties.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click
        map.on('click', layerID, function(e) {
            const popup = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(featureToHTML(e.features[0]));
            console.info("showEtymologyPopup", { e, popup });
            popup.addTo(map);
        });

        // Change the cursor to a pointer when
        // the mouse is over the states layer.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseenter
        map.on('mouseenter', layerID, () => map.getCanvas().style.cursor = 'pointer');

        // Change the cursor back to a pointer
        // when it leaves the states layer.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseleave
        map.on('mouseleave', layerID, () => map.getCanvas().style.cursor = '');
    });

    map.addControl(new mapboxgl.NavigationControl());

    /*rotateCamera(0); // Start the animation.

    // Add 3d buildings and remove label layers to enhance the map
    var layers = map.getStyle().layers;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            // remove text labels
            map.removeLayer(layers[i].id);
        }
    }

    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',

            // use an 'interpolate' expression to add a smooth transition effect to the
            // buildings as the user zooms in
            'fill-extrusion-height': [
                "interpolate", ["linear"], ["zoom"],
                15, 0,
                15.05, ["get", "height"]
            ],
            'fill-extrusion-base': [
                "interpolate", ["linear"], ["zoom"],
                15, 0,
                15.05, ["get", "min_height"]
            ],
            'fill-extrusion-opacity': .6
        }
    });*/
});

function featureToHTML(feature) {
    const detail_template_source = $("#detail_template").html();
    /*console.info("featureToHTML", {
        detail_template_source,
        data: feature.properties,
        etymologies: JSON.parse(feature.properties.etymologies)
    });*/
    const detail_template = kendo.template(detail_template_source);
    return detail_template(feature.properties);
}