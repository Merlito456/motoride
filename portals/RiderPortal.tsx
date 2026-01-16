
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rider, Ride, Bid, Coordinates, LoadRequest } from '../types';
import { mockBackend } from '../services/mockBackend';
import { ConnectionStatus } from '../services/supabaseService';
import { 
  Power, MapPin, Navigation, DollarSign, Star, 
  TrendingUp, Bell, CheckCircle, Package, ArrowLeft,
  LocateFixed, Wallet, Eye, EyeOff, Phone, MessageSquare,
  History, Settings, ShieldCheck, User as UserIcon, Truck, 
  CreditCard, Calendar, PlusCircle, Send, X, Gavel, Download, FileCheck,
  ChevronRight, Activity
} from 'lucide-react';

const RiderPortal: React.FC<{ user: Rider, activeTab: string, dbStatus: ConnectionStatus }> = ({ user, activeTab, dbStatus }) => {
  const [riderData, setRiderData] = useState<Rider>(user);
  const [rides, setRides] = useState<Ride[]>([]);
  const [online, setOnline] = useState(user.isOnline);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [currentPos, setCurrentPos] = useState<Coordinates>(user.currentLocation);
  const [todayEarnings, setTodayEarnings] = useState(0);
  
  const [showBidModal, setShowBidModal] = useState<Ride | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const rideMarkersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([currentPos.latitude, currentPos.longitude], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = () => {
      const latestRider = mockBackend.getRiders().find(r => r.id === user.id);
      if (latestRider) setRiderData(latestRider);

      const allRides = mockBackend.getRides();
      setRides(allRides.filter(r => r.status === 'pending'));
      
      const inProgress = allRides.find(r => r.riderId === user.id && r.status !== 'completed' && r.status !== 'cancelled');
      if (inProgress) setActiveRide(inProgress);

      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const completedToday = allRides.filter(r => r.riderId === user.id && r.status === 'completed' && new Date(r.createdAt) >= startOfDay);
      setTodayEarnings(completedToday.reduce((sum, r) => sum + (r.totalFare - r.adminFee), 0));
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    if (!mapRef.current) return;

    const riderIcon = L.divIcon({
      className: 'rider-marker',
      html: `<div class="bg-black text-yellow-400 p-2 rounded-xl border-2 border-white shadow-xl"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker([currentPos.latitude, currentPos.longitude], { icon: riderIcon }).addTo(mapRef.current);
    } else {
      riderMarkerRef.current.setLatLng([currentPos.latitude, currentPos.longitude]);
    }

    rideMarkersRef.current.forEach(m => m.remove());
    rideMarkersRef.current = [];

    if (online && !activeRide) {
      rides.forEach(ride => {
        const marker = L.marker([ride.pickupLocation.latitude, ride.pickupLocation.longitude], {
          icon: L.divIcon({
            className: 'ride-marker',
            html: `<div class="bg-${ride.biddingEnabled ? 'indigo-600' : 'yellow-400'} text-${ride.biddingEnabled ? 'white' : 'black'} p-2 rounded-full border-2 border-white animate-bounce shadow-xl flex items-center justify-center">
              ${ride.biddingEnabled ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 4 4"/><path d="M13 7 8 12"/><path d="M9 11l-5 5"/><path d="m2 20 2 2"/><path d="m21 2 1 1-6.5 6.5L14.5 8 21 2Z"/><polyline points="3 16 2 20 6 19"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'}
            </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28]
          })
        }).addTo(mapRef.current!).bindPopup(`₱${ride.totalFare.toFixed(0)} ${ride.biddingEnabled ? 'Bidding' : 'Instant'}`);
        rideMarkersRef.current.push(marker);
      });
    }

    if (polylineRef.current) polylineRef.current.remove();
    if (activeRide && activeRide.routePolyline) {
      polylineRef.current = L.polyline(activeRide.routePolyline, { color: activeRide.biddingEnabled ? '#4f46e5' : '#000', weight: 5, opacity: 0.8 }).addTo(mapRef.current);
      mapRef.current.fitBounds(polylineRef.current.getBounds().pad(0.3));
    }
  }, [online, rides, activeRide, currentPos]);

  const toggleOnline = () => setOnline(!online);
  const handleCompleteRide = () => { if (activeRide) mockBackend.completeRide(activeRide.id); setActiveRide(null); };

  const submitBid = () => {
    if (!showBidModal || bidAmount <= 0) return;
    mockBackend.placeBid({
      rideId: showBidModal.id,
      riderId: riderData.id,
      bidAmount: bidAmount,
      message: 'Professional pilot ready for mission.'
    });
    setShowBidModal(null);
  };

  const handleOpenBid = (ride: Ride) => {
    setShowBidModal(ride);
    setBidAmount(Math.round(ride.baseFare));
  };

  return (
    <div className="relative w-full h-[calc(100vh-10rem)] rounded-3xl overflow-hidden bg-gray-200 border-4 border-white shadow-2xl">
      <div id="leaflet-map" ref={mapContainerRef} className={`absolute inset-0 z-0 h-full w-full transition-all duration-700 ${!online && !activeRide ? 'grayscale' : ''}`} />
      
      {/* Bid Modal Overlay */}
      {showBidModal && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
               <div className="flex items-center gap-3"><Gavel size={20} /><h3 className="text-sm font-black italic uppercase">Submit Offer</h3></div>
               <button onClick={() => setShowBidModal(null)} className="bg-white/10 p-2 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Proposed Fare</p>
                  <div className="flex items-center justify-center gap-4">
                     <button onClick={() => setBidAmount(prev => Math.max(0, prev - 10))} className="w-12 h-12 rounded-2xl border-2 border-gray-100 flex items-center justify-center font-black text-xl hover:bg-gray-50">-</button>
                     <p className="text-5xl font-black italic tracking-tighter">₱{bidAmount}</p>
                     <button onClick={() => setBidAmount(prev => prev + 10)} className="w-12 h-12 rounded-2xl border-2 border-gray-100 flex items-center justify-center font-black text-xl hover:bg-gray-50">+</button>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 italic">Base Fare for this trip is ₱{showBidModal.baseFare.toFixed(0)}</p>
               </div>
               <button onClick={submitBid} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all">Send Offer to Passenger</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-none">
          <div className="w-48 bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-xl pointer-events-auto">
             <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Status</p>
             <div className="flex justify-between">
                <div><p className="text-[8px] font-black uppercase">Today</p><p className="text-xs font-black italic text-green-600">₱{todayEarnings.toFixed(0)}</p></div>
                <div><p className="text-[8px] font-black uppercase">Wallet</p><p className="text-xs font-black italic text-gray-800">₱{riderData.currentBalance.toFixed(0)}</p></div>
             </div>
          </div>
          <button onClick={toggleOnline} className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${online ? 'bg-green-500 text-white border-green-400 shadow-lg shadow-green-100' : 'bg-red-500 text-white border-red-400'}`}>
             <Power size={14} /> {online ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>

        {activeRide ? (
          <div className="max-w-xl mx-auto pointer-events-auto w-full">
            <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">
              <div className={`${activeRide.biddingEnabled ? 'bg-indigo-600' : 'bg-black'} p-4 flex items-center justify-between text-white transition-colors`}>
                <h3 className="text-sm font-black italic uppercase">{activeRide.biddingEnabled ? 'Bidding Mission' : 'Standard Mission'}</h3>
                <span className="text-[10px] font-black uppercase bg-green-500 text-white px-3 py-1 rounded-full">{activeRide.status}</span>
              </div>
              <div className="p-5 flex justify-between items-center">
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Route Context</p>
                    <p className="text-xl font-black italic">{activeRide.distance.toFixed(2)} KM</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Agreed Fare</p>
                       <p className="text-xl font-black italic text-green-600 leading-none">₱{activeRide.totalFare.toFixed(0)}</p>
                    </div>
                    <button onClick={handleCompleteRide} className="bg-green-500 text-white font-black py-4 px-8 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all">Finish Mission</button>
                 </div>
              </div>
            </div>
          </div>
        ) : online && rides.length > 0 ? (
          <div className="max-w-full mx-auto pointer-events-auto w-full overflow-x-auto flex gap-4 pb-6 px-4">
             {rides.map(ride => {
                const hasMyBid = ride.bids.some(b => b.riderId === riderData.id);
                return (
                  <div key={ride.id} className={`min-w-[300px] bg-white rounded-[2.5rem] p-6 shadow-2xl border transition-all ${ride.biddingEnabled ? 'border-indigo-100' : 'border-gray-50'} space-y-4 relative overflow-hidden group`}>
                     {ride.biddingEnabled && (
                       <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black uppercase px-4 py-1 rounded-bl-2xl">Bidding Active</div>
                     )}
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Mission Profile</p>
                           <p className="text-sm font-black italic">{ride.distance.toFixed(1)} KM Trip</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">{ride.biddingEnabled ? 'Target' : 'Fixed'}</p>
                           <p className="text-2xl font-black italic text-green-600">₱{ride.totalFare.toFixed(0)}</p>
                        </div>
                     </div>
                     
                     <div className="space-y-1">
                        <div className="flex items-center gap-2"><MapPin size={10} className="text-blue-500" /><p className="text-[10px] font-bold text-gray-500 truncate">{ride.pickupLocation.placeName}</p></div>
                        <div className="flex items-center gap-2"><Navigation size={10} className="text-red-500" /><p className="text-[10px] font-bold text-gray-500 truncate">{ride.destination.placeName}</p></div>
                     </div>

                     {hasMyBid ? (
                       <div className="w-full bg-indigo-50 text-indigo-600 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest text-center border border-indigo-100">Offer Submitted</div>
                     ) : (
                       <button 
                         onClick={() => ride.biddingEnabled ? handleOpenBid(ride) : mockBackend.updateRide(ride.id, { riderId: riderData.id, status: 'accepted' })} 
                         className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 ${ride.biddingEnabled ? 'bg-indigo-600 text-white' : 'bg-yellow-400 text-black shadow-yellow-100'}`}
                       >
                         {ride.biddingEnabled ? <><Gavel size={14} /> Submit Offer</> : <><ChevronRight size={14} /> Instant Accept</>}
                       </button>
                     )}
                  </div>
                );
             })}
          </div>
        ) : online ? (
          <div className="max-w-xs mx-auto pointer-events-auto bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center gap-3 animate-pulse">
             {/* Added Activity to imports above to fix line 247 error */}
             <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-black shadow-lg"><Activity className="animate-spin" size={24} /></div>
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Scanning local grid...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default RiderPortal;
