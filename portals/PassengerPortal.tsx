
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Passenger, Ride, RideStatus, Coordinates, Bid, Transaction, SavedLocation } from '../types';
import { mockBackend } from '../services/mockBackend';
import { supabaseService, ConnectionStatus } from '../services/supabaseService';
import { MOCK_LOCATIONS, FARE_CONFIG } from '../constants';
import { 
  MapPin, Navigation, Search, DollarSign, Star, 
  ShieldCheck, History, Wallet, LocateFixed, Map as MapIcon,
  MousePointer2, ArrowLeft, Phone, MessageSquare, CreditCard, PlusCircle,
  Calendar, ChevronRight, X, MousePointerClick, FileText, Download,
  Bookmark, Home, Briefcase, Trash2, Heart, Loader2, Gavel, User as UserIcon,
  CheckCircle
} from 'lucide-react';

interface PassengerPortalProps {
  user: Passenger;
  activeTab: string;
  dbStatus: ConnectionStatus;
}

const PassengerPortal: React.FC<PassengerPortalProps> = ({ user, activeTab, dbStatus }) => {
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [inputMethod, setInputMethod] = useState<'search' | 'pin'>('search');
  
  const [biddingEnabled, setBiddingEnabled] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'destination' | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState<'pickup' | 'destination' | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [roadDistance, setRoadDistance] = useState<number>(0);
  const [currentRoute, setCurrentRoute] = useState<[number, number][]>([]);

  const [savedPins, setSavedPins] = useState<SavedLocation[]>([]);
  const [showSaveModal, setShowSaveModal] = useState<Coordinates | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([14.5995, 120.9842], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);

    useCurrentLocation(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Markers and Polyline with State
  useEffect(() => {
    if (!mapRef.current) return;

    // Handle Pickup Marker
    if (pickup) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([pickup.latitude, pickup.longitude]);
      } else {
        pickupMarkerRef.current = L.marker([pickup.latitude, pickup.longitude], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="bg-blue-600 text-white p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          })
        }).addTo(mapRef.current);
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    // Handle Destination Marker
    if (destination) {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setLatLng([destination.latitude, destination.longitude]);
      } else {
        destinationMarkerRef.current = L.marker([destination.latitude, destination.longitude], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="bg-red-600 text-white p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          })
        }).addTo(mapRef.current);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Handle Polyline (Route)
    if (currentRoute.length > 0) {
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(currentRoute);
      } else {
        polylineRef.current = L.polyline(currentRoute, { color: '#3b82f6', weight: 6, opacity: 0.8 }).addTo(mapRef.current);
      }
    } else if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Auto-fit bounds when both points exist
    if (pickup && destination && mapRef.current) {
      const bounds = L.latLngBounds([
        [pickup.latitude, pickup.longitude],
        [destination.latitude, destination.longitude]
      ]);
      mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    }
  }, [pickup, destination, currentRoute]);

  // Handle Fetching the Road Route
  useEffect(() => {
    const fetchRoadRoute = async () => {
      if (!pickup || !destination) {
        setRoadDistance(0);
        setCurrentRoute([]);
        return;
      }

      setIsRouting(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          setRoadDistance(route.distance / 1000);
          const coords = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
          setCurrentRoute(coords);
        } else {
          // Fallback to straight line distance if OSRM fails
          const directDist = L.latLng(pickup.latitude, pickup.longitude).distanceTo(L.latLng(destination.latitude, destination.longitude)) / 1000;
          setRoadDistance(directDist);
          setCurrentRoute([[pickup.latitude, pickup.longitude], [destination.latitude, destination.longitude]]);
        }
      } catch (error) {
        console.error("Routing error:", error);
        const directDist = L.latLng(pickup.latitude, pickup.longitude).distanceTo(L.latLng(destination.latitude, destination.longitude)) / 1000;
        setRoadDistance(directDist);
      } finally {
        setIsRouting(false);
      }
    };

    fetchRoadRoute();
  }, [pickup, destination]);

  // Map Click Listener for Pinning
  useEffect(() => {
    if (!mapRef.current) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (!selectionMode) return;

      const newCoord: Coordinates = {
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        placeName: selectionMode === 'pickup' ? `Pinned Pickup` : `Pinned Destination`,
        address: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
      };

      if (selectionMode === 'pickup') {
        setPickup(newCoord);
      } else if (selectionMode === 'destination') {
        setDestination(newCoord);
      }
      
      setSelectionMode(null);
    };

    if (selectionMode) {
      mapRef.current.on('click', onMapClick);
      mapRef.current.getContainer().style.cursor = 'crosshair';
    } else {
      mapRef.current.off('click', onMapClick);
      if (mapRef.current) mapRef.current.getContainer().style.cursor = '';
    }

    return () => {
      mapRef.current?.off('click', onMapClick);
    };
  }, [selectionMode]);

  useEffect(() => {
    const fetchActiveRide = async () => {
      let currentRide: Ride | null = null;
      if (dbStatus === 'online') {
        const all = await supabaseService.getAllRides();
        currentRide = all.find(r => r.passengerId === user.id && r.status !== 'completed' && r.status !== 'cancelled') || null;
      } else {
        const rides = mockBackend.getRides().filter(r => r.passengerId === user.id);
        currentRide = rides.find(r => r.status !== 'completed' && r.status !== 'cancelled') || null;
      }
      setActiveRide(currentRide);
    };

    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 2000);
    return () => clearInterval(interval);
  }, [user.id, dbStatus]);

  const handleBookRide = async () => {
    if (!pickup || !destination) return;
    
    const dist = roadDistance || L.latLng(pickup.latitude, pickup.longitude).distanceTo(L.latLng(destination.latitude, destination.longitude)) / 1000;
    const baseFare = FARE_CONFIG.BASE_FARE + (dist * FARE_CONFIG.PER_KM_RATE);
    
    const ridePayload: Partial<Ride> = {
      passengerId: user.id,
      pickupLocation: pickup,
      destination,
      routePolyline: currentRoute.length > 0 ? currentRoute : [[pickup.latitude, pickup.longitude], [destination.latitude, destination.longitude]],
      distance: dist,
      baseFare,
      totalFare: baseFare + FARE_CONFIG.ADMIN_FEE,
      biddingEnabled,
      estimatedDuration: Math.round(dist * 2.5),
      paymentMethod: 'cash'
    };

    if (dbStatus === 'online') {
      const newRide = await supabaseService.createRide(ridePayload);
      if (newRide) setActiveRide(newRide);
    } else {
      const newRide = mockBackend.createRide(ridePayload);
      setActiveRide(newRide);
    }
    
    // Reset view
    setSelectionMode(null);
    setPickup(null);
    setDestination(null);
    setRoadDistance(0);
    setCurrentRoute([]);
  };

  const handleAcceptBid = async (bid: Bid) => {
    if (!activeRide) return;
    if (dbStatus === 'online') {
      const success = await supabaseService.acceptBid(activeRide.id, bid.id, bid.riderId, bid.bidAmount);
      if (success) {
        const updated = await supabaseService.getRideById(activeRide.id);
        setActiveRide(updated);
      }
    } else {
      mockBackend.acceptBid(activeRide.id, bid.id);
      const updated = mockBackend.getRides().find(r => r.id === activeRide.id);
      if (updated) setActiveRide(updated);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    if (dbStatus === 'online') {
      await supabaseService.updateRideStatus(activeRide.id, 'cancelled');
    } else {
      mockBackend.updateRide(activeRide.id, { status: 'cancelled' });
    }
    setActiveRide(null);
  };

  const useCurrentLocation = (onlyCenterMap = false) => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoord: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            placeName: 'My Location',
            address: 'GPS'
          };
          if (!onlyCenterMap) setPickup(newCoord);
          if (mapRef.current) mapRef.current.setView([newCoord.latitude, newCoord.longitude], 16);
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  const LocationInput = ({ label, value, type }: { label: string, value: Coordinates | null, type: 'pickup' | 'destination' }) => {
    const isPickup = type === 'pickup';
    const Icon = isPickup ? MapPin : Navigation;
    const color = isPickup ? 'text-blue-500' : 'text-red-500';

    return (
      <div className="relative">
        <div 
          onClick={() => inputMethod === 'pin' ? setSelectionMode(type) : setShowLocationSearch(type)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer hover:border-black shadow-sm ${value ? 'border-gray-100 bg-white' : 'border-gray-50 bg-gray-50'}`}
        >
          <div className={`p-2 rounded-lg ${value ? 'bg-gray-100' : 'bg-white'} ${color}`}><Icon size={16} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">{label}</p>
            <p className={`text-sm font-black truncate ${!value ? 'text-gray-300 italic' : 'text-gray-800'}`}>
              {value ? value.placeName : `Set ${label}...`}
            </p>
          </div>
          {/* Added missing CheckCircle icon below */}
          {value && <CheckCircle className="text-green-500" size={16} />}
        </div>

        {showLocationSearch === type && (
          <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-white border border-gray-200 rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
               <span className="text-[10px] font-black uppercase text-gray-400">Select Location</span>
               <X size={16} className="cursor-pointer text-gray-400" onClick={() => setShowLocationSearch(null)} />
            </div>
            <div className="max-h-[250px] overflow-y-auto">
               {isPickup && (
                 <button className="w-full text-left px-6 py-4 hover:bg-blue-50 flex items-center gap-3" onClick={() => { useCurrentLocation(); setShowLocationSearch(null); }}>
                   <LocateFixed size={14} className={`text-blue-500 ${isLocating ? 'animate-spin' : ''}`} />
                   <p className="text-xs font-black text-blue-600 uppercase">Use Current Location</p>
                 </button>
               )}
               {MOCK_LOCATIONS.map(loc => (
                 <button key={loc.id} className="w-full text-left px-6 py-4 hover:bg-yellow-50 flex items-center gap-4 transition-colors" onClick={() => { if (isPickup) setPickup(loc); else setDestination(loc); setShowLocationSearch(null); if (mapRef.current) mapRef.current.setView([loc.latitude, loc.longitude], 14); }}>
                    <MapPin size={16} className="text-gray-300" />
                    <div>
                      <p className="text-sm font-black text-gray-800">{loc.placeName}</p>
                      <p className="text-[10px] font-bold text-gray-400 truncate">{loc.address}</p>
                    </div>
                 </button>
               ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const assignedRider = activeRide?.riderId ? (dbStatus === 'online' ? mockBackend.getRiders().find(r => r.id === activeRide.riderId) : mockBackend.getRiders().find(r => r.id === activeRide.riderId)) : null;

  return (
    <div className={`relative w-full h-[calc(100vh-10rem)] rounded-[3rem] overflow-hidden bg-gray-200 border-4 shadow-2xl transition-all duration-500 ${selectionMode ? 'border-yellow-400 ring-8 ring-yellow-400/20' : 'border-white'}`}>
      <div id="leaflet-map" ref={mapContainerRef} className="absolute inset-0 z-10 h-full w-full" />

      {activeTab === 'home' && (
        <>
          {!activeRide ? (
            <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between">
              <div className="w-full max-w-sm pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white overflow-hidden animate-slide-up">
                  <div className="bg-yellow-400 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-sm font-black italic uppercase tracking-tighter">Mission Booking</h3>
                    <div className="flex bg-black/10 p-1 rounded-xl">
                       <button onClick={() => { setInputMethod('search'); setSelectionMode(null); }} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${inputMethod === 'search' ? 'bg-black text-yellow-400 shadow-lg' : 'text-gray-600'}`}>Search</button>
                       <button onClick={() => setInputMethod('pin')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${inputMethod === 'pin' ? 'bg-black text-yellow-400 shadow-lg' : 'text-gray-600'}`}>Pin Map</button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <LocationInput label="Origin" value={pickup} type="pickup" />
                    <LocationInput label="Destination" value={destination} type="destination" />
                    
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600"><Gavel size={16} /></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Bidding Mode</span>
                      </div>
                      <button 
                        onClick={() => setBiddingEnabled(!biddingEnabled)}
                        className={`w-12 h-6 rounded-full p-1 transition-all ${biddingEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${biddingEnabled ? 'translate-x-6' : 'translate-x-0'} shadow-md`} />
                      </button>
                    </div>

                    {!isRouting && roadDistance > 0 && (
                      <div className="flex items-center justify-between px-2 py-1 animate-fade-in bg-green-50 rounded-xl border border-green-100">
                        <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{roadDistance.toFixed(2)} KM TRIP</span>
                        <span className="text-sm font-black text-green-700">₱{(FARE_CONFIG.BASE_FARE + (roadDistance * FARE_CONFIG.PER_KM_RATE) + FARE_CONFIG.ADMIN_FEE).toFixed(0)}</span>
                      </div>
                    )}

                    <button 
                      onClick={handleBookRide}
                      disabled={!pickup || !destination || isRouting}
                      className={`w-full font-black py-5 rounded-[1.5rem] text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${
                        pickup && destination && !isRouting 
                          ? biddingEnabled ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-yellow-400 text-black shadow-yellow-200 hover:bg-yellow-500'
                          : 'bg-gray-100 text-gray-300'
                      }`}
                    >
                      {isRouting ? 'Syncing Route...' : biddingEnabled ? 'Launch Auction' : 'Request Pilot'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 pointer-events-auto">
                  <div onClick={() => useCurrentLocation(false)} className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100 cursor-pointer hover:bg-white transition-all hover:scale-105 active:scale-90"><LocateFixed size={24} className={isLocating ? 'animate-spin text-blue-500' : 'text-gray-800'} /></div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-end">
               <div className="w-full max-w-lg mx-auto pointer-events-auto">
                  <div className="bg-white/95 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white overflow-hidden animate-slide-up">
                     <div className={`${activeRide.biddingEnabled && activeRide.status === 'pending' ? 'bg-indigo-600' : 'bg-yellow-400'} p-5 flex items-center justify-between transition-colors`}>
                        <div className="flex items-center gap-4">
                          {activeRide.biddingEnabled && activeRide.status === 'pending' ? <Gavel size={18} className="text-white" /> : <Navigation size={18} className="text-black animate-pulse" />}
                          <h3 className={`text-sm font-black italic uppercase tracking-tighter ${activeRide.biddingEnabled && activeRide.status === 'pending' ? 'text-white' : 'text-black'}`}>
                            {activeRide.biddingEnabled && activeRide.status === 'pending' ? 'Auction Live' : 'Mission Pipeline'}
                          </h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${activeRide.biddingEnabled && activeRide.status === 'pending' ? 'bg-white text-indigo-600' : 'bg-black text-white'}`}>{activeRide.status}</div>
                     </div>
                     
                     <div className="p-6 space-y-6">
                        {activeRide.biddingEnabled && activeRide.status === 'pending' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Available Offers</p>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                                <span className="text-[10px] font-black uppercase text-indigo-600">Broadcasting...</span>
                              </div>
                            </div>
                            
                            <div className="max-h-56 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                               {activeRide.bids.length === 0 ? (
                                 <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                   <Loader2 size={32} className="mx-auto mb-2 text-indigo-200 animate-spin" />
                                   <p className="text-[10px] font-black uppercase text-gray-400">Waiting for Pilots to bid...</p>
                                 </div>
                               ) : (
                                 activeRide.bids.map(bid => (
                                     <div key={bid.id} className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between group hover:border-indigo-600 hover:bg-white transition-all shadow-sm hover:shadow-xl">
                                       <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-yellow-400 shadow-lg">
                                            <UserIcon size={24} />
                                          </div>
                                          <div>
                                            <p className="text-xs font-black uppercase tracking-tight leading-none mb-1">Pilot Elite</p>
                                            <div className="flex items-center gap-1.5">
                                              <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                              <span className="text-[10px] font-bold text-gray-500">4.9 Rating</span>
                                            </div>
                                          </div>
                                       </div>
                                       <div className="flex flex-col items-end gap-2">
                                          <p className="text-2xl font-black italic text-indigo-600 tracking-tighter leading-none">₱{bid.bidAmount}</p>
                                          <button 
                                            onClick={() => handleAcceptBid(bid)}
                                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl shadow-indigo-100 hover:scale-110 active:scale-90 transition-all"
                                          >
                                            Confirm
                                          </button>
                                       </div>
                                     </div>
                                 ))
                               )}
                            </div>
                          </div>
                        )}

                        {assignedRider && (
                          <div className="bg-gray-50 p-5 rounded-[2.5rem] flex items-center justify-between animate-fade-in border border-gray-100 shadow-inner">
                            <div className="flex items-center gap-4">
                               <img src={`https://picsum.photos/seed/${assignedRider.id}/96/96`} className="w-16 h-16 rounded-[1.5rem] shadow-xl border-4 border-white" alt="Pilot" />
                               <div>
                                  <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Elite Pilot</p>
                                  <p className="text-lg font-black italic text-gray-800">{assignedRider.name}</p>
                                  <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">{assignedRider.vehicle.model} • {assignedRider.vehicle.plateNumber}</p>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-green-600 hover:bg-green-50 transition-colors"><Phone size={20} /></button>
                               <button className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-blue-600 hover:bg-blue-50 transition-colors"><MessageSquare size={20} /></button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-3">
                           <div className="flex justify-between items-center px-2">
                             <p className="text-[10px] font-black italic text-gray-400 uppercase tracking-widest">{activeRide.distance.toFixed(2)} KM TRIP</p>
                             <p className="text-2xl font-black italic text-gray-800 tracking-tighter">TOTAL: ₱{activeRide.totalFare.toFixed(0)}</p>
                           </div>
                           <button onClick={handleCancelRide} className="w-full bg-black text-white py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-red-600 transition-all active:scale-95">Abort Mission</button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}

      {selectionMode && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-between p-8 bg-black/5 animate-fade-in">
          <button onClick={() => setSelectionMode(null)} className="pointer-events-auto self-start bg-white p-5 rounded-[2rem] shadow-2xl hover:bg-gray-50 transition-all border border-gray-100 hover:scale-105 active:scale-95"><ArrowLeft size={28} /></button>
          <div className="bg-yellow-400 text-black px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-4 border-4 border-white animate-bounce pointer-events-auto cursor-default">
            <MousePointer2 size={24} className="animate-pulse" />
            <span className="text-base font-black uppercase tracking-widest italic">TAP THE GRID TO SET {selectionMode === 'pickup' ? 'START' : 'END'}</span>
          </div>
          <div className="h-20" /> {/* Spacer */}
        </div>
      )}
    </div>
  );
};

export default PassengerPortal;
