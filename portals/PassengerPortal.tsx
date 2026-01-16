
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Passenger, Ride, RideStatus, Coordinates, Bid, Transaction, SavedLocation } from '../types';
import { mockBackend } from '../services/mockBackend';
import { MOCK_LOCATIONS, FARE_CONFIG } from '../constants';
// Import ConnectionStatus from supabaseService
import { ConnectionStatus } from '../services/supabaseService';
import { 
  MapPin, Navigation, Search, DollarSign, Star, 
  ShieldCheck, History, Wallet, LocateFixed, Map as MapIcon,
  MousePointer2, ArrowLeft, Phone, MessageSquare, CreditCard, PlusCircle,
  Calendar, ChevronRight, X, MousePointerClick, FileText, Download,
  Bookmark, Home, Briefcase, Trash2, Heart
} from 'lucide-react';

interface PassengerPortalProps {
  user: Passenger;
  activeTab: string;
  // Add dbStatus prop to resolve assignment error in App.tsx
  dbStatus: ConnectionStatus;
}

const PassengerPortal: React.FC<PassengerPortalProps> = ({ user, activeTab, dbStatus }) => {
  // Initialize as null to avoid auto-adding origin/destination
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [inputMethod, setInputMethod] = useState<'search' | 'pin'>('search');
  
  const [biddingEnabled, setBiddingEnabled] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'destination' | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState<'pickup' | 'destination' | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Saved Pins State
  const [savedPins, setSavedPins] = useState<SavedLocation[]>([]);
  const [showSaveModal, setShowSaveModal] = useState<Coordinates | null>(null);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveIconType, setSaveIconType] = useState<'home' | 'work' | 'other'>('other');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on a general area (e.g., Metro Manila) initially
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([14.5995, 120.9842], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    // Force size recalculation after a short delay to ensure the container is ready
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);

    // Initial location attempt to center map
    useCurrentLocation(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Recalculate map size when switching back to home tab
  useEffect(() => {
    if (activeTab === 'home' && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [activeTab]);

  // Fetch saved pins
  useEffect(() => {
    setSavedPins(mockBackend.getSavedLocations(user.id));
  }, [user.id]);

  // Selection logic for map clicks
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

  // Sync Markers and Polyline
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

    // Pickup Marker
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

    // Destination Marker
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

    // Polyline
    if (pickup && destination) {
      const latlngs: [number, number][] = [
        [pickup.latitude, pickup.longitude],
        [destination.latitude, destination.longitude]
      ];
      if (!polylineRef.current) {
        polylineRef.current = L.polyline(latlngs, { color: '#000', weight: 3, dashArray: '5, 8', opacity: 0.6 }).addTo(mapRef.current);
      } else {
        polylineRef.current.setLatLngs(latlngs);
      }

      if (!selectionMode && !activeRide) {
         const group = L.featureGroup([pickupMarkerRef.current!, destinationMarkerRef.current!]);
         mapRef.current.fitBounds(group.getBounds().pad(0.3), { animate: true });
      }
    } else if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  }, [pickup, destination, selectionMode, activeRide]);

  // Poll for ride updates
  useEffect(() => {
    const rides = mockBackend.getRides().filter(r => r.passengerId === user.id);
    const inProgress = rides.find(r => r.status !== 'completed' && r.status !== 'cancelled');
    if (inProgress) setActiveRide(inProgress);

    const interval = setInterval(() => {
      const allRides = mockBackend.getRides();
      const updated = allRides.find(r => r.id === activeRide?.id);
      if (updated) setActiveRide(updated);
    }, 3000);

    return () => clearInterval(interval);
  }, [user.id, activeRide?.id]);

  const calculateDistance = (p: Coordinates, d: Coordinates) => {
    const R = 6371;
    const dLat = (d.latitude - p.latitude) * Math.PI / 180;
    const dLon = (d.longitude - p.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p.latitude * Math.PI / 180) * Math.cos(d.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  };

  const handleBookRide = () => {
    if (!pickup || !destination) return;
    const dist = calculateDistance(pickup, destination);
    const baseFare = FARE_CONFIG.BASE_FARE + (dist * FARE_CONFIG.PER_KM_RATE);
    
    const newRide = mockBackend.createRide({
      passengerId: user.id,
      pickupLocation: pickup,
      destination,
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
          
          if (!onlyCenterMap) {
            setPickup(newCoord);
          }
          
          if (mapRef.current) {
            mapRef.current.setView([newCoord.latitude, newCoord.longitude], 16);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  };

  const downloadOfficialReceipt = (ride: Ride) => {
    const docContent = `
OFFICIAL RECEIPT - MOTORIDE PH
------------------------------------------
Receipt No: OR-${ride.id.substring(5, 13).toUpperCase()}
Date: ${new Date(ride.createdAt).toLocaleString()}
Status: COMPLETED

PASSENGER DETAILS:
Name: ${user.name}
Phone: ${user.phone}

TRIP DETAILS:
From: ${ride.pickupLocation.placeName}
To: ${ride.destination.placeName}
Distance: ${ride.distance} KM

FARE BREAKDOWN:
Base Fare: PHP ${ride.baseFare.toFixed(2)}
Service Fee: PHP ${ride.adminFee.toFixed(2)}
------------------------------------------
TOTAL PAID: PHP ${ride.totalFare.toFixed(2)}
------------------------------------------
Payment Method: ${ride.paymentMethod.toUpperCase()}

Thank you for riding with MotoRide!
Fast, Safe & Regulated Transport.
    `;
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
    mockBackend.saveSavedLocation(user.id, {
      ...showSaveModal,
      label: saveLabel,
      iconType: saveIconType
    });
    setSavedPins(mockBackend.getSavedLocations(user.id));
    setShowSaveModal(null);
    setSaveLabel('');
  };

  const handleDeletePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    mockBackend.deleteSavedLocation(user.id, id);
    setSavedPins(mockBackend.getSavedLocations(user.id));
  };

  const renderHistory = () => {
    const myRides = mockBackend.getRides().filter(r => r.passengerId === user.id).reverse();
    return (
      <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-md p-6 overflow-y-auto animate-fade-in">
        <div className="max-w-xl mx-auto space-y-6 pt-12 pb-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
              <History size={24} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter">TRIP HISTORY</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your past MotoRides</p>
            </div>
          </div>

          {myRides.length === 0 ? (
            <div className="py-20 text-center opacity-30 italic font-medium">No trips yet. Start your first MotoRide!</div>
          ) : (
            myRides.map(ride => (
              <div key={ride.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xl shadow-gray-100/50 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(ride.createdAt).toLocaleDateString()}</span>
                   </div>
                   <div className="flex gap-2 items-center">
                      {ride.status === 'completed' && (
                        <button 
                          onClick={() => downloadOfficialReceipt(ride)}
                          className="flex items-center gap-1 bg-yellow-400 text-black px-2 py-1 rounded text-[8px] font-black uppercase hover:bg-yellow-500 transition-colors shadow-sm"
                        >
                           <Download size={10} /> Receipt
                        </button>
                      )}
                      {getStatusBadge(ride.status)}
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0"><MapPin size={12} /></div>
                      <p className="text-xs font-bold text-gray-800 truncate">{ride.pickupLocation.placeName}</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0"><Navigation size={12} /></div>
                      <p className="text-xs font-bold text-gray-800 truncate">{ride.destination.placeName}</p>
                   </div>
                </div>
                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{ride.distance} KM • {ride.paymentMethod}</div>
                   <p className="text-lg font-black italic">₱{ride.totalFare.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const LocationInput = ({ label, value, type }: { label: string, value: Coordinates | null, type: 'pickup' | 'destination' }) => {
    const isPickup = type === 'pickup';
    const Icon = isPickup ? MapPin : Navigation;
    const color = isPickup ? 'text-blue-500' : 'text-red-500';
    const borderColor = isPickup ? 'hover:border-blue-400' : 'hover:border-red-400';

    return (
      <div className="relative">
        <div className="flex gap-2">
          <div 
            onClick={() => {
              if (inputMethod === 'pin') {
                setSelectionMode(type);
              } else {
                setShowLocationSearch(type);
              }
            }}
            className={`flex-1 flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50 transition-all cursor-pointer ${borderColor}`}
          >
            <Icon size={14} className={color} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">{label}</p>
              <p className={`text-xs font-bold truncate ${!value ? 'text-gray-300 italic' : 'text-gray-800'}`}>
                {value ? value.placeName : `Select ${label}...`}
              </p>
            </div>
            {inputMethod === 'search' ? <Search size={12} className="text-gray-400" /> : <MousePointerClick size={12} className="text-gray-400" />}
          </div>
          {value && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowSaveModal(value); }}
              className="p-2 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-yellow-500 transition-colors"
              title="Save this location"
            >
              <Bookmark size={14} />
            </button>
          )}
        </div>

        {/* Dropdown for quick destination search */}
        {showLocationSearch === type && (
          <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-fade-in pointer-events-auto">
            <div className="p-2 border-b border-gray-50 flex justify-between items-center bg-gray-50">
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Location</span>
               <X size={12} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setShowLocationSearch(null)} />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
               {isPickup && (
                 <button 
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b border-gray-50"
                  onClick={() => {
                    useCurrentLocation();
                    setShowLocationSearch(null);
                  }}
                 >
                   <LocateFixed size={12} className={`text-blue-500 ${isLocating ? 'animate-spin' : ''}`} />
                   <p className="text-xs font-black text-blue-600 uppercase">Use Current Location</p>
                 </button>
               )}
               
               {savedPins.length > 0 && (
                 <div className="bg-gray-50/50">
                   <div className="px-4 py-1.5 flex items-center gap-2 border-b border-gray-100">
                      <Bookmark size={10} className="text-yellow-500" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Saved Pins</span>
                   </div>
                   {savedPins.map(pin => (
                     <button 
                        key={pin.id}
                        className="w-full text-left px-4 py-2 hover:bg-yellow-50 flex items-center justify-between group transition-colors border-b border-gray-50"
                        onClick={() => {
                          if (isPickup) setPickup(pin); else setDestination(pin);
                          setShowLocationSearch(null);
                          if (mapRef.current) mapRef.current.setView([pin.latitude, pin.longitude], 14);
                        }}
                     >
                        <div className="flex items-center gap-3 min-w-0">
                           <div className="w-5 h-5 bg-yellow-400 rounded-md flex items-center justify-center flex-shrink-0 text-black">
                             {pin.iconType === 'home' ? <Home size={10} /> : pin.iconType === 'work' ? <Briefcase size={10} /> : <Bookmark size={10} />}
                           </div>
                           <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">{pin.label}</p>
                              <p className="text-[9px] text-gray-400 truncate">{pin.placeName}</p>
                           </div>
                        </div>
                        <Trash2 
                          size={12} 
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" 
                          onClick={(e) => handleDeletePin(pin.id, e)}
                        />
                     </button>
                   ))}
                 </div>
               )}

               <div className="px-4 py-1.5 flex items-center gap-2 border-b border-gray-100">
                  <Search size={10} className="text-gray-400" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Common Landmarks</span>
               </div>
               {MOCK_LOCATIONS.map(loc => (
                 <button 
                   key={loc.id}
                   className="w-full text-left px-4 py-2 hover:bg-yellow-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                   onClick={() => {
                      if (isPickup) setPickup(loc); else setDestination(loc);
                      setShowLocationSearch(null);
                      if (mapRef.current) mapRef.current.setView([loc.latitude, loc.longitude], 14);
                   }}
                 >
                    <MapPin size={12} className="text-gray-300" />
                    <div className="min-w-0">
                       <p className="text-xs font-bold text-gray-800 truncate">{loc.placeName}</p>
                       <p className="text-[10px] text-gray-400 truncate">{loc.address}</p>
                    </div>
                 </button>
               ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const assignedRider = activeRide?.riderId ? mockBackend.getRiders().find(r => r.id === activeRide.riderId) : null;

  return (
    <div className="relative w-full h-[calc(100vh-10rem)] rounded-3xl overflow-hidden bg-gray-200 border-4 border-white shadow-2xl">
      {/* Fullscreen Map Layer */}
      <div id="leaflet-map" ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

      {/* Tab Overlay logic */}
      {activeTab === 'history' && renderHistory()}

      {/* Save Pin Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-sm p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-4 text-black shadow-xl rotate-3">
                <Bookmark size={32} />
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">SAVE LOCATION</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{showSaveModal.placeName}</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Label Name</label>
                <input 
                  type="text"
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  placeholder="e.g., Home, Office, Gym"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Icon Type</label>
                <div className="grid grid-cols-3 gap-3">
                   {[
                     { id: 'home', icon: Home, label: 'Home' },
                     { id: 'work', icon: Briefcase, label: 'Work' },
                     { id: 'other', icon: Heart, label: 'Fav' }
                   ].map(type => (
                     <button 
                       key={type.id}
                       onClick={() => setSaveIconType(type.id as any)}
                       className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${saveIconType === type.id ? 'bg-black text-yellow-400 border-black shadow-lg scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white'}`}
                     >
                       <type.icon size={18} />
                       <span className="text-[8px] font-black uppercase tracking-widest">{type.label}</span>
                     </button>
                   ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
               <button 
                onClick={handleSavePin}
                className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95"
               >
                 Save Pin
               </button>
               <button 
                onClick={() => setShowSaveModal(null)}
                className="flex-1 text-gray-400 font-black uppercase tracking-widest text-xs py-4"
               >
                 Cancel
               </button>
            </div>
          </div>
        </div>
      )}

      {/* PINNING UI: Only shown when in selection mode */}
      {selectionMode && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-between p-6 bg-black/10">
          <div className="w-full flex justify-between items-start pointer-events-auto">
            <button 
              onClick={() => setSelectionMode(null)}
              className="bg-white p-3 rounded-2xl shadow-2xl flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={20} className="text-black" />
            </button>
            <div className="bg-black text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md animate-pulse">
              <MousePointer2 size={16} className="text-yellow-400" />
              <span className="text-sm font-black uppercase tracking-[0.2em]">Select {selectionMode}</span>
            </div>
            <div className="w-12 h-12" /> {/* Spacer */}
          </div>
          
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white/50 text-center max-w-xs pointer-events-auto">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Instruction</p>
             <p className="text-xs font-bold text-gray-800">Tap anywhere on the map to set your <span className="text-yellow-600 uppercase">{selectionMode}</span> point.</p>
          </div>
        </div>
      )}

      {/* REGULAR HOME UI: Hidden when pinning or in other tabs */}
      {!selectionMode && activeTab === 'home' && (
        <>
          {!activeRide ? (
            <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
              {/* Top Left: Booking Controls */}
              <div className="w-full max-w-sm pointer-events-auto space-y-2">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-yellow-400 px-4 py-2 flex items-center justify-between">
                    <h3 className="text-xs font-black italic tracking-tighter">MOTORIDE BOOKING</h3>
                    {/* Method Toggle Switch */}
                    <div className="flex bg-black/10 p-1 rounded-lg">
                       <button 
                        onClick={() => setInputMethod('search')}
                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${inputMethod === 'search' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-500 hover:text-black'}`}
                       >
                         Search
                       </button>
                       <button 
                        onClick={() => setInputMethod('pin')}
                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${inputMethod === 'pin' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-500 hover:text-black'}`}
                       >
                         Pin
                       </button>
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <div className="space-y-2">
                      <LocationInput label="Pickup" value={pickup} type="pickup" />
                      <LocationInput label="Destination" value={destination} type="destination" />
                    </div>

                    {/* Horizontal Quick Pins */}
                    {savedPins.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {savedPins.map(pin => (
                          <button 
                            key={pin.id}
                            onClick={() => {
                              if (!pickup) setPickup(pin);
                              else if (!destination) setDestination(pin);
                              else setDestination(pin);
                              if (mapRef.current) mapRef.current.setView([pin.latitude, pin.longitude], 14);
                            }}
                            className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full hover:bg-white hover:shadow-md transition-all whitespace-nowrap"
                          >
                            <div className="text-yellow-500">
                               {pin.iconType === 'home' ? <Home size={10} /> : pin.iconType === 'work' ? <Briefcase size={10} /> : <Heart size={10} />}
                            </div>
                            <span className="text-[10px] font-bold text-gray-800">{pin.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between bg-black text-white p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Bidding</span>
                      </div>
                      <input type="checkbox" checked={biddingEnabled} onChange={() => setBiddingEnabled(!biddingEnabled)} className="w-3 h-3 accent-yellow-400 pointer-events-auto" />
                    </div>

                    {pickup && destination && (
                      <div className="flex items-center justify-between px-1 animate-fade-in">
                        <span className="text-[10px] font-black text-gray-400">{calculateDistance(pickup, destination)} KM</span>
                        <span className="text-[10px] font-black text-green-600">EST. ₱{(FARE_CONFIG.BASE_FARE + (calculateDistance(pickup, destination) * FARE_CONFIG.PER_KM_RATE) + FARE_CONFIG.ADMIN_FEE).toFixed(2)}</span>
                      </div>
                    )}

                    <button 
                      onClick={handleBookRide}
                      disabled={!pickup || !destination}
                      className={`w-full font-black py-2 rounded-xl text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-lg pointer-events-auto ${
                        pickup && destination ? 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-yellow-200' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Confirm Ride
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Info Icons */}
              <div className="flex justify-between items-end pointer-events-none">
                <div /> {/* Placeholder for removed wallet element */}
                
                <div className="flex flex-col items-end gap-2 pointer-events-auto">
                  <div 
                    onClick={() => useCurrentLocation(false)}
                    className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-100 cursor-pointer hover:bg-white active:scale-95 transition-all"
                  >
                    <LocateFixed size={20} className={`text-black ${isLocating ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="bg-black text-white p-3 rounded-2xl shadow-xl flex items-center gap-2 group cursor-help">
                     <ShieldCheck size={18} className="text-green-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Encrypted Safety</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE RIDE OVERLAY */
            <div className="absolute inset-0 z-20 pointer-events-none p-4 flex flex-col justify-end">
               <div className="w-full max-w-lg mx-auto pointer-events-auto">
                  <div className="bg-white/95 backdrop-blur-lg rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden transform animate-slide-up">
                     <div className="bg-yellow-400 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center animate-pulse">
                              <Navigation size={14} className="text-yellow-400" />
                           </div>
                           <h3 className="text-sm font-black italic tracking-tighter uppercase">Mission Active</h3>
                        </div>
                        {getStatusBadge(activeRide.status)}
                     </div>

                     <div className="p-4 grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                           <div className="flex items-start gap-2">
                              <MapPin size={12} className="text-blue-500 mt-0.5" />
                              <div className="min-w-0">
                                 <p className="text-[8px] font-bold text-gray-400 uppercase">Pickup</p>
                                 <p className="text-[10px] font-black truncate">{activeRide.pickupLocation.placeName}</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-2">
                              <Navigation size={12} className="text-red-500 mt-0.5" />
                              <div className="min-w-0">
                                 <p className="text-[8px] font-bold text-gray-400 uppercase">Drop-off</p>
                                 <p className="text-[10px] font-black truncate">{activeRide.destination.placeName}</p>
                              </div>
                           </div>
                           <div className="flex gap-4 pt-1 border-t border-gray-50">
                              <div>
                                 <p className="text-[8px] font-bold text-gray-400 uppercase">Distance</p>
                                 <p className="text-xs font-black italic">{activeRide.distance}KM</p>
                              </div>
                              <div>
                                 <p className="text-[8px] font-bold text-gray-400 uppercase">Price</p>
                                 <p className="text-xs font-black italic text-green-600">₱{activeRide.totalFare.toFixed(0)}</p>
                              </div>
                           </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 shadow-inner flex flex-col justify-center">
                           {activeRide.riderId ? (
                             <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                   <img src={`https://picsum.photos/seed/${activeRide.riderId}/40/40`} className="w-10 h-10 rounded-xl border-2 border-yellow-400 shadow-md" alt="Rider" />
                                   <div className="min-w-0">
                                      <p className="text-[10px] font-black truncate leading-none">{assignedRider?.name || 'Rider'}</p>
                                      <div className="flex items-center gap-0.5">
                                         <Star size={8} className="text-yellow-500 fill-yellow-500" />
                                         <span className="text-[10px] font-bold">{assignedRider?.rating || '4.8'}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="bg-white p-1.5 rounded-lg border border-gray-100 text-center">
                                   <p className="text-[8px] font-black uppercase text-gray-400 leading-none mb-0.5">{assignedRider?.vehicle.brand} {assignedRider?.vehicle.model}</p>
                                   <p className="text-[10px] font-black italic tracking-tighter">{assignedRider?.vehicle.plateNumber}</p>
                                </div>
                                <div className="flex gap-1">
                                   <a href={`tel:${assignedRider?.phone}`} className="flex-1 bg-black text-white p-1.5 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"><Phone size={12} /></a>
                                   <a href={`sms:${assignedRider?.phone}`} className="flex-1 bg-white border border-gray-200 p-1.5 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"><MessageSquare size={12} /></a>
                                </div>
                             </div>
                           ) : (
                             <div className="space-y-2">
                                <div className="flex justify-between items-center px-1 border-b border-gray-200 pb-1">
                                   <span className="text-[8px] font-black uppercase">Live Bids</span>
                                   <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
                                </div>
                                <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                                   {activeRide.bids.length === 0 ? (
                                     <p className="text-[8px] text-gray-400 uppercase font-bold text-center py-4">Searching...</p>
                                   ) : (
                                     activeRide.bids.map(bid => (
                                       <div key={bid.id} className="bg-white p-2 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
                                          <span className="text-[10px] font-black italic text-green-600">₱{bid.bidAmount}</span>
                                          <button 
                                            onClick={() => mockBackend.acceptBid(activeRide.id, bid.id)}
                                            className="bg-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded uppercase"
                                          >
                                            Accept
                                          </button>
                                       </div>
                                     ))
                                   )}
                                </div>
                             </div>
                           )}
                        </div>
                     </div>

                     <div className="bg-black text-white p-2 text-center">
                        <button 
                          onClick={() => mockBackend.updateRide(activeRide.id, { status: 'cancelled' })}
                          className="text-[10px] font-black uppercase tracking-widest hover:text-red-400 transition-colors"
                        >
                          Cancel Request
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PassengerPortal;
