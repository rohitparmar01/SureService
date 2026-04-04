import React, { useEffect, useState } from 'react';
import { fetchCities, fetchAreas } from '../services/dynamicDataService';

const LocationFilters = ({ city: controlledCity, area: controlledArea, onChange }) => {
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [city, setCity] = useState(controlledCity || '');
  const [area, setArea] = useState(controlledArea || '');
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingCities(true);
    console.debug('[LocationFilters] fetching cities...');
    fetchCities()
      .then(data => {
        console.debug('[LocationFilters] cities response:', data);
        if (mounted) setCities(data);
      })
      .catch((err) => {
        console.error('[LocationFilters] fetchCities error:', err);
        if (mounted) setCities([]);
      })
      .finally(() => { if (mounted) setLoadingCities(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!city) { setAreas([]); setArea(''); onChange?.({ city: '', area: '' }); return; }
    setLoadingAreas(true);
    console.debug(`[LocationFilters] fetching areas for city=${city}...`);
    fetchAreas(city)
      .then(data => {
        console.debug('[LocationFilters] areas response:', data);
        if (mounted) setAreas(data);
      })
      .catch((err) => {
        console.error('[LocationFilters] fetchAreas error:', err);
        if (mounted) setAreas([]);
      })
      .finally(() => { if (mounted) setLoadingAreas(false); });
    return () => { mounted = false; };
  }, [city]);

  // lift state up
  useEffect(() => {
    onChange?.({ city, area });
  }, [city, area]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Location</h4>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">City</label>
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setArea(''); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="">Select city</option>
            {loadingCities ? <option>Loading...</option> : (
              cities.map(c => (
                <option key={c.name} value={c.name}>{c.name}{c.count ? ` (${c.count})` : ''}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Area / Locality</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            disabled={!city || loadingAreas || areas.length === 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="">All areas</option>
            {loadingAreas ? <option>Loading...</option> : (
              areas.map(a => (
                <option key={a.name} value={a.name}>{a.name}{a.count ? ` (${a.count})` : ''}</option>
              ))
            )}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LocationFilters;
