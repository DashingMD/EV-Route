let map;
let directionsService;
let directionsRenderer;
let highways; 
let tolls; 
let origin;
let waypts = [];        //waypoints array
let reached_waypts = [];
let waypts_for_entire_route = [];
let waypts_distances_ptr = 0;
let waypts_distances = [];
let culmulative_distance_to_stations = 0;
let next_station_distance = 0;
let alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
let real_stop_in_stations_index = [];
let waypts_distances_for_getPath = [];
let distances;                                  // Array holding distance of each waypoint from origin
let stations;                                   // Stores the coordinate of each charging station
let numOfStations;                              // Counter for number of charging stations
let finished;                                   // flag to check if counting is finished
let checked_waypts_ptr = 0;
let optimize;
let marker;

async function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                map = new google.maps.Map(document.getElementById("map"), {
                    zoom: 14,
                    center: { lat: pos.lat, lng: pos.lng },
                });
                var current_marker = new google.maps.Marker({
                    position: pos,
                    map: map,
                    icon: "./src/location.png",
                  }); 
                current_marker.setMap(map);

                getcurrent(map);
                directionsRenderer.setMap(map);

                // Auto Complete part
                marker = new google.maps.Marker({map});
                const starting = document.getElementById("start");
                const autocomplete_s = new google.maps.places.Autocomplete(starting);
                autocomplete_s.addListener("place_changed", () => {
                    auto_complete(marker, autocomplete_s);
                });
                const dest = document.getElementById("end");
                const autocomplete_d = new google.maps.places.Autocomplete(dest);
                autocomplete_d.addListener("place_changed", () => {
                    auto_complete(marker, autocomplete_d);
                });
                
                document.getElementById("end").addEventListener("keyup", (event) => {
                    if(event.key === "Enter"){
                        document.getElementById("submit").click();
                    }
                });
                document.getElementById("submit").addEventListener("click", () => {
                    var complete = document.getElementById("complete").checked;
                    document.getElementById("submit").disabled = true;

                    marker.setVisible(false);
                    let loader = document.createElement('div');
                    loader.className = "loader"
                    let col2 = document.getElementById("col2");
                    col2.appendChild(loader);
                    
                    optimize = document.getElementById("Optimize").checked;
                    highways = document.getElementById("Highways").checked;
                    tolls = document.getElementById("Tolls").checked;

                    if(complete) {
                        getEntirePath();
                    } else {
                        getPath(directionsService, directionsRenderer);
                    }
                });
            },
            () => {handleLocationError(true, infoWindow, map.getCenter());}
        );
    } 
    else {// Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }
}

