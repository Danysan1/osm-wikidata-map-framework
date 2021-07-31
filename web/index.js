
mapboxgl.accessToken = mapbox_gl_token;
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
    center: [default_center_lon, default_center_lat], // starting position [lon, lat]
    zoom: default_zoom // starting zoom
});
