// ======================================================
// PHOTO DATA
// Information about each photograph and its location
// ======================================================

const photos = [

    {
        title: "Resurrection Bay, Seward",
        image: "images/Resurrection Bay.jpg",
        longitude: -149.43638,
        latitude: 60.071639
    },

    {
        title: "Aialik Glacier, Seward",
        image: "images/Aialik Glacier.jpg",
        longitude: -149.735322,
        latitude: 59.948342
    },

    {
        title: "Kenai River, Cooper Landing",
        image: "images/Kenai River.jpg",
        longitude: -150.047056,
        latitude: 60.484680
    },

    {
        title: "Kachemak Bay, Homer",
        image: "images/Kachemak Bay.jpg",
        longitude: -151.515580,
        latitude: 59.635250
    },
    
    {
        title: "Halibut Cove, Homer",
        image: "images/Halibut Cove.jpg",
        longitude: -151.164436,
        latitude: 59.603153
    }

];



// ======================================================
// CONNECT TO THE ARCGIS MAPS SDK
// ======================================================

const [Map, MapView, Graphic] = await $arcgis.import([
    "@arcgis/core/Map.js",
    "@arcgis/core/views/MapView.js",
    "@arcgis/core/Graphic.js"
]);



// ======================================================
// CREATE THE WEB MAP
// ======================================================

const map = new Map({

    basemap: "streets-vector"

});



// ======================================================
// DISPLAY THE MAP ON THE WEBPAGE
// ======================================================

const view = new MapView({

    container: "map",

    map: map,

    center: [-150.00, 60.00],

    zoom: 7

});



// ======================================================
// ADD A PHOTO LOCATION TO THE MAP AND THE GALLERY
// Used for the original locations AND locations added by the user
// ======================================================

const gallery = document.getElementById("gallery");

// The two dropdown menus used by the distance calculator
const point1Select = document.getElementById("point1");

const point2Select = document.getElementById("point2");



function addPhotoLocation(photo, index) {

    // ---- 1. Red pin on the map ----
    const marker = new Graphic({

        // Location of the photograph
        geometry: {

            type: "point",

            longitude: photo.longitude,

            latitude: photo.latitude

        },


        // Appearance of the location marker
        symbol: {

            type: "picture-marker",
            url: "images/location-pin.png",
            width: "24px",
            height: "32px"

        },


        // Connect the marker to its photograph
        attributes: {

            photoIndex: index,

            title: photo.title

        }

    });

    // Add the marker to the map
    view.graphics.add(marker);


    // ---- 2. Thumbnail in the gallery ----
    const image = document.createElement("img");

    // Use the photograph as the thumbnail
    image.src = photo.image;

    // Apply our CSS thumbnail style
    image.className = "thumbnail";

    // Display the photograph when thumbnail is clicked
    image.onclick = function() {

        showPhoto(index);

    };

    // Add thumbnail to the gallery
    gallery.appendChild(image);


    // ---- 3. Entry in both distance dropdowns ----
    // new Option(text shown, value stored): the value is the photo's index
    point1Select.appendChild(new Option(photo.title, index));

    point2Select.appendChild(new Option(photo.title, index));

}


// Add the original locations
photos.forEach(function(photo, index) {

    addPhotoLocation(photo, index);

});



// ======================================================
// DISPLAY A SELECTED PHOTO
// Used when either a map location or thumbnail is selected
// ======================================================

function showPhoto(index) {

    const photo = photos[index];


    // Display the selected photograph
    document.getElementById("selected-photo").src =
        photo.image;


    // Display the name of the location
    document.getElementById("photo-title").textContent =
        photo.title;


    // Find all thumbnails
    const thumbnails =
        document.querySelectorAll(".thumbnail");


    // Remove the selected style from all thumbnails
    thumbnails.forEach(function(thumbnail) {

        thumbnail.classList.remove("selected");

    });


    // Highlight the selected thumbnail
    thumbnails[index].classList.add("selected");

}



// ======================================================
// RESPOND WHEN A PHOTO LOCATION IS CLICKED ON THE MAP
// ======================================================

view.on("click", async function(event) {

    // Look only for our red photo markers
    const response = await view.hitTest(event, {
        include: view.graphics
    });


    // Check whether a marker was clicked
    if (response.results.length > 0) {

        const result = response.results[0];

        // Get the photograph connected to the marker
        const index = result.graphic.attributes.photoIndex;

        // Display the photograph
        showPhoto(index);

    }

});


// ======================================================
// DISPLAY THE FIRST PHOTO WHEN THE APP OPENS
// ======================================================

showPhoto(0);

// ======================================================
// COLLAPSE AND EXPAND THE PHOTO GALLERY
// ======================================================

const gallerySection =
    document.getElementById("gallery-section");

const galleryToggle =
    document.getElementById("gallery-toggle");


galleryToggle.onclick = function() {

    gallerySection.classList.toggle("collapsed");

};


// ======================================================
// ACCEPT A NEW LOCATION FROM THE USER
// ======================================================

const locationForm = document.getElementById("location-form");

const formMessage = document.getElementById("form-message");


locationForm.addEventListener("submit", function(event) {

    // Stop the page from reloading when the form is submitted
    event.preventDefault();


    // Read the values the user typed into the form
    const title = document.getElementById("location-title").value.trim();

    const imageFile = document.getElementById("location-image").files[0];

    const longitude = Number(document.getElementById("location-longitude").value);

    const latitude = Number(document.getElementById("location-latitude").value);


    // Check that the user entered valid information
    if (title === "" || !imageFile ||
        longitude < -180 || longitude > 180 ||
        latitude < -90 || latitude > 90) {

        formMessage.textContent =
            "Please enter a title, photo, and valid longitude/latitude.";

        formMessage.className = "error";

        return;

    }


    // Browsers can only display these photo types
    // (iPhone HEIC photos will NOT display, so we reject them)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(imageFile.type)) {

        formMessage.textContent =
            "Please choose a JPG, PNG, WebP or GIF photo. " +
            "HEIC photos can't be displayed in the browser.";

        formMessage.className = "error";

        return;

    }


    // Let the browser display the uploaded photo
    const imageURL = URL.createObjectURL(imageFile);


    // Store the new location with the existing locations
    const newPhoto = {

        title: title,
        image: imageURL,
        longitude: longitude,
        latitude: latitude

    };

    photos.push(newPhoto);

    const newIndex = photos.length - 1;


    // Add it to the map and gallery, then display it
    addPhotoLocation(newPhoto, newIndex);

    showPhoto(newIndex);


    // Move the map to the new location
    view.goTo({ center: [longitude, latitude], zoom: 10 });


    formMessage.textContent = title + " was added to the map!";

    formMessage.className = "success";

    locationForm.reset();

});


// ======================================================
// CONVERT LONGITUDE/LATITUDE TO UTM (meters)
// Distances in degrees are not useful, so we first convert
// each point to UTM X/Y (WGS 84), which are in meters.
// This is the same kind of X/Y used in the class example.
// ======================================================

function lonLatToUTM(longitude, latitude, zone) {

    // Shape of the Earth (WGS 84 ellipsoid)
    const a = 6378137;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const e2 = f * (2 - f);
    const ep2 = e2 / (1 - e2);

    // Angles in radians
    const phi = latitude * Math.PI / 180;
    const lambda = longitude * Math.PI / 180;

    // Center line (central meridian) of the UTM zone
    const lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const tanPhi = Math.tan(phi);

    const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
    const T = tanPhi * tanPhi;
    const C = ep2 * cosPhi * cosPhi;
    const A = (lambda - lambda0) * cosPhi;

    // Distance along the meridian from the equator
    const M = a * (
        (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
        - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
        + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
        - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi)
    );

    // Easting (X) and northing (Y) in meters
    const x = k0 * N * (
        A + (1 - T + C) * A ** 3 / 6
        + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120
    ) + 500000;

    let y = k0 * (
        M + N * tanPhi * (
            A ** 2 / 2
            + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24
            + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720
        )
    );

    // Southern hemisphere adds 10,000,000 m to Y
    if (latitude < 0) {
        y += 10000000;
    }

    return { x: x, y: y };

}



// ======================================================
// CALCULATE DISTANCE BETWEEN ANY TWO LOCATIONS
// ======================================================

// Start with the first two locations selected
point1Select.value = "0";

point2Select.value = "1";


document.getElementById("distance-btn").onclick = function() {

    // Find the two locations chosen in the dropdowns
    const point1 = photos[Number(point1Select.value)];

    const point2 = photos[Number(point2Select.value)];


    // The same location twice would always give 0
    if (point1 === point2) {

        document.getElementById("distance-result").textContent =
            "Please select two different locations.";

        return;

    }


    // Use ONE UTM zone for both points so their X/Y values match.
    // We pick the zone that contains the middle of the two points.
    const middleLongitude = (point1.longitude + point2.longitude) / 2;

    const zone = Math.floor((middleLongitude + 180) / 6) + 1;


    // Convert both points from longitude/latitude to UTM meters
    const utm1 = lonLatToUTM(point1.longitude, point1.latitude, zone);

    const utm2 = lonLatToUTM(point2.longitude, point2.latitude, zone);


    // Difference between the X values and between the Y values
    const dx = utm2.x - utm1.x;

    const dy = utm2.y - utm1.y;


    // Pythagorean theorem: straight-line distance in meters
    const distance = Math.sqrt(dx ** 2 + dy ** 2);

    console.log(point1.title, "to", point2.title,
                distance.toFixed(2), "meters (UTM zone " + zone + ")");


    // Show the result in meters and kilometers
    document.getElementById("distance-result").textContent =
        "Distance: " + distance.toFixed(2) + " meters (" +
        (distance / 1000).toFixed(3) + " km)";

};