// Function to get entire entire of charging stations
function getEntirePath() {
    stations = [];
    distances = [];
    finished = false;
    // numOfStations = waypts.length;
    numOfStations = 0;
    waypts_distances = [];
    var wp_order;
    var sd = 90;
    var route;
    var routelength = 0;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                origin = pos;
                if(document.getElementById("start").value != "") {
                    origin = document.getElementById("start").value;
                }
                var sd_t = document.getElementById("segDistance").value;
                var temp_distance = getMeters(100);
                console.log(sd_t)
                if(sd_t != ""){
                    sd = sd_t*0.9;
                    temp_distance = getMeters(sd_t);
                }
                console.log(sd);
                var segmentDistance = getMeters(sd); 
                var reached = false;
                console.log(origin);

                //Get waypoints
                var waypts_t = [];
                const Array = document.getElementsByName("new");
                for (let i = 0; i < Array.length; i++) {
                    if (Array[i].value != "") {
                        waypts_t.push({
                            location: Array[i].value,
                            stopover: true,
                        });
                    }
                }
                console.log(waypts_t);
                console.log(waypts_t.length);

                //change waypoint order (Due to optimize)
                await directionsService
                    .route({
                        origin: origin,
                        destination: document.getElementById("end").value,
                        waypoints: waypts_t,
                        optimizeWaypoints: optimize,
                        travelMode: google.maps.TravelMode.DRIVING,
                        unitSystem: google.maps.UnitSystem.IMPERIAL,
                        avoidHighways: highways,
                        avoidTolls: tolls,
                    })
                    .then((response) => {
                        wp_order = response.routes[0].waypoint_order;
                                               
                    })
                    .catch((e) => {
                        window.alert("Invalid Location(s) Entered");
                        document.getElementById("submit").disabled = false;
                        let col2 = document.getElementById("col2");
                        col2.removeChild(document.getElementsByClassName("loader")[0])
                    });
                console.log(waypts_t)
                var waypts = [];
                for (let i = 0; i < waypts_t.length; i++) {
                    if (waypts_t[wp_order[i]].location != "") {
                        waypts.push({
                            location: waypts_t[wp_order[i]].location,
                            stopover: true,
                        });
                    }
                }
                console.log(waypts)

                var waypts_distance_Service = new google.maps.DistanceMatrixService();
                var point_to_calculate_waypts_distance = origin;
                for(let i = 0; i < waypts.length; i++){
                    console.log(waypts[i].location);
                    if(i == 0){
                        await waypts_distance_Service.getDistanceMatrix({
                            origins: [origin],
                            destinations: [waypts[i].location],
                            travelMode: google.maps.TravelMode.DRIVING,
                            unitSystem: google.maps.UnitSystem.IMPERIAL
                        }, point_to_calculate_waypts_distance_callback)
                        // point_to_calculate_waypts_distance = waypts[i];
                    }else{
                        await waypts_distance_Service.getDistanceMatrix({
                            origins: [waypts[i - 1].location],
                            destinations: [waypts[i].location],
                            travelMode: google.maps.TravelMode.DRIVING,
                            unitSystem: google.maps.UnitSystem.IMPERIAL
                        }, point_to_calculate_waypts_distance_callback)
                        waypts_distances[i] += waypts_distances[i - 1];
                    }
                    // console.log(origin);
                    // console.log(waypts[i]);
                    // await waypts_distance_Service.getDistanceMatrix({
                    //     origins: point_to_calculate_waypts_distance,
                    //     destinations: waypts[i].location,
                    //     travelMode: google.maps.TravelMode.DRIVING,
                    //     unitSystem: google.maps.UnitSystem.IMPERIAL
                    // }, point_to_calculate_waypts_distance_callback)
                    // point_to_calculate_waypts_distance = waypts[i];
                }

                console.log(waypts_distances);

                // Retrieve Path of waypoints
                await directionsService
                    .route({
                        origin: origin,
                        destination: document.getElementById("end").value,
                        waypoints: waypts,
                        optimizeWaypoints: optimize,
                        travelMode: google.maps.TravelMode.DRIVING,
                        unitSystem: google.maps.UnitSystem.IMPERIAL,
                        avoidHighways: highways,
                        avoidTolls: tolls,
                    })
                    .then((response) => {
                        // Store route coordinates
                        route = response.routes[0].overview_path
                        console.log(response);
                        // total route distance
                        for(let i = 0; i < response.routes[0].legs.length; i++){
                            routelength += response.routes[0].legs[i].distance.value;
                        }
                        // routelength = response.routes[0].legs[0].distance.value;
                    })
                    .catch((e) => {
                        window.alert("Invalid Location(s) Entered");
                        document.getElementById("submit").disabled = false;
                        let col2 = document.getElementById("col2");
                        col2.removeChild(document.getElementsByClassName("loader")[0])
                    });

                // Retrieve Latitude and Longtitude from route coordinates
                path = getLatLng(route);
                // var distanceService = new google.maps.DistanceMatrixService();

                // var start = 0, end = 25;
                // Finds the distance of each coordinate of path from origin for every 25 coordinates
                // while(true) {
                //     await new Promise(r => setTimeout(r, 2000));
                //     // await new Promise(r => setTimeout(r, 1500));
                //     await distanceService.getDistanceMatrix({
                //         origins: [path[0]],
                //         destinations: path.slice(start, Math.min(end, path.length)),
                //         travelMode: google.maps.TravelMode.DRIVING,
                //         unitSystem: google.maps.UnitSystem.IMPERIAL
                //     }, distanceCallback)
                //     console.log(start, end)
                //     if(end >= path.length) break;
                //     start = end;
                //     end += 25;
                // }
                // console.log(distances);

                segment = segmentDistance;
                         
                // Find closest charging station of each segment
                waypts_distances_ptr = 0;
                console.log(waypts_distances[waypts_distances_ptr]);
                culmulative_distance_to_stations = 0;
                real_stop_in_stations_index = [];
                var cumulative_distance_Service = new google.maps.DistanceMatrixService();
                var i = 0;
                next_station_distance = 0;           //when one charging station is found, set it to 0, and then find next one
                var next_station_distance_Service = new google.maps.DistanceMatrixService();
                var DECREASE_next_station_distance_Service = new google.maps.DistanceMatrixService();
                (async () => {
                    while(culmulative_distance_to_stations < routelength && i < path.length - 1){
                        await next_station_distance_Service.getDistanceMatrix({
                            origins: [path[i]],
                            destinations: [path[i+1]],
                            travelMode: google.maps.TravelMode.DRIVING,
                            unitSystem: google.maps.UnitSystem.IMPERIAL
                        }, next_station_distance_callback);

                        while((culmulative_distance_to_stations+next_station_distance) >= waypts_distances[waypts_distances_ptr] && waypts_distances_ptr < waypts_distances.length){
                            stations.push({
                                location: waypts[waypts_distances_ptr].location,
                                stopover: true
                            });
                            real_stop_in_stations_index.push(stations.length - 1);
                            waypts_distances_ptr++;
                            numOfStations++;
                        }
                        if((culmulative_distance_to_stations+next_station_distance) > segment){
                            // await new Promise(r => setTimeout(r, 500));
                            not_found = false;
                            let request = {
                                // location: path[i],
                                location: path[i],
                                rankBy: google.maps.places.RankBy.DISTANCE,
                                keyword: 'Electric vehicle charging'
                            };
                            service = new google.maps.places.PlacesService(map);
                            await service.nearbySearch(request, nearbyEntirePathCallback);
                            await new Promise(r => setTimeout(r, 2000));
                            console.log(next_station_distance)

                            var a = 0;
                            if(not_found == true){
                                while(not_found == true){       // loop until find one station
                                    await DECREASE_next_station_distance_Service.getDistanceMatrix({
                                        origins: [path[i-a]],
                                        destinations: [path[i-a+1]],
                                        travelMode: google.maps.TravelMode.DRIVING,
                                        unitSystem: google.maps.UnitSystem.IMPERIAL
                                    }, DECREASE_next_station_distance_callback);

                                    let request = {
                                        location: path[i-a],
                                        rankBy: google.maps.places.RankBy.DISTANCE,
                                        keyword: 'Electric vehicle charging'
                                    };
                                    service = new google.maps.places.PlacesService(map);
                                    await service.nearbySearch(request, nearbyEntirePathCallback);
                                    await new Promise(r => setTimeout(r, 2000));
                                    a++;
                                    console.log(next_station_distance)
                                }
                                // numOfStations++;
                                i = i-a+1;
                            }
                            culmulative_distance_to_stations += next_station_distance;
                            segment = culmulative_distance_to_stations + segmentDistance;
                            next_station_distance = 0;
                            // console.log(numOfStations)
                            numOfStations++;
                            continue;
                        }
                        i++;
                    }
                    await new Promise(r => setTimeout(r, 2000));

                    // for(let i = 0; i < distances.length; i++) {
                    //     while(segment > waypts_distances[waypts_distances_ptr]){
                    //         console.log(225);
                    //         stations.push({
                    //             location: waypts[waypts_distances_ptr].location,
                    //             stopover: true
                    //         });
                    //         waypts_distances_ptr++;
                    //         console.log(231);
                    //     }
                    //     if(distances[i] > segment) {
                    //         console.log(i);
                    //         await new Promise(r => setTimeout(r, 500));
                    //         let request = {
                    //             // location: path[i],
                    //             location: path[i-1],
                    //             rankBy: google.maps.places.RankBy.DISTANCE,
                    //             keyword: 'Electric vehicle charging'
                    //         };
                    //         await service.nearbySearch(request, nearbyEntirePathCallback);
                    //         // segment += segmentDistance;
                    //         segment += segmentDistance;
                    //         console.log(numOfStations)
                    //         numOfStations++;
                    //         console.log(segment, routelength);
                    //         if(segment > routelength) {
                    //             break;
                    //         }
                    //     }
                    // }
                    finished = true;
                    // console.log(stations);
                    if(finished && stations.length == numOfStations) {
                        console.log(stations);
                        var overflow = false;
                        var real_destination = document.getElementById("end").value;
                        var real_waypts = stations;
                        if(stations.length > 25) {
                            real_waypts = stations.slice(0,25);
                            real_destination = stations[25].location;
                            overflow = true;
                        }

                        console.log(real_waypts);
                        console.log(real_destination);
                        console.log(overflow);
                        directionsService
                            .route({
                                origin: origin,
                                destination: real_destination,
                                waypoints: real_waypts,
                                optimizeWaypoints: optimize,
                                travelMode: google.maps.TravelMode.DRIVING,
                                unitSystem: google.maps.UnitSystem.IMPERIAL,
                                avoidHighways: highways,
                                avoidTolls: tolls,
                            })
                            .then((response, status) => {
                                // console.log(status)
                                directionsRenderer.setDirections(response);
                                // stations = [];
                                // distances = [];
                                // finished = false;
                                // numOfStations = 0;
                                console.log(distances);
                                const route = response.routes[0];
                                const summaryPanel = document.getElementById("directions-panel");
                
                                summaryPanel.innerHTML = "";
                
                                // For each route, display summary information.
                                for (let i = 0; i < route.legs.length; i++) {
                                    const routeSegment = i + 1;
                
                                    if(i == 0){
                                        summaryPanel.innerHTML += "<b>From </b><br>" + route.legs[i].start_address +"<br><br>";
                                    }

                                    summaryPanel.innerHTML +=
                                    "<b>Route Segment: " + alphabet[routeSegment - 1] + " to " + alphabet[routeSegment]  + "</b><br>";
                                    if(i == route.legs.length - 1){
                                        summaryPanel.innerHTML +=
                                        "<b>- This is to your destination</b><br>";
                                    }
                                    else if(real_stop_in_stations_index.includes(i)){
                                        summaryPanel.innerHTML +=
                                        "<b>- This is to one of your waypoints: <br>" + stations[i].location + "</b><br>";
                                        summaryPanel.innerHTML += route.legs[i].distance.text + "<br><br>";
                                        continue;
                                    }else{
                                        summaryPanel.innerHTML +=
                                        "<b>- This is to a charging stop</b><br>";
                                    }
                                    summaryPanel.innerHTML += route.legs[i].end_address + "<br>";
                                    summaryPanel.innerHTML += route.legs[i].distance.text + "<br><br>";

                                    if(route.legs[i].distance.value > temp_distance){
                                        summaryPanel.innerHTML +=
                                        "<b><font color='red'>**Warning: Segment distance longer than expected</font></b><br>";
                                    }
                                    summaryPanel.innerHTML +="<br>"
                                }

                                if(overflow) {
                                    summaryPanel.innerHTML +=
                                    "<b><font color='red'>**Warning: Overall Route was too long to compute. Please run again with last destination showed</font></b><br>";
                                }
                                summaryPanel.innerHTML +="<br>";
                
                                document.getElementById("submit").disabled = false;
                                let col2 = document.getElementById("col2");
                                col2.removeChild(document.getElementsByClassName("loader")[0])
                            })
                            .catch((e) => {
                                window.alert("Invalid Location(s) Entered");
                                document.getElementById("submit").disabled = false;
                                let col2 = document.getElementById("col2");
                                col2.removeChild(document.getElementsByClassName("loader")[0])
                            });
                    }
                })();
            }
        )
    }
    
}

