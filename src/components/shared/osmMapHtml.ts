/**
 * HTML Leaflet / OpenStreetMap pour WebView.
 * Utilisé car Google Maps ne charge plus ses tuiles dans Expo Go (SDK 55+).
 */

export function buildOsmMapHtml(options: {
  lat: number;
  lng: number;
  zoom?: number;
  /** Couleur du point central (hex) — pin géré en RN, disque optionnel ici. */
  accentHex: string;
  showCenterDot?: boolean;
  markers?: { lat: number; lng: number; color: string }[];
  polyline?: { lat: number; lng: number }[];
  fitPoints?: boolean;
}): string {
  const zoom = options.zoom ?? 15;
  const markersJson = JSON.stringify(options.markers ?? []);
  const polylineJson = JSON.stringify(options.polyline ?? []);
  const showDot = options.showCenterDot ? 'true' : 'false';
  const fitPoints = options.fitPoints ? 'true' : 'false';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #e6e0d3; }
    .leaflet-control-attribution { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([${options.lat}, ${options.lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var markers = ${markersJson};
    var bounds = [];
    markers.forEach(function (m) {
      L.circleMarker([m.lat, m.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: m.color,
        fillOpacity: 1
      }).addTo(map);
      bounds.push([m.lat, m.lng]);
    });

    var route = ${polylineJson};
    if (route.length > 1) {
      L.polyline(route.map(function (p) { return [p.lat, p.lng]; }), {
        color: '${options.accentHex}',
        weight: 4,
        opacity: 0.9,
        dashArray: '10 8'
      }).addTo(map);
      route.forEach(function (p) { bounds.push([p.lat, p.lng]); });
    }

    if (${fitPoints} && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }

    var centerDot = null;
    if (${showDot}) {
      centerDot = L.circleMarker([${options.lat}, ${options.lng}], {
        radius: 5,
        color: '#ffffff',
        weight: 2,
        fillColor: '${options.accentHex}',
        fillOpacity: 1
      }).addTo(map);
    }

    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function emitCenter() {
      var c = map.getCenter();
      if (centerDot) centerDot.setLatLng(c);
      post({ type: 'center', lat: c.lat, lng: c.lng });
    }

    map.on('move', function () {
      if (centerDot) centerDot.setLatLng(map.getCenter());
    });
    map.on('moveend', emitCenter);
    map.whenReady(function () {
      post({ type: 'ready' });
      emitCenter();
    });

    window.setMapCenter = function (lat, lng, animate) {
      if (animate) {
        map.panTo([lat, lng], { animate: true, duration: 0.4 });
      } else {
        map.setView([lat, lng], map.getZoom(), { animate: false });
      }
      if (centerDot) centerDot.setLatLng([lat, lng]);
    };
  </script>
</body>
</html>`;
}
