
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Passenger, Ride, RideStatus, Coordinates, Bid, Transaction, SavedLocation } from '../types';
import { mockBackend } from '../services/mockBackend';
import { MOCK_LOCATIONS, FARE_CONFIG } from '../constants';
import { ConnectionStatus } from '../services/supabaseService';
import { 
  MapPin, Navigation, Search, DollarSign, Star, 
  ShieldCheck, History, Wallet, LocateFixed, Map as MapIcon,
  MousePointer2, ArrowLeft, Phone, MessageSquare, CreditCard, PlusCircle,
  Calendar, ChevronRight, X, MousePointerClick, FileText, Download,
  Bookmark, Home, Briefcase, Trash2, Heart, Loader2, Gavel, User as UserIcon
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
  const [saveLabel, setSaveLabel] = useState('');
  const [saveIconType, setSaveIconType] = useState<'home' | 'work' | 'other'>('other');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
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

  useEffect(() => {
    if (activeTab === 'home' && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [activeTab]);

  useEffect(() => {
    setSavedPins(mockBackend.getSavedLocations(user.id));
  }, [user.id]);

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
        }
      } catch (error) {
        console.error("Routing error:", error);
      } finally {
        setIsRouting(false);
      }
    };

    fetchRoadRoute();
  }, [pickup, destination]);

  useEffect(() => {
    if (!mapRef.current) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (!selectionMode) return;

      const newCoord: Coordinates = {
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        placeName: selectionMode === 'pickup' ? 'Pinned Pickup' : 'Pinned Destination',
        address: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
      };

      if (selectionMode === 'pickup') {
        setPickup(newCoord);
        setSelectionMode(null);
      } else {
        setDestination(newCoord);
        setSelectionMode(null);
      }
    };

    mapRef.current.on('click', onMapClick);
    return () => {
      mapRef.current?.off('click', onMapClick);
    };
  }, [selectionMode]);

  useEffect(() => {
    if (!mapRef.current) return;

    const createIcon = (color: string, icon: string) => L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="flex flex-col items-center -translate-y-1/2 scale-75">
          <div class="bg-${color}-600 text-white p-2 rounded-full shadow-lg border-2 border-white mb-1">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${icon}"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    if (pickup) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickup.latitude, pickup.longitude], { icon: createIcon('blue', 'map-pin') }).addTo(mapRef.current);
      } else {
        pickupMarkerRef.current.setLatLng([pickup.latitude, pickup.longitude]);
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    if (destination) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = L.marker([destination.latitude, destination.longitude], { icon: createIcon('red', 'navigation') }).addTo(mapRef.current);
      } else {
        destinationMarkerRef.current.setLatLng([destination.latitude, destination.longitude]);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (polylineRef.current) polylineRef.current.remove();
    
    if (currentRoute.length > 0) {
      polylineRef.current = L.polyline(currentRoute, { color: '#000', weight: 4, opacity: 0.8 }).addTo(mapRef.current);
      if (!selectionMode && !activeRide) {
         mapRef.current.fitBounds(polylineRef.current.getBounds().pad(0.3), { animate: true });
      }
    } else if (pickup && destination) {
      const latlngs: [number, number][] = [[pickup.latitude, pickup.longitude], [destination.latitude, destination.longitude]];
      polylineRef.current = L.polyline(latlngs, { color: '#000', weight: 2, dashArray: '5, 10', opacity: 0.4 }).addTo(mapRef.current);
    }
  }, [pickup, destination, currentRoute, selectionMode, activeRide]);

  useEffect(() => {
    const rides = mockBackend.getRides().filter(r => r.passengerId === user.id);
    const inProgress = rides.find(r => r.status !== 'completed' && r.status !== 'cancelled');
    if (inProgress) setActiveRide(inProgress);

    const interval = setInterval(() => {
      const allRides = mockBackend.getRides();
      const updated = allRides.find(r => r.id === activeRide?.id);
      if (updated) setActiveRide(updated);
    }, 2000);

    return () => clearInterval(interval);
  }, [user.id, activeRide?.id]);

  const handleBookRide = () => {
    if (!pickup || !destination) return;
    const dist = roadDistance;
    const baseFare = FARE_CONFIG.BASE_FARE + (dist * FARE_CONFIG.PER_KM_RATE);
    
    const newRide = mockBackend.createRide({
      passengerId: user.id,
      pickupLocation: pickup,
      destination,
      routePolyline: currentRoute,
      distance: dist,
      baseFare,
      totalFare: baseFare + FARE_CONFIG.ADMIN_FEE,
      biddingEnabled,
      estimatedDuration: Math.round(dist * 2.5),
      paymentMethod: 'cash'
    });
    
    setActiveRide(newRide);
    setSelectionMode(null);
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
            address: 'Detected GPS'
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

  const downloadOfficialReceipt = (ride: Ride) => {
    const docContent = `OFFICIAL RECEIPT - MOTORIDE PH\nReceipt No: OR-${ride.id.substring(5, 13).toUpperCase()}\nDate: ${new Date(ride.createdAt).toLocaleString()}\nTOTAL PAID: PHP ${ride.totalFare.toFixed(2)}`;
    const blob = new Blob([docContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Official_Receipt_${ride.id}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: RideStatus) => {
    const styles: Record<RideStatus, string> = {
      pending: 'bg-yellow-400 text-black',
      matched: 'bg-blue-500 text-white',
      accepted: 'bg-indigo-600 text-white',
      arrived: 'bg-green-500 text-white',
      started: 'bg-green-700 text-white',
      completed: 'bg-gray-800 text-white',
      cancelled: 'bg-red-500 text-white'
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${styles[status]}`}>{status}</span>;
  };

  const handleSavePin = () => {
    if (!showSaveModal || !saveLabel.trim()) return;
    mockBackend.saveSavedLocation(user.id, { ...showSaveModal, label: saveLabel, iconType: saveIconType });
    setSavedPins(mockBackend.getSavedLocations(user.id));
    setShowSaveModal(null);
    setSaveLabel('');
  };

  const handleDeletePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    mockBackend.deleteSavedLocation(user.id, id);
    setSavedPins(mockBackend.getSavedLocations(user.id));
  };

  const LocationInput = ({ label, value, type }: { label: string, value: Coordinates | null, type: 'pickup' | 'destination' }) => {
    const isPickup = type === 'pickup';
    const Icon = isPickup ? MapPin : Navigation;
    const color = isPickup ? 'text-blue-500' : 'text-red-500';

    return (
      <div className="relative">
        <div className="flex gap-2">
          <div 
            onClick={() => inputMethod === 'pin' ? setSelectionMode(type) : setShowLocationSearch(type)}
            className={`flex-1 flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50 transition-all cursor-pointer hover:border-black`}
          >
            <Icon size={14} className={color} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">{label}</p>
              <p className={`text-xs font-bold truncate ${!value ? 'text-gray-300 italic' : 'text-gray-800'}`}>
                {value ? value.placeName : `Select ${label}...`}
              </p>
            </div>
          </div>
          {value && (
            <button onClick={(e) => { e.stopPropagation(); setShowSaveModal(value); }} className="p-2 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-yellow-500">
              <Bookmark size={14} />
            </button>
          )}
        </div>

        {showLocationSearch === type && (
          <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
            <div className="p-2 border-b border-gray-50 flex justify-between items-center bg-gray-50">
               <span className="text-[10px] font-black uppercase text-gray-400">Select Location</span>
               <X size={12} className="cursor-pointer text-gray-400" onClick={() => setShowLocationSearch(null)} />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
               {isPickup && (
                 <button className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3" onClick={() => { useCurrentLocation(); setShowLocationSearch(null); }}>
                   <LocateFixed size={12} className={`text-blue-500 ${isLocating ? 'animate-spin' : ''}`} />
                   <p className="text-xs font-black text-blue-600">Use Current Location</p>
                 </button>
               )}
               {savedPins.map(pin => (
                 <button key={pin.id} className="w-full text-left px-4 py-2 hover:bg-yellow-50 flex items-center justify-between" onClick={() => { if (isPickup) setPickup(pin); else setDestination(pin); setShowLocationSearch(null); if (mapRef.current) mapRef.current.setView([pin.latitude, pin.longitude], 14); }}>
                    <div className="flex items-center gap-3"><Bookmark size={10} className="text-yellow-500" /><p className="text-xs font-bold truncate">{pin.label}</p></div>
                    <Trash2 size={12} className="text-gray-300 hover:text-red-500" onClick={(e) => handleDeletePin(pin.id, e)} />
                 </button>
               ))}
               {MOCK_LOCATIONS.map(loc => (
                 <button key={loc.id} className="w-full text-left px-4 py-2 hover:bg-yellow-50 flex items-center gap-3" onClick={() => { if (isPickup) setPickup(loc); else setDestination(loc); setShowLocationSearch(null); if (mapRef.current) mapRef.current.setView([loc.latitude, loc.longitude], 14); }}>
                    <MapPin size={12} className="text-gray-300" /><p className="text-xs font-bold truncate">{loc.placeName}</p>
                 </button>
               ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    const rides = mockBackend.getRides().filter(r => r.passengerId === user.id && r.status === 'completed');
    return (
      <div className="absolute inset-0 z-[70] bg-white overflow-y-auto p-6 md:p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black italic tracking-tighter uppercase">Ride History</h3>
          <History className="text-gray-400" />
        </div>
        {rides.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
            <Calendar size={48} strokeWidth={1} />
            <p className="font-bold uppercase text-[10px] tracking-widest">No completed missions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map(ride => (
              <div key={ride.id} className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(ride.status)}
                    <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(ride.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div><p className="text-xs font-bold text-gray-600 truncate">{ride.pickupLocation.placeName}</p></div>
                  <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></div><p className="text-xs font-bold text-gray-600 truncate">{ride.destination.placeName}</p></div>
                </div>
                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <p className="text-xl font-black italic text-gray-800">₱{ride.totalFare.toFixed(0)}</p>
                  <button onClick={() => downloadOfficialReceipt(ride)} className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-600 hover:text-yellow-700 transition-colors"><Download size={12} /> Receipt</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const assignedRider = activeRide?.riderId ? mockBackend.getRiders().find(r => r.id === activeRide.riderId) : null;

  return (
    <div className="relative w-full h-[calc(100vh-10rem)] rounded-3xl overflow-hidden bg-gray-200 border-4 border-white shadow-2xl">
      <div id="leaflet-map" ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

      {activeTab === 'history' && renderHistory()}

      {!selectionMode && activeTab === 'home' && (
        <>
          {!activeRide ? (
            <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
              <div className="w-full max-w-sm pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-yellow-400 px-4 py-2 flex items-center justify-between">
                    <h3 className="text-xs font-black italic tracking-tighter">MOTORIDE BOOKING</h3>
                    <div className="flex bg-black/10 p-1 rounded-lg">
                       <button onClick={() => setInputMethod('search')} className={`px-3 py-1 rounded-md text-[8px] font-black uppercase ${inputMethod === 'search' ? 'bg-black text-yellow-400' : 'text-gray-500'}`}>Search</button>
                       <button onClick={() => setInputMethod('pin')} className={`px-3 py-1 rounded-md text-[8px] font-black uppercase ${inputMethod === 'pin' ? 'bg-black text-yellow-400' : 'text-gray-500'}`}>Pin</button>
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    <LocationInput label="Pickup" value={pickup} type="pickup" />
                    <LocationInput label="Destination" value={destination} type="destination" />
                    
                    {/* Bidding Toggle */}
                    <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                         <Gavel size={14} className="text-indigo-600" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Open Bidding</span>
                      </div>
                      <button 
                        onClick={() => setBiddingEnabled(!biddingEnabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-all ${biddingEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full transition-all ${biddingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {isRouting && (
                      <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-black text-indigo-600 animate-pulse uppercase">
                        <Loader2 size={12} className="animate-spin" /> Calculating road route...
                      </div>
                    )}

                    {!isRouting && roadDistance > 0 && (
                      <div className="flex items-center justify-between px-1 animate-fade-in">
                        <span className="text-[10px] font-black text-gray-400 uppercase">{roadDistance.toFixed(2)} KM ROAD PATH</span>
                        <span className="text-[10px] font-black text-green-600">₱{(FARE_CONFIG.BASE_FARE + (roadDistance * FARE_CONFIG.PER_KM_RATE) + FARE_CONFIG.ADMIN_FEE).toFixed(0)}</span>
                      </div>
                    )}

                    <button 
                      onClick={handleBookRide}
                      disabled={!pickup || !destination || isRouting}
                      className={`w-full font-black py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg transition-all ${
                        pickup && destination && !isRouting 
                          ? biddingEnabled ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-yellow-400 text-black shadow-yellow-200'
                          : 'bg-gray-100 text-gray-300'
                      }`}
                    >
                      {isRouting ? 'Routing...' : biddingEnabled ? 'Open for Bidding' : 'Confirm Ride'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 pointer-events-auto">
                  <div onClick={() => useCurrentLocation(false)} className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border cursor-pointer"><LocateFixed size={20} className={isLocating ? 'animate-spin' : ''} /></div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 z-20 pointer-events-none p-4 flex flex-col justify-end">
               <div className="w-full max-w-lg mx-auto pointer-events-auto">
                  <div className="bg-white/95 backdrop-blur-lg rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">
                     <div className={`${activeRide.biddingEnabled && activeRide.status === 'pending' ? 'bg-indigo-600' : 'bg-yellow-400'} p-4 flex items-center justify-between transition-colors`}>
                        <div className="flex items-center gap-3">
                          {activeRide.biddingEnabled && activeRide.status === 'pending' ? <Gavel size={14} className="text-white" /> : <Navigation size={14} className="text-black" />}
                          <h3 className={`text-sm font-black italic uppercase ${activeRide.biddingEnabled && activeRide.status === 'pending' ? 'text-white' : 'text-black'}`}>
                            {activeRide.biddingEnabled && activeRide.status === 'pending' ? 'Bidding Command' : 'Mission Active'}
                          </h3>
                        </div>
                        {getStatusBadge(activeRide.status)}
                     </div>
                     
                     <div className="p-5 space-y-4">
                        {/* If Bidding is enabled and no rider accepted yet */}
                        {activeRide.biddingEnabled && activeRide.status === 'pending' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                              <p className="text-[10px] font-black uppercase text-gray-400">Incoming Offers</p>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-indigo-600">Searching Pilots</span>
                              </div>
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                               {activeRide.bids.length === 0 ? (
                                 <div className="text-center py-6 text-gray-300">
                                   <p className="text-[10px] font-black uppercase">No bids received yet</p>
                                 </div>
                               ) : (
                                 activeRide.bids.map(bid => {
                                   const rider = mockBackend.getRiders().find(r => r.id === bid.riderId);
                                   return (
                                     <div key={bid.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-indigo-600 transition-all">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-yellow-400">
                                            <UserIcon size={20} />
                                          </div>
                                          <div>
                                            <p className="text-xs font-black uppercase leading-none mb-1">{rider?.name || 'Pilot'}</p>
                                            <div className="flex items-center gap-1">
                                              <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                              <span className="text-[10px] font-bold text-gray-500">{rider?.rating || '5.0'}</span>
                                            </div>
                                          </div>
                                       </div>
                                       <div className="flex flex-col items-end gap-2">
                                          <p className="text-lg font-black italic text-indigo-600 leading-none">₱{bid.bidAmount}</p>
                                          <button 
                                            onClick={() => {
                                              mockBackend.acceptBid(activeRide.id, bid.id);
                                              const updated = mockBackend.getRides().find(r => r.id === activeRide.id);
                                              if (updated) setActiveRide(updated);
                                            }}
                                            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                                          >
                                            Accept
                                          </button>
                                       </div>
                                     </div>
                                   );
                                 })
                               )}
                            </div>
                          </div>
                        )}

                        {assignedRider && (
                          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between animate-fade-in">
                            <div className="flex items-center gap-4">
                               <img src={`https://picsum.photos/seed/${assignedRider.id}/64/64`} className="w-12 h-12 rounded-xl shadow-lg border-2 border-white" alt="Pilot" />
                               <div>
                                  <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Assigned Pilot</p>
                                  <p className="text-sm font-black italic">{assignedRider.name}</p>
                                  <p className="text-[10px] font-bold text-indigo-600">{assignedRider.vehicle.model} • {assignedRider.vehicle.plateNumber}</p>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-green-600"><Phone size={18} /></button>
                               <button className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-blue-600"><MessageSquare size={18} /></button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                           <div className="flex justify-between items-center px-1">
                             <p className="text-[10px] font-black italic text-gray-400">{activeRide.distance.toFixed(2)} KM Road Mission</p>
                             <p className="text-lg font-black italic">Total: ₱{activeRide.totalFare.toFixed(0)}</p>
                           </div>
                           <button onClick={() => mockBackend.updateRide(activeRide.id, { status: 'cancelled' })} className="w-full bg-black text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-xl">Cancel Request</button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}

      {selectionMode && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-between p-6 bg-black/10">
          <button onClick={() => setSelectionMode(null)} className="pointer-events-auto self-start bg-white p-3 rounded-2xl shadow-2xl"><ArrowLeft size={20} /></button>
          <div className="bg-black text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 animate-pulse">
            <MousePointer2 size={16} className="text-yellow-400" />
            <span className="text-sm font-black uppercase">Select {selectionMode} on Map</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerPortal;