function point_to_calculate_waypts_distance_callback(response, status){
    console.log(response);
    var results = response.rows[0].elements;
    waypts_distances.push(results[0].distance.value);
}

function culmulative_distance_callback(response, status){
    // console.log(response);
    var results = response.rows[0].elements;
    culmulative_distance_to_stations += results[0].distance.value;
}

function next_station_distance_callback(response, status){
    // console.log(response);
    var results = response.rows[0].elements;
    next_station_distance += results[0].distance.value;
}

function DECREASE_next_station_distance_callback(response, status){
    // console.log(response);
    var results = response.rows[0].elements;
    next_station_distance -= results[0].distance.value;
}

// Find closest charging station of each point
function nearbyEntirePathCallback(results, status) {
    console.log(status)
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        not_found = false;
        stations.push({
            location: results[0].geometry.location,
            stopover: true
        });
        console.log(stations.length)
    } else {
        // numOfStations--;
        not_found = true;
    }
    console.log(numOfStations);
    console.log(finished);
    // if(finished && stations.length == numOfStations) {
    //     console.log(stations);


    //     directionsService
    //         .route({
    //             origin: origin,
    //             destination: document.getElementById("end").value,
    //             waypoints: stations,
    //             optimizeWaypoints: optimize,
    //             travelMode: google.maps.TravelMode.DRIVING,
    //             unitSystem: google.maps.UnitSystem.IMPERIAL,
    //             avoidHighways: highways,
    //             avoidTolls: tolls,
    //         })
    //         .then((response, status) => {
    //             // console.log(status)
    //             directionsRenderer.setDirections(response);
    //             // stations = [];
    //             // distances = [];
    //             // finished = false;
    //             // numOfStations = 0;
    //             console.log(distances);
    //             const route = response.routes[0];
    //             const summaryPanel = document.getElementById("directions-panel");

    //             summaryPanel.innerHTML = "";

    //             // For each route, display summary information.
    //             for (let i = 0; i < route.legs.length; i++) {
    //                 const routeSegment = i + 1;

    //                 summaryPanel.innerHTML +=
    //                 "<b>Route Segment: " + routeSegment + "</b><br>";
    //                 summaryPanel.innerHTML += route.legs[i].start_address + "<br /> to <br />";
    //                 summaryPanel.innerHTML += route.legs[i].end_address + "<br>";
    //                 summaryPanel.innerHTML += route.legs[i].distance.text + "<br><br>";
    //             }

    //             document.getElementById("submit").disabled = false;
    //             let col2 = document.getElementById("col2");
    //             col2.removeChild(document.getElementsByClassName("loader")[0])
    //         })
    //         .catch((e) => {
    //             window.alert("Invalid Location(s) Entered");
    //             document.getElementById("submit").disabled = false;
    //             let col2 = document.getElementById("col2");
    //             col2.removeChild(document.getElementsByClassName("loader")[0])
    //         });
    // }
}

