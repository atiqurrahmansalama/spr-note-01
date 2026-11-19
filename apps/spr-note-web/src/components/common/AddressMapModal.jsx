import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  SearchIcon,
  LocationIcon,
  CrosshairIcon,
  CheckCircleIcon,
  RefreshIcon,
  CompassIcon,
} from '../ui/Icons';
import Modal from '../ui/Modal';
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

// OpenStreetMap Clean Tile Layer (Watermark-Free, API-Key-Free)
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Google Maps Dark Theme Styling
const GOOGLE_MAPS_DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

export default function AddressMapModal({
  isOpen,
  onClose,
  initialLocation = null,
  onConfirm,
}) {
  // Real-time automatic dark mode detection
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      const mode = document.documentElement.getAttribute('data-mode');
      return mode !== 'light';
    }
    return true;
  });

  useEffect(() => {
    const checkTheme = () => {
      if (typeof document !== 'undefined') {
        const mode = document.documentElement.getAttribute('data-mode');
        setIsDark(mode !== 'light');
      }
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mode', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'leaflet' | 'loading'
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
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const googleMapInstanceRef = useRef(null);
  const googleMarkerRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize initial location if provided
  useEffect(() => {
    if (!isOpen) return;

    const initialLat =
      initialLocation?.latitude != null && !isNaN(Number(initialLocation.latitude))
        ? Number(initialLocation.latitude)
        : DEFAULT_LAT;
    const initialLng =
      initialLocation?.longitude != null && !isNaN(Number(initialLocation.longitude))
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

  // Custom theme-colored marker icon
  const getCustomPinIcon = (darkMode) =>
    L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: var(--accent-main, #3b82f6); opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; background: var(--accent-main, #3b82f6); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.5); border: 2.5px solid ${darkMode ? '#18181b' : '#ffffff'};">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${darkMode ? '#18181b' : '#ffffff'}; transform: rotate(45deg);"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 32],
    });

  // Switch Tile Layer dynamically when isDark changes
  useEffect(() => {
    if (leafletMapRef.current) {
      if (tileLayerRef.current) {
        leafletMapRef.current.removeLayer(tileLayerRef.current);
      }

      const newTileLayer = L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        subdomains: 'abc',
        className: isDark ? 'dark-leaflet-tiles' : 'light-leaflet-tiles',
      }).addTo(leafletMapRef.current);

      tileLayerRef.current = newTileLayer;

      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setIcon(getCustomPinIcon(isDark));
      }
    }
  }, [isDark]);

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
          styles: isDark
            ? GOOGLE_MAPS_DARK_STYLES
            : [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
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
        // High-Quality Leaflet Map with Auto Dark/Light Tiles
        setMapEngine('leaflet');

        if (mapContainerRef.current) {
          if (leafletMapRef.current) {
            leafletMapRef.current.remove();
          }

          const lMap = L.map(mapContainerRef.current, {
            center: [currentCoords.lat, currentCoords.lng],
            zoom: 15,
            zoomControl: false,
            attributionControl: false,
          });

          L.control.zoom({ position: 'topright' }).addTo(lMap);

          const tileLayer = L.tileLayer(OSM_TILE_URL, {
            maxZoom: 19,
            subdomains: 'abc',
            className: isDark ? 'dark-leaflet-tiles' : 'light-leaflet-tiles',
          }).addTo(lMap);

          tileLayerRef.current = tileLayer;

          const marker = L.marker([currentCoords.lat, currentCoords.lng], {
            icon: getCustomPinIcon(isDark),
            draggable: true,
          }).addTo(lMap);

          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            if (pos) {
              handleCoordsChange(pos.lat(), pos.lng);
            }
          });

          lMap.on('click', (e) => {
            if (e.latlng) {
              marker.setLatLng(e.latlng);
              handleCoordsChange(e.latlng.lat, e.latlng.lng);
            }
          });

          leafletMapRef.current = lMap;
          leafletMarkerRef.current = marker;

          setTimeout(() => {
            if (leafletMapRef.current) {
              leafletMapRef.current.invalidateSize();
            }
          }, 150);
        }
      }
    }

    const timer = setTimeout(() => {
      initMap();
    }, 50);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      googleMapInstanceRef.current = null;
      googleMarkerRef.current = null;
    };
  }, [isOpen, handleCoordsChange]);

  // OSM Nominatim Search
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

    if (leafletMapRef.current && leafletMarkerRef.current) {
      leafletMapRef.current.setView([lat, lng], 16);
      leafletMarkerRef.current.setLatLng([lat, lng]);
    } else if (googleMapInstanceRef.current && googleMarkerRef.current) {
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

        if (leafletMapRef.current && leafletMarkerRef.current) {
          leafletMapRef.current.setView([lat, lng], 17);
          leafletMarkerRef.current.setLatLng([lat, lng]);
        } else if (googleMapInstanceRef.current && googleMarkerRef.current) {
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

  // Reset pin
  const handleResetPin = () => {
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

    if (leafletMapRef.current && leafletMarkerRef.current) {
      leafletMapRef.current.setView([DEFAULT_LAT, DEFAULT_LNG], 15);
      leafletMarkerRef.current.setLatLng([DEFAULT_LAT, DEFAULT_LNG]);
    } else if (googleMapInstanceRef.current && googleMarkerRef.current) {
      googleMapInstanceRef.current.setCenter({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      googleMarkerRef.current.setPosition({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    }
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Universal Location & Address Picker"
      subtitle="Search area or click/drag pin on map to auto-fill address"
      icon={LocationIcon}
      badge={
        formatCoordinates(currentCoords.lat, currentCoords.lng) ? (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold theme-bg-accent-soft theme-accent border theme-border">
            <CompassIcon className="w-3.5 h-3.5" />
            {formatCoordinates(currentCoords.lat, currentCoords.lng)}
          </span>
        ) : null
      }
      size="3xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={handleResetPin}
            className="px-3.5 py-2 rounded-xl border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Reset Pin</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Confirm & Apply Address</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Custom CSS overrides for Leaflet in Dark / Light Mode with High Contrast Labels */}
      <style>{`
        .leaflet-container {
          background-color: ${isDark ? '#09090b' : '#f8fafc'} !important;
          font-family: inherit !important;
        }
        .dark-leaflet-tiles img.leaflet-tile,
        .dark-leaflet-tiles .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7) !important;
        }
        .light-leaflet-tiles img.leaflet-tile,
        .light-leaflet-tiles .leaflet-tile {
          filter: none !important;
        }
        .leaflet-control-zoom {
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'} !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important;
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          background-color: ${isDark ? '#18181b' : '#ffffff'} !important;
          color: ${isDark ? '#f4f4f5' : '#0f172a'} !important;
          border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 30px !important;
          font-weight: bold !important;
        }
        .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover {
          background-color: ${isDark ? '#27272a' : '#f1f5f9'} !important;
          color: ${isDark ? '#ffffff' : '#000000'} !important;
        }
      `}</style>

      <div className="flex flex-col w-full h-full">
        {/* Search Ribbon */}
        <div className="px-4 sm:px-6 py-3 border-b theme-border theme-bg-sub relative">
          <form onSubmit={handleOSMSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-secondary" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, road, landmark, or district (e.g. Uttara Sector 4, Dhaka)..."
                className="w-full h-10 pl-9 pr-3 py-2 rounded-xl theme-bg-surface border theme-border text-xs theme-text-primary placeholder:opacity-50 focus:outline-none focus:border-current transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-4 h-10 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {isSearching ? (
                <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <SearchIcon className="w-3.5 h-3.5" />
              )}
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="px-3.5 h-10 rounded-xl theme-bg-surface border theme-border text-xs font-bold theme-text-primary hover:theme-bg-sub transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Detect My Current GPS Location"
            >
              {isLocating ? (
                <RefreshIcon className="w-3.5 h-3.5 animate-spin theme-accent" />
              ) : (
                <CrosshairIcon className="w-3.5 h-3.5 theme-accent" />
              )}
              <span className="hidden sm:inline">My Location</span>
            </button>
          </form>

          {/* Search Suggestions Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-4 sm:left-6 right-4 sm:right-6 top-full mt-1 z-30 rounded-xl theme-bg-surface border theme-border shadow-xl overflow-hidden divide-y theme-border max-h-48 overflow-y-auto animate-fade-in">
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelectOSMResult(item)}
                  className="w-full text-left px-3.5 py-2.5 text-xs theme-text-primary hover:theme-bg-sub transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LocationIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map View Area - 100% Theme-Matched Dark/Light Map with Crisp Contrast */}
        <div className="relative w-full h-[320px] sm:h-[350px] theme-bg-sub overflow-hidden border-b theme-border">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Hint Overlay */}
          <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl theme-bg-surface/90 backdrop-blur-xs border theme-border shadow-md text-[11px] font-semibold theme-text-primary flex items-center gap-1.5 pointer-events-none">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span>Click or drag pin to fine-tune location</span>
          </div>
        </div>

        {/* Auto-Parsed Structured Address Strip */}
        <div className="p-4 sm:p-5 theme-bg-surface grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
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
              className="w-full h-9 px-3 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-current"
            />
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
              District
            </span>
            <input
              type="text"
              value={parsedData.district}
              onChange={(e) =>
                setParsedData((prev) => ({ ...prev, district: e.target.value }))
              }
              placeholder="e.g. Gazipur"
              className="w-full h-9 px-3 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-current"
            />
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
              Upazila / Area
            </span>
            <input
              type="text"
              value={parsedData.upazila_thana}
              onChange={(e) =>
                setParsedData((prev) => ({ ...prev, upazila_thana: e.target.value }))
              }
              placeholder="e.g. Tongi"
              className="w-full h-9 px-3 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-current"
            />
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
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
              className="w-full h-9 px-3 rounded-xl theme-bg-sub border theme-border text-xs font-mono font-semibold theme-text-primary focus:outline-none focus:border-current"
            />
          </div>

          <div className="col-span-2 sm:col-span-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
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
              placeholder="House / Road / Block / Holding Address"
              className="w-full h-9 px-3 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-current"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
