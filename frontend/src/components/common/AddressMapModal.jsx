import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CloseIcon,
  SearchIcon,
  LocationIcon,
  CrosshairIcon,
  CheckCircleIcon,
  RefreshIcon,
  CompassIcon,
} from '../ui/Icons';
import {
  loadGoogleMaps,
  parseGooglePlaceComponents,
  reverseGeocodeOSM,
  formatCoordinates,
  cleanDivisionName,
} from '../../services/googleMapsLoader';

// Default center: Dhaka, Bangladesh
const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;

export default function AddressMapModal({
  isOpen,
  onClose,
  initialLocation = null,
  onConfirm,
}) {
  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'osm_fallback' | 'loading'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Active Pin Coordinates
  const [currentCoords, setCurrentCoords] = useState({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  // Extracted structured address fields
  const [parsedData, setParsedData] = useState({
    address: '',
    street_address: '',
    district: '',
    division: '',
    upazila_thana: '',
    postal_code: '',
    post_code: '',
    country: 'Bangladesh',
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    map_place_id: '',
  });

  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googleMarkerRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize initial location if provided
  useEffect(() => {
    if (!isOpen) return;

    const initialLat = initialLocation?.latitude != null && !isNaN(Number(initialLocation.latitude))
      ? Number(initialLocation.latitude)
      : DEFAULT_LAT;
    const initialLng = initialLocation?.longitude != null && !isNaN(Number(initialLocation.longitude))
      ? Number(initialLocation.longitude)
      : DEFAULT_LNG;

    const initCoords = { lat: initialLat, lng: initialLng };
    setCurrentCoords(initCoords);

    setParsedData({
      address: initialLocation?.address || '',
      street_address: initialLocation?.street_address || initialLocation?.address || '',
      district: initialLocation?.district || '',
      division: initialLocation?.division || '',
      upazila_thana: initialLocation?.upazila_thana || '',
      postal_code: initialLocation?.postal_code || initialLocation?.post_code || '',
      post_code: initialLocation?.postal_code || initialLocation?.post_code || '',
      country: initialLocation?.country || 'Bangladesh',
      latitude: initialLat,
      longitude: initialLng,
      map_place_id: initialLocation?.map_place_id || '',
    });
  }, [isOpen, initialLocation]);

  // Handle Reverse Geocoding when coordinates change
  const handleCoordsChange = useCallback(async (lat, lng, place = null) => {
    setCurrentCoords({ lat, lng });

    if (place) {
      const parsed = parseGooglePlaceComponents(place);
      if (parsed) {
        setParsedData(parsed);
        return;
      }
    }

    // If Google Maps is loaded, use Google Geocoder
    if (window.google && window.google.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const parsed = parseGooglePlaceComponents(results[0]);
            if (parsed) {
              setParsedData(parsed);
              return;
            }
          }
          // If Geocoder fails, fallback to OSM
          fallbackOSM(lat, lng);
        });
        return;
      } catch (err) {
        console.warn('[AddressMapModal] Google geocode error:', err);
      }
    }

    fallbackOSM(lat, lng);
  }, []);

  const fallbackOSM = async (lat, lng) => {
    const osmParsed = await reverseGeocodeOSM(lat, lng);
    setParsedData((prev) => ({
      ...prev,
      ...osmParsed,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    }));
  };

  // Initialize Map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initMap() {
      const gLoader = await loadGoogleMaps();

      if (!isMounted) return;

      if (gLoader.isLoaded && window.google && window.google.maps && mapContainerRef.current) {
        setMapEngine('google');

        const mapOptions = {
          center: currentCoords,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        };

        const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
        googleMapInstanceRef.current = map;

        const marker = new window.google.maps.Marker({
          position: currentCoords,
          map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
          title: 'Drag to adjust exact location',
        });
        googleMarkerRef.current = marker;

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            handleCoordsChange(pos.lat(), pos.lng());
          }
        });

        map.addListener('click', (e) => {
          if (e.latLng) {
            marker.setPosition(e.latLng);
            handleCoordsChange(e.latLng.lat(), e.latLng.lng());
          }
        });

        // Initialize Places Autocomplete
        if (searchInputRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: 'bd' },
            fields: ['address_components', 'geometry', 'formatted_address', 'place_id', 'name'],
          });
          autocomplete.bindTo('bounds', map);
          autocompleteRef.current = autocomplete;

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            map.setCenter({ lat, lng });
            map.setZoom(16);
            marker.setPosition({ lat, lng });

            handleCoordsChange(lat, lng, place);
          });
        }
      } else {
        // Fallback to OSM
        setMapEngine('osm_fallback');
      }
    }

    initMap();

    return () => {
      isMounted = false;
      googleMapInstanceRef.current = null;
      googleMarkerRef.current = null;
    };
  }, [isOpen, handleCoordsChange]);

  // OSM Search Fallback
  const handleOSMSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=bd&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) throw new Error('OSM Search Error');
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn('[AddressMapModal] OSM search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOSMResult = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setCurrentCoords({ lat, lng });
    setSearchResults([]);
    setSearchQuery(item.display_name);

    if (googleMapInstanceRef.current && googleMarkerRef.current) {
      googleMapInstanceRef.current.setCenter({ lat, lng });
      googleMarkerRef.current.setPosition({ lat, lng });
    }

    handleCoordsChange(lat, lng);
  };

  // Browser Geolocation / GPS Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = { lat, lng };

        setCurrentCoords(coords);

        if (googleMapInstanceRef.current && googleMarkerRef.current) {
          googleMapInstanceRef.current.setCenter(coords);
          googleMapInstanceRef.current.setZoom(17);
          googleMarkerRef.current.setPosition(coords);
        }

        handleCoordsChange(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Could not detect your location. Please check browser location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Confirm and return structured object
  const handleConfirm = () => {
    const finalData = {
      ...parsedData,
      address: parsedData.address || parsedData.street_address || searchQuery || '',
      latitude: currentCoords.lat != null ? Number(currentCoords.lat.toFixed(6)) : null,
      longitude: currentCoords.lng != null ? Number(currentCoords.lng.toFixed(6)) : null,
    };
    onConfirm(finalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-3xl rounded-2xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border theme-bg-elevated">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl theme-bg-accent-soft flex items-center justify-center theme-accent">
              <LocationIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold theme-text-primary">
                Universal Location & Address Picker
              </h2>
              <p className="text-[11px] theme-text-secondary">
                Search place or drag pin on map for auto reverse-geocoding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {formatCoordinates(currentCoords.lat, currentCoords.lng) && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold theme-bg-accent-soft theme-accent">
                <CompassIcon className="w-3.5 h-3.5" />
                {formatCoordinates(currentCoords.lat, currentCoords.lng)}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Ribbon */}
        <div className="px-5 py-3 border-b theme-border theme-bg-sub relative">
          <form onSubmit={handleOSMSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, road, landmark, or district (e.g. Uttara Sector 4, Dhaka)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary placeholder:text-neutral-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            {mapEngine === 'osm_fallback' && (
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                {isSearching ? (
                  <RefreshIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <SearchIcon className="w-4 h-4" />
                )}
                <span>Search</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="px-3.5 py-2 rounded-xl theme-bg-elevated border theme-border text-xs font-bold theme-text-primary hover:theme-bg-sub transition-colors flex items-center gap-1.5 shrink-0"
              title="Detect My Current GPS Location"
            >
              {isLocating ? (
                <RefreshIcon className="w-4 h-4 animate-spin theme-accent" />
              ) : (
                <CrosshairIcon className="w-4 h-4 theme-accent" />
              )}
              <span className="hidden sm:inline">My Location</span>
            </button>
          </form>

          {/* OSM Search Suggestions Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-5 right-5 top-full mt-1 z-30 rounded-xl theme-bg-elevated border theme-border shadow-xl overflow-hidden divide-y theme-border max-h-48 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelectOSMResult(item)}
                  className="w-full text-left px-3 py-2 text-xs theme-text-primary hover:theme-bg-sub transition-colors flex items-center gap-2"
                >
                  <LocationIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map View Area */}
        <div className="relative flex-1 min-h-[300px] h-[340px] bg-neutral-950 overflow-hidden">
          {mapEngine === 'google' ? (
            <div ref={mapContainerRef} className="w-full h-full" />
          ) : (
            <div className="w-full h-full relative">
              {/* Interactive OpenStreetMap Embed Tile Canvas */}
              <iframe
                title="OpenStreetMap Picker"
                className="w-full h-full border-0 pointer-events-auto"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentCoords.lng - 0.008}%2C${currentCoords.lat - 0.006}%2C${currentCoords.lng + 0.008}%2C${currentCoords.lat + 0.006}&layer=mapnik&marker=${currentCoords.lat}%2C${currentCoords.lng}`}
              />
              <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-mono text-neutral-300 border border-white/10">
                Interactive OSM Mode
              </div>
            </div>
          )}
        </div>

        {/* Auto-Parsed Structured Address Strip */}
        <div className="px-5 py-3 theme-bg-elevated border-t theme-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              Division
            </span>
            <input
              type="text"
              value={parsedData.division}
              onChange={(e) =>
                setParsedData((prev) => ({
                  ...prev,
                  division: cleanDivisionName(e.target.value),
                }))
              }
              placeholder="e.g. Dhaka"
              className="w-full mt-0.5 px-2 py-1 rounded-lg theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              District
            </span>
            <input
              type="text"
              value={parsedData.district}
              onChange={(e) =>
                setParsedData((prev) => ({ ...prev, district: e.target.value }))
              }
              placeholder="e.g. Gazipur"
              className="w-full mt-0.5 px-2 py-1 rounded-lg theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              Upazila / Area
            </span>
            <input
              type="text"
              value={parsedData.upazila_thana}
              onChange={(e) =>
                setParsedData((prev) => ({ ...prev, upazila_thana: e.target.value }))
              }
              placeholder="e.g. Tongi"
              className="w-full mt-0.5 px-2 py-1 rounded-lg theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              Postal Code
            </span>
            <input
              type="text"
              value={parsedData.postal_code}
              onChange={(e) =>
                setParsedData((prev) => ({
                  ...prev,
                  postal_code: e.target.value,
                  post_code: e.target.value,
                }))
              }
              placeholder="e.g. 1710"
              className="w-full mt-0.5 px-2 py-1 rounded-lg theme-bg-sub border theme-border text-xs font-mono font-semibold theme-text-primary focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="col-span-2 sm:col-span-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              Formatted Street / Full Address
            </span>
            <input
              type="text"
              value={parsedData.address || parsedData.street_address}
              onChange={(e) =>
                setParsedData((prev) => ({
                  ...prev,
                  address: e.target.value,
                  street_address: e.target.value,
                }))
              }
              placeholder="House / Road / Block / Full Address"
              className="w-full mt-0.5 px-2 py-1 rounded-lg theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t theme-border theme-bg-sub">
          <button
            type="button"
            onClick={() => {
              setCurrentCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
              setParsedData({
                address: '',
                street_address: '',
                district: '',
                division: '',
                upazila_thana: '',
                postal_code: '',
                post_code: '',
                country: 'Bangladesh',
                latitude: DEFAULT_LAT,
                longitude: DEFAULT_LNG,
                map_place_id: '',
              });
              if (googleMapInstanceRef.current && googleMarkerRef.current) {
                googleMapInstanceRef.current.setCenter({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
                googleMarkerRef.current.setPosition({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
              }
            }}
            className="px-3 py-1.5 rounded-xl border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors flex items-center gap-1.5"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Reset Pin</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Confirm & Apply Address</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