// Retrieve and store distance matrix
function distanceCallback(response, status) {
    console.log(status)
    console.log(response.rows[0])
    var results = response.rows[0].elements;
    for(let i = 0; i < results.length; i++) {
        distances.push(results[i].distance.value);
    }
    // console.log(row);
}

function getLatLng(route) {
    var path = [];
    for(let i = 0; i < route.length; i++) {
        path.push({ lat: route[i].toJSON().lat, lng: route[i].toJSON().lng })
    }
    return path;
}

async function getPath(directionsService, directionsRenderer) {
    var route;
    var routeDistance = 0;
    var infoWindow = new google.maps.InfoWindow();
    var leg_total_distance = 0;
    var sd = 95;
    var wp_order;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                origin = pos;
                
                if(document.getElementById("start").value != "") {
                    origin = document.getElementById("start").value;
                }
                var sd_t = document.getElementById("segDistance").value*0.95;
                console.log(sd_t)
                if(sd_t != ""){
                    sd = sd_t;
                }
                console.log(sd);
                var segmentDistance = getMeters(sd);
                var reached = false;
                console.log(origin)

                //Get waypoints
                var waypts_t = [];
                const Array = document.getElementsByName("new");
                for (let i = 0; i < Array.length; i++) {
                    if (Array[i].value != "") {
                        waypts_t.push({
                            location: Array[i].value,
                            stopover: true,
                        });
                    }
                }
                console.log(waypts_t);
                console.log(waypts_t.length);

                //change waypoint order (Due to optimize)
                await directionsService
                    .route({
                        origin: origin,
                        destination: document.getElementById("end").value,
                        waypoints: waypts_t,
                        optimizeWaypoints: optimize,
                        travelMode: google.maps.TravelMode.DRIVING,
                        unitSystem: google.maps.UnitSystem.IMPERIAL,
                        avoidHighways: highways,
                        avoidTolls: tolls,
                    })
                    .then((response) => {
                        wp_order = response.routes[0].waypoint_order;
                                               
                    })
                    .catch((e) => {
                        window.alert("Invalid Location(s) Entered");
                        document.getElementById("submit").disabled = false;
                        let col2 = document.getElementById("col2");
                        col2.removeChild(document.getElementsByClassName("loader")[0])
                    });
                console.log(waypts_t)
                var waypts = [];
                for (let i = 0; i < waypts_t.length; i++) {
                    if (waypts_t[wp_order[i]].location != "") {
                        waypts.push({
                            location: waypts_t[wp_order[i]].location,
                            stopover: true,
                        });
                    }
                }
                console.log(waypts)

                waypts_distances_for_getPath = [];
                var waypts_distance_Service = new google.maps.DistanceMatrixService();
                // var point_to_calculate_waypts_distance = origin;
                for(let i = 0; i < waypts.length; i++){
                    console.log(140);
                    console.log(waypts[i].location);
                    if(i == 0){
                        await waypts_distance_Service.getDistanceMatrix({
                            origins: [origin],
                            destinations: [waypts[i].location],
                            travelMode: google.maps.TravelMode.DRIVING,
                            unitSystem: google.maps.UnitSystem.IMPERIAL
                        }, point_to_calculate_waypts_distance_callback_for_getPath)
                        // point_to_calculate_waypts_distance = waypts[i];
                    }else{
                        await waypts_distance_Service.getDistanceMatrix({
                            origins: [waypts[i - 1].location],
                            destinations: [waypts[i].location],
                            travelMode: google.maps.TravelMode.DRIVING,
                            unitSystem: google.maps.UnitSystem.IMPERIAL
                        }, point_to_calculate_waypts_distance_callback_for_getPath)
                        waypts_distances_for_getPath[i] += waypts_distances_for_getPath[i - 1];
                    }
                }
                reached_waypts = [];
                for(let i = 0; i < waypts_distances_for_getPath.length; i++){
                    if(waypts_distances_for_getPath[i] < segmentDistance){
                        reached_waypts.push({
                            location: waypts[i].location,
                            stopover: true
                        });
                    }
                }

                await directionsService
                    .route({
                        origin: origin,
                        destination: document.getElementById("end").value,
                        waypoints: waypts,
                        optimizeWaypoints: optimize,
                        travelMode: google.maps.TravelMode.DRIVING,
                        unitSystem: google.maps.UnitSystem.IMPERIAL,
                        avoidHighways: highways,
                        avoidTolls: tolls,
                    })
                    .then((response) => {
                        polyline = new google.maps.geometry.encoding.decodePath(response.routes[0].overview_polyline)
                        // directionsRenderer.setDirections(response);

                        console.log(response.routes)
                        console.log(response.routes[0])
                        route = response.routes[0].overview_path
                        console.log(response.routes[0].legs.length);
                        for(let i = 0; i < response.routes[0].legs.length; i++){
                            routeDistance += response.routes[0].legs[i].distance.value;
                        }
                        //routeDistance = response.routes[0].legs[0].distance.value;
                        console.log(routeDistance);

                        if(segmentDistance > routeDistance) {
                            console.log("distance to long");
                            directionsRenderer.setDirections(response);
                            reached = true;
                            document.getElementById("submit").disabled = false;
                            let col2 = document.getElementById("col2");
                            col2.removeChild(document.getElementsByClassName("loader")[0])

                            const summaryPanel = document.getElementById("directions-panel");

                            summaryPanel.innerHTML = "";

                            // For each route, display summary information.
                            summaryPanel.innerHTML +=
                            "<b>DESTINATION REACHED ALREADY!";
                        }
                    })
                    .catch((e) => {
                        window.alert("Invalid Location(s) Entered");
                        document.getElementById("submit").disabled = false;
                        let col2 = document.getElementById("col2");
                        col2.removeChild(document.getElementsByClassName("loader")[0])
                    });

                console.log(reached);
                if(!reached) {
                    // var distance = 0;
                    var closest= [];
                    var start = Math.round(route.length / (routeDistance / segmentDistance));
                    console.log(route);
                    var stop = false;                    


                    var first = origin;
                    var second = document.getElementById("end").value;
                    var waypt_remain = [];
                    var distance_remain = segmentDistance;
                    for(let i = reached_waypts.length; i < waypts.length; i++){
                        waypt_remain.push({
                            location: waypts[i].location,
                            stopover: true
                        });
                    }
                    if(reached_waypts.length != 0){
                        first = reached_waypts[reached_waypts.length-1].location;
                        distance_remain = segmentDistance - waypts_distances_for_getPath[reached_waypts.length-1];
                    }
                    console.log(first)
                    if(waypt_remain.length != 0){
                        second = waypt_remain[0].location;
                        if(reached_waypts.length != 0){
                            distance_remain = segmentDistance - waypts_distances_for_getPath[reached_waypts.length-1];
                        }
                    }
                    console.log(distance_remain)
                    console.log(second)
                    while(!stop) {
                        await directionsService
                            .route({
                                origin: first,
                                destination: second,
                                // waypoints: reached_waypts,
                                optimizeWaypoints: optimize,
                                travelMode: google.maps.TravelMode.DRIVING,
                                unitSystem: google.maps.UnitSystem.IMPERIAL,
                                avoidHighways: highways,
                                avoidTolls: tolls,
                            })
                            .then((response) => {
                                var distance = 0;
                                console.log(response.routes);
                                var step = response.routes[0].legs[0].steps;
                                for(let a = 0; a < step.length; a++){
                                    distance += step[a].distance.value;
                                    console.log(distance)
                                    if(distance >= distance_remain && a > 0){
                                        console.log("Get")
                                        closest = {lat: step[a-1].end_point.toJSON().lat, lng: step[a-1].end_point.toJSON().lng};
                                        stop = true;
                                        break;
                                    }
                                }
                            })
                            .catch((e) => {
                                window.alert("Invalid Location(s) Entered");
                                document.getElementById("submit").disabled = false;
                                let col2 = document.getElementById("col2");
                                col2.removeChild(document.getElementsByClassName("loader")[0])
                            });
                    }
                    


                    // for(let i = start; i < route.length; i+=3) {
                    //     if(stop) {
                    //         break;
                    //     }

                    //     console.log(reached_waypts);
                    //     await directionsService
                    //         .route({
                    //             origin: origin,
                    //             destination: { lat: route[i].toJSON().lat, lng: route[i].toJSON().lng },
                    //             waypoints: reached_waypts,
                    //             optimizeWaypoints: optimize,
                    //             travelMode: google.maps.TravelMode.DRIVING,
                    //             unitSystem: google.maps.UnitSystem.IMPERIAL,
                    //             avoidHighways: highways,
                    //             avoidTolls: tolls,
                    //         })
                    //         .then((response) => {
                    //             var distance = 0;
                    //             console.log(response.routes);
                    //             for(let a = 0; a < response.routes[0].legs.length; a++){
                    //                 distance += response.routes[0].legs[a].distance.value;
                    //             }
                    //             if(distance >= segmentDistance) {
                    //                 closest = { lat: route[i-1].toJSON().lat, lng: route[i-1].toJSON().lng };
                    //                 console.log(distance, i);
                    //                 stop = true;
                    //                 console.log(stop);
                    //             } else {
                    //                 console.log(distance, i);
                    //             };
                    //         })
                    //         .catch((e) => {
                    //             window.alert("Invalid Location(s) Entered");
                    //             document.getElementById("submit").disabled = false;
                    //             let col2 = document.getElementById("col2");
                    //             col2.removeChild(document.getElementsByClassName("loader")[0])
                    //         });
                    // }
                    // console.log(closest);
                    await getNearbyPlaces(map, closest);
                }
            }
        )
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    } 
}


