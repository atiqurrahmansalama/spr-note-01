/**
 * Central Google Maps Script Loader & Geocoding Service
 * Supports Google Maps JS API (Places & Geometry) with graceful fallback to
 * OpenStreetMap Nominatim and manual typing when API key is missing or offline.
 */

let loadPromise = null;

export function getGoogleMapsApiKey() {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (typeof window !== 'undefined' && window.__GOOGLE_MAPS_API_KEY__) ||
    ''
  );
}

export function loadGoogleMaps() {
  if (typeof window === 'undefined') {
    return Promise.resolve({ isLoaded: false, hasKey: false, google: null });
  }

  if (window.google && window.google.maps) {
    return Promise.resolve({ isLoaded: true, hasKey: true, google: window.google });
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.resolve({ isLoaded: false, hasKey: false, google: null });
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    // Check if script element is already added
    const existingScript = document.querySelector('script[data-google-maps-loader="true"]');
    if (existingScript) {
      if (window.google && window.google.maps) {
        resolve({ isLoaded: true, hasKey: true, google: window.google });
      } else {
        existingScript.addEventListener('load', () => {
          resolve({ isLoaded: true, hasKey: true, google: window.google });
        });
        existingScript.addEventListener('error', () => {
          resolve({ isLoaded: false, hasKey: true, google: null });
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';

    script.onload = () => {
      resolve({ isLoaded: true, hasKey: true, google: window.google });
    };

    script.onerror = (err) => {
      console.warn('[googleMapsLoader] Failed to load Google Maps script. Using fallback.', err);
      resolve({ isLoaded: false, hasKey: true, google: null });
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Standard Bangladesh Divisions lookup and normalizer
 */
const BD_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Chittagong',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Barisal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

export function cleanDivisionName(rawDivision = '') {
  if (!rawDivision) return '';
  let cleaned = rawDivision.replace(/Division/gi, '').trim();
  const match = BD_DIVISIONS.find((d) => d.toLowerCase() === cleaned.toLowerCase());
  return match || cleaned;
}

/**
 * Extract structured address from Google Place object or Address Components
 */
export function parseGooglePlaceComponents(place) {
  if (!place) return null;

  const components = place.address_components || [];
  let streetNumber = '';
  let route = '';
  let sublocality = '';
  let upazila = '';
  let district = '';
  let division = '';
  let postalCode = '';
  let country = 'Bangladesh';

  for (const c of components) {
    const types = c.types || [];
    if (types.includes('street_number')) {
      streetNumber = c.long_name;
    } else if (types.includes('route')) {
      route = c.long_name;
    } else if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
      sublocality = c.long_name;
    } else if (types.includes('administrative_area_level_3') || types.includes('locality')) {
      upazila = c.long_name;
    } else if (types.includes('administrative_area_level_2')) {
      // In Bangladesh, administrative_area_level_2 is the District (Zilla)
      district = c.long_name.replace(/District|Zila/gi, '').trim();
    } else if (types.includes('administrative_area_level_1')) {
      // In Bangladesh, administrative_area_level_1 is the Division (Bibhag)
      division = cleanDivisionName(c.long_name);
    } else if (types.includes('postal_code')) {
      postalCode = c.long_name;
    } else if (types.includes('country')) {
      country = c.long_name;
    }
  }

  // Fallback: If district was not detected in level 2, try level 3 or sublocality
  if (!district && upazila) {
    district = upazila;
  }

  // Build clean street address
  let streetAddress = place.formatted_address || '';
  if (streetNumber || route || sublocality) {
    streetAddress = [streetNumber, route, sublocality].filter(Boolean).join(', ');
  }

  const lat = place.geometry?.location?.lat
    ? typeof place.geometry.location.lat === 'function'
      ? place.geometry.location.lat()
      : place.geometry.location.lat
    : null;

  const lng = place.geometry?.location?.lng
    ? typeof place.geometry.location.lng === 'function'
      ? place.geometry.location.lng()
      : place.geometry.location.lng
    : null;

  return {
    address: place.formatted_address || streetAddress || '',
    street_address: streetAddress || '',
    district: district || '',
    division: division || '',
    upazila_thana: upazila || sublocality || '',
    postal_code: postalCode || '',
    post_code: postalCode || '',
    country: country || 'Bangladesh',
    latitude: lat != null ? Number(lat.toFixed(6)) : null,
    longitude: lng != null ? Number(lng.toFixed(6)) : null,
    map_place_id: place.place_id || '',
  };
}

/**
 * Reverse Geocode coordinates using OpenStreetMap Nominatim as fallback
 */
export async function reverseGeocodeOSM(latitude, longitude) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (!res.ok) throw new Error('OSM Reverse Geocode HTTP Error');
    const data = await res.json();
    const addr = data.address || {};

    const division = cleanDivisionName(addr.state || addr.province || addr.region || '');
    const district = (addr.state_district || addr.county || addr.city || '').replace(/District|Zila/gi, '').trim();
    const upazila = addr.suburb || addr.town || addr.municipality || addr.village || addr.neighbourhood || '';
    const postalCode = addr.postcode || '';
    const streetAddress = [addr.road, addr.house_number, upazila].filter(Boolean).join(', ') || data.display_name || '';

    return {
      address: data.display_name || streetAddress || '',
      street_address: streetAddress || '',
      district: district || '',
      division: division || '',
      upazila_thana: upazila || '',
      postal_code: postalCode || '',
      post_code: postalCode || '',
      country: addr.country || 'Bangladesh',
      latitude: Number(Number(latitude).toFixed(6)),
      longitude: Number(Number(longitude).toFixed(6)),
      map_place_id: data.place_id ? `osm_${data.place_id}` : '',
    };
  } catch (err) {
    console.warn('[googleMapsLoader] OSM reverse geocoding error:', err);
    return {
      address: '',
      street_address: '',
      district: '',
      division: '',
      upazila_thana: '',
      postal_code: '',
      post_code: '',
      latitude: Number(Number(latitude).toFixed(6)),
      longitude: Number(Number(longitude).toFixed(6)),
      map_place_id: '',
    };
  }
}

/**
 * Formats lat/lng for compact display in UI badge with max 4 decimals
 * e.g., 23.8103° N, 90.4125° E
 */
export function formatCoordinates(lat, lng) {
  if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return null;
  }
  const numLat = Number(lat);
  const numLng = Number(lng);
  const latDir = numLat >= 0 ? 'N' : 'S';
  const lngDir = numLng >= 0 ? 'E' : 'W';
  return `${Math.abs(numLat).toFixed(4)}° ${latDir}, ${Math.abs(numLng).toFixed(4)}° ${lngDir}`;
}
