
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
  CreditCard, Calendar, PlusCircle, Send, X, Gavel, Download, FileCheck
} from 'lucide-react';

const RiderPortal: React.FC<{ user: Rider, activeTab: string, dbStatus: ConnectionStatus }> = ({ user, activeTab, dbStatus }) => {
  const [riderData, setRiderData] = useState<Rider>(user);
  const [rides, setRides] = useState<Ride[]>([]);
  const [online, setOnline] = useState(user.isOnline);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [currentPos, setCurrentPos] = useState<Coordinates>(user.currentLocation);
  const [todayEarnings, setTodayEarnings] = useState(0);
  
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadAmount, setLoadAmount] = useState<number | string>(500);
  const [activeLoadRequest, setActiveLoadRequest] = useState<LoadRequest | null>(null);
  
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

      const lrs = mockBackend.getLoadRequests().filter(r => r.riderId === user.id);
      const activeLR = lrs.find(r => r.status === 'pending');
      setActiveLoadRequest(activeLR || null);

      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const completedToday = allRides.filter(r => r.riderId === user.id && r.status === 'completed' && new Date(r.createdAt) >= startOfDay);
      setTodayEarnings(completedToday.reduce((sum, r) => sum + (r.totalFare - r.adminFee), 0));
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
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
            html: `<div class="bg-yellow-400 text-black p-2 rounded-full border-2 border-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28]
          })
        }).addTo(mapRef.current!).bindPopup(`₱${ride.totalFare.toFixed(0)} Mission`);
        rideMarkersRef.current.push(marker);
      });
    }

    if (polylineRef.current) polylineRef.current.remove();
    if (activeRide && activeRide.routePolyline) {
      polylineRef.current = L.polyline(activeRide.routePolyline, { color: '#000', weight: 5, opacity: 0.8 }).addTo(mapRef.current);
      mapRef.current.fitBounds(polylineRef.current.getBounds().pad(0.3));
    } else if (activeRide) {
      // Fallback to straight line if no polyline stored
      const latlngs: [number, number][] = [[currentPos.latitude, currentPos.longitude], [activeRide.pickupLocation.latitude, activeRide.pickupLocation.longitude], [activeRide.destination.latitude, activeRide.destination.longitude]];
      polylineRef.current = L.polyline(latlngs, { color: '#000', weight: 4, dashArray: '10, 10', opacity: 0.6 }).addTo(mapRef.current);
    }
  }, [online, rides, activeRide, currentPos]);

  const toggleOnline = () => setOnline(!online);
  const handleCompleteRide = () => { if (activeRide) mockBackend.completeRide(activeRide.id); setActiveRide(null); };

  return (
    <div className="relative w-full h-[calc(100vh-10rem)] rounded-3xl overflow-hidden bg-gray-200 border-4 border-white shadow-2xl">
      <div id="leaflet-map" ref={mapContainerRef} className={`absolute inset-0 z-0 h-full w-full transition-all duration-700 ${!online && !activeRide ? 'grayscale' : ''}`} />
      
      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-none">
          <div className="w-48 bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-xl pointer-events-auto">
             <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Status</p>
             <div className="flex justify-between">
                <div><p className="text-[8px] font-black uppercase">Today</p><p className="text-xs font-black italic text-green-600">₱{todayEarnings.toFixed(0)}</p></div>
                <div><p className="text-[8px] font-black uppercase">Wallet</p><p className="text-xs font-black italic text-gray-800">₱{riderData.currentBalance.toFixed(0)}</p></div>
             </div>
          </div>
          <button onClick={toggleOnline} className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 ${online ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
             <Power size={14} /> {online ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>

        {activeRide ? (
          <div className="max-w-xl mx-auto pointer-events-auto w-full">
            <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">
              <div className="bg-black p-4 flex items-center justify-between text-yellow-400">
                <h3 className="text-sm font-black italic uppercase">Road Mission Active</h3>
                <span className="text-[10px] font-black uppercase bg-green-500 text-white px-3 py-1 rounded-full">{activeRide.status}</span>
              </div>
              <div className="p-5 flex justify-between items-center">
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Distance</p>
                    <p className="text-xl font-black italic">{activeRide.distance.toFixed(2)} KM</p>
                 </div>
                 <button onClick={handleCompleteRide} className="bg-green-500 text-white font-black py-3 px-8 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg">Finish Mission</button>
              </div>
            </div>
          </div>
        ) : online && rides.length > 0 ? (
          <div className="max-w-md mx-auto pointer-events-auto w-full overflow-x-auto flex gap-3 pb-4">
             {rides.map(ride => (
                <div key={ride.id} className="min-w-[280px] bg-white rounded-3xl p-4 shadow-xl border border-gray-50 space-y-4">
                   <div className="flex justify-between items-start">
                      <div><p className="text-[8px] font-black uppercase text-gray-400">Mission</p><p className="text-xs font-black italic">{ride.distance.toFixed(1)} KM Trip</p></div>
                      <p className="text-lg font-black italic text-green-600">₱{ride.totalFare.toFixed(0)}</p>
                   </div>
                   <button onClick={() => mockBackend.updateRide(ride.id, { riderId: riderData.id, status: 'accepted' })} className="w-full bg-yellow-400 text-black font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest">Accept Road Path</button>
                </div>
             ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default RiderPortal;