function point_to_calculate_waypts_distance_callback_for_getPath(response, status){
    console.log(response);
    var results = response.rows[0].elements;
    waypts_distances_for_getPath.push(results[0].distance.value);
}

// Get Current Location Function
function getcurrent(map){
    infoWindow = new google.maps.InfoWindow();

    const locationButton = document.createElement("img");

    locationButton.type = "image";
    locationButton.style.cursor = "pointer";
    locationButton.src = "./src/locate.png";
    locationButton.width = "40";
    locationButton.style.marginRight = "10px";
    locationButton.style.boxShadow = "0px 0px 5px #636060";
    document.body.appendChild(locationButton);

    locationButton.classList.add("custom-map-control-button");
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationButton);
    locationButton.addEventListener("click", () => {
    
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
        
          var current_marker = new google.maps.Marker({
            position: pos,
            map: map,
            icon: "./src/location.png",
          }); 
          current_marker.setMap(map);

          map.setCenter(pos);
          return pos;
          },
          () => {
          handleLocationError(true, infoWindow, map.getCenter());
          }
        );
      } else {
      // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
      }
    });
};

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
      browserHasGeolocation
        ? "Error: The Geolocation service failed."
        : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

function getMeters(i) {
    return i*1609.344;
}

// Search for Nearby Charging Station from point on path
async function getNearbyPlaces(map, position) {
    console.log(position)
    let request = {
        location: position,
        rankBy: google.maps.places.RankBy.DISTANCE,
        keyword: 'Electric vehicle charging'
    };
    console.log("Made IT")
    service = new google.maps.places.PlacesService(map);
    console.log("Made IT")
    await service.nearbySearch(request, nearbyCallback);

}

