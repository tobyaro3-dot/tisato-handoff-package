const SERVICE_AREAS = [
  {
    name: "Winter Garden",
    county: "West Orange County",
    coordinates: [28.5653, -81.5862],
    services: [
      "Medical Appointments",
      "Wheelchair Transportation",
      "Physical Therapy",
      "Dialysis",
      "Specialist Visits",
    ],
  },
  {
    name: "Clermont",
    county: "Lake County",
    coordinates: [28.5494, -81.7729],
    services: [
      "Medical Appointments",
      "Wheelchair Transportation",
      "Therapy Visits",
      "Dialysis",
      "Hospital Discharge",
    ],
  },
  {
    name: "Ocoee",
    county: "West Orange County",
    coordinates: [28.5692, -81.5439],
    services: [
      "Medical Appointments",
      "Ambulatory Transportation",
      "Wheelchair Transportation",
      "Therapy Visits",
      "Specialist Visits",
    ],
  },
  {
    name: "Orlando",
    county: "Orange County",
    coordinates: [28.5383, -81.3792],
    services: [
      "Medical Appointments",
      "Wheelchair Transportation",
      "Hospital Discharge",
      "Dialysis Transportation",
      "Therapy Visits",
    ],
  },
  {
    name: "Windermere",
    county: "West Orange County",
    coordinates: [28.4956, -81.5348],
    services: [
      "Medical Appointments",
      "Ambulatory Transportation",
      "Wheelchair Transportation",
      "Physical Therapy",
      "Specialist Visits",
    ],
  },
  {
    name: "Kissimmee",
    county: "Osceola County",
    coordinates: [28.292, -81.4076],
    services: [
      "Medical Appointments",
      "Wheelchair Transportation",
      "Therapy Visits",
      "Hospital Discharge",
      "Dialysis Transportation",
    ],
  },
  {
    name: "Davenport",
    county: "Polk County",
    coordinates: [28.1614, -81.6017],
    services: [
      "Medical Appointments",
      "Ambulatory Transportation",
      "Wheelchair Transportation",
      "Physical Therapy",
      "Specialist Visits",
    ],
  },
];

const serviceAreaRoot = document.querySelector("[data-service-area]");
const serviceAreaList = document.getElementById("serviceAreaList");
const serviceAreaSearch = document.getElementById("serviceAreaSearch");
const serviceAreaMapElement = document.getElementById("serviceAreaMap");

const escapeServiceAreaHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const slugifyServiceArea = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

if (serviceAreaRoot && serviceAreaList && serviceAreaSearch && serviceAreaMapElement) {
  let activeCity = SERVICE_AREAS[0];
  let filteredAreas = [...SERVICE_AREAS];
  let map = null;
  let mapInitialized = false;
  const markers = new Map();

  const markerIcon = (isActive = false) =>
    L.divIcon({
      className: `service-area-marker${isActive ? " is-active" : ""}`,
      html: '<span class="service-area-marker-dot"></span>',
      iconSize: isActive ? [42, 42] : [34, 34],
      iconAnchor: isActive ? [21, 21] : [17, 17],
      popupAnchor: [0, -18],
    });

  const popupTemplate = (city) => `
    <div class="service-area-popup">
      <strong>${escapeServiceAreaHtml(city.name)}</strong>
      <span>${escapeServiceAreaHtml(city.county)}</span>
      <ul>
        ${city.services.map((service) => `<li>${escapeServiceAreaHtml(service)}</li>`).join("")}
      </ul>
      <a href="/booking">Request a Ride</a>
    </div>
  `;

  const renderServiceAreas = () => {
    if (!filteredAreas.length) {
      serviceAreaList.innerHTML = '<p class="service-area-empty">No matching cities yet. Call us and we can check your trip.</p>';
      return;
    }

    serviceAreaList.innerHTML = filteredAreas
      .map(
        (city) => `
          <button class="service-area-city${city.name === activeCity.name ? " is-active" : ""}" type="button" data-city="${escapeServiceAreaHtml(city.name)}">
            <span class="service-area-city-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 21s7-6.1 7-13a7 7 0 0 0-14 0c0 6.9 7 13 7 13Z"></path>
                <circle cx="12" cy="8" r="2.4"></circle>
              </svg>
            </span>
            <span>
              <strong>${escapeServiceAreaHtml(city.name)}</strong>
              <small>${escapeServiceAreaHtml(city.county)}</small>
              <em>${city.services.slice(0, 3).map(escapeServiceAreaHtml).join(" / ")}</em>
            </span>
          </button>
        `
      )
      .join("");
  };

  const syncMarkerHighlight = () => {
    markers.forEach((marker, cityName) => {
      marker.setIcon(markerIcon(cityName === activeCity.name));
    });
  };

  const setActiveCity = (city, shouldFly = true) => {
    activeCity = city;
    renderServiceAreas();
    syncMarkerHighlight();

    const marker = markers.get(city.name);
    if (!map || !marker) return;

    if (shouldFly) {
      map.flyTo(city.coordinates, 11, { duration: 0.75 });
    }

    marker.openPopup();
  };

  const initializeMap = () => {
    if (mapInitialized) return;
    mapInitialized = true;

    if (!window.L) {
      serviceAreaMapElement.innerHTML = '<div class="service-area-map-placeholder"><strong>Map unavailable</strong><span>Please refresh the page or call us for service area help.</span></div>';
      return;
    }

    serviceAreaMapElement.classList.add("is-loaded");
    serviceAreaMapElement.innerHTML = "";

    map = L.map(serviceAreaMapElement, {
      center: [28.43, -81.55],
      zoom: 9,
      scrollWheelZoom: false,
      tap: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    L.circle([28.42, -81.55], {
      radius: 52000,
      color: "#6d35b1",
      weight: 2,
      opacity: 0.36,
      fillColor: "#8f63c7",
      fillOpacity: 0.15,
      interactive: false,
    }).addTo(map);

    SERVICE_AREAS.forEach((city) => {
      const marker = L.marker(city.coordinates, {
        icon: markerIcon(city.name === activeCity.name),
        title: city.name,
      })
        .bindPopup(popupTemplate(city), {
          className: "service-area-leaflet-popup",
          maxWidth: 270,
        })
        .addTo(map);

      marker.on("click", () => setActiveCity(city, false));
      markers.set(city.name, marker);
    });

    window.setTimeout(() => {
      map.invalidateSize();
      setActiveCity(activeCity, false);
    }, 80);
  };

  serviceAreaSearch.addEventListener("input", () => {
    const query = serviceAreaSearch.value.trim().toLowerCase();
    filteredAreas = SERVICE_AREAS.filter((city) =>
      [city.name, city.county, ...city.services].join(" ").toLowerCase().includes(query)
    );

    if (filteredAreas.length && !filteredAreas.some((city) => city.name === activeCity.name)) {
      activeCity = filteredAreas[0];
    }

    renderServiceAreas();
    if (mapInitialized) {
      syncMarkerHighlight();
    }
  });

  serviceAreaList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-city]");
    if (!button) return;

    const city = SERVICE_AREAS.find((item) => item.name === button.dataset.city);
    if (!city) return;

    if (!mapInitialized) {
      initializeMap();
    }

    setActiveCity(city);
  });

  renderServiceAreas();

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        initializeMap();
        observer.disconnect();
      },
      { rootMargin: "180px 0px" }
    );
    observer.observe(serviceAreaRoot);
  } else {
    window.addEventListener("load", initializeMap, { once: true });
  }

  window.TisatoServiceAreas = {
    areas: SERVICE_AREAS.map((area) => ({ ...area })),
    select: (cityName) => {
      const city = SERVICE_AREAS.find((area) => slugifyServiceArea(area.name) === slugifyServiceArea(cityName));
      if (!city) return false;
      if (!mapInitialized) initializeMap();
      setActiveCity(city);
      return true;
    },
  };
}
