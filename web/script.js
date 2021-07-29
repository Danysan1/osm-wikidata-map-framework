$("#element_grid").kendoGrid({
    dataSource: {
        transport: {
            read: {
                url: "./data.php?minLat=44.33189137217148&minLon=11.660528182983398&maxLat=44.39055564523902&maxLon=11.751079559326172",
            }
        }
    }
});