// Handle the results (up to 20) of the Nearby Search
function nearbyCallback(results, status) {
    console.log(status);
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        console.log(results);
        directionsService
            .route({
                origin: origin,
                destination: results[0].geometry.location,
                waypoints: reached_waypts,
                optimizeWaypoints: optimize,
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.IMPERIAL,
                avoidHighways: highways,
                avoidTolls: tolls,
            })
            .then((response) => {
                directionsRenderer.setDirections(response);

                console.log(response.routes[0]);
                const route = response.routes[0];
                const summaryPanel = document.getElementById("directions-panel");

                total_distance = 0;
                for(let i = 0; i < response.routes[0].legs.length; i++){
                    total_distance += response.routes[0].legs[i].distance.value;    //Meters
                }
                total_distance /= 1609.344;      //change to miles
                total_distance = total_distance.toFixed(1);
                summaryPanel.innerHTML = "";

                for (let i = 0; i < route.legs.length; i++) {
                    if(i == 0){
                        summaryPanel.innerHTML += "<b>From </b><br>" + route.legs[i].start_address +"<br><br>";
                    }
                    if(i == route.legs.length - 1){
                        summaryPanel.innerHTML +=
                        "<b>- This is to first charging stop</b><br>";
                    }
                    else{
                        summaryPanel.innerHTML +=
                        "<b>- This is to one of your waypoints: </b><br>" + reached_waypts[i].location + "<br>";
                        summaryPanel.innerHTML += route.legs[i].distance.text + "<br><br>";
                        continue;
                    }
                    summaryPanel.innerHTML += route.legs[i].end_address + "<br>";
                    summaryPanel.innerHTML += route.legs[i].distance.text + "<br><br>";
                }
                summaryPanel.innerHTML += "<b>Total Distance: </b><br>";
                summaryPanel.innerHTML += total_distance + " miles <br><br>";
            })
            .catch((e) => {
                window.alert("Directions request failed due to " + status);
                document.getElementById("submit").disabled = false;
                let col2 = document.getElementById("col2");
                col2.removeChild(document.getElementsByClassName("loader")[0])
            });
        
    }
    if (status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        window.alert("No charging stations available nearby.\nPlease change distance and try again.");
    }
    document.getElementById("submit").disabled = false;
    let col2 = document.getElementById("col2");
    col2.removeChild(document.getElementsByClassName("loader")[0])
    
}
let count = 0;
function add(){
    var li1 = document.getElementById("waypoint");
    var lis = document.createElement("li");
    var texts = document.createElement('input');
    texts.setAttribute('type', 'text');
    texts.setAttribute('name', "new");
    texts.setAttribute('style', "width: 60%");
    lis.appendChild(texts);

    texts.setAttribute('oninput', "wp_auto(this)");

    var deletes = document.createElement('input');
    deletes.setAttribute('type', 'button');
    deletes.setAttribute('value', 'delete');
    lis.appendChild(deletes);

    var swaps = document.createElement('input');
    swaps.setAttribute('type', 'button');
    swaps.setAttribute('value', 'swap to next');
    lis.appendChild(swaps);
    
    li1.append(lis);
    deletes.setAttribute("onclick", "remove(this)");
    swaps.setAttribute("onclick", "swap(this)")
    texts.focus();
 }

function remove(el) {
    var element = el.parentElement;
    element.remove();
    count--;
}

function swap(el){
    var text1 = el.previousElementSibling.previousElementSibling;

    if(el.parentElement.nextSibling != null){
        var element = el.parentElement.nextSibling;
        var text2 = element.firstChild;
        let temp = text1.value;
        text1.value = text2.value;
        text2.value = temp;
    };
}

function auto_complete(marker, autocomplete){
    marker.setVisible(false);
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        window.alert("No details available for input: '" + place.name + "'");
        return;
    }
    // If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
    } else {
        map.setCenter(place.geometry.location);
        map.setZoom(8);
    }
    marker.setPosition(place.geometry.location);
    marker.setVisible(true);
}

function wp_auto(el){
    const autocomplete_wp = new google.maps.places.Autocomplete(el);
    autocomplete_wp.addListener("place_changed", () => {
        auto_complete(marker, autocomplete_wp);
    });
}