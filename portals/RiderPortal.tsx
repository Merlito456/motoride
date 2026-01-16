
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
  
  const [bidInputs, setBidInputs] = useState<{[key: string]: string}>({});
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadAmount, setLoadAmount] = useState<number | string>(500);
  const [activeLoadRequest, setActiveLoadRequest] = useState<LoadRequest | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const rideMarkersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCurrentPos(coords);
        mockBackend.updateRiderLocation(user.id, coords);
        if (mapRef.current) {
          mapRef.current.setView([coords.latitude, coords.longitude], 16);
          mapRef.current.invalidateSize();
        }
      }, (error) => {
        console.warn("Rider geolocation failed", error);
      }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    }

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
  }, [activeTab, online]);

  useEffect(() => {
    const fetchData = () => {
      const latestRider = mockBackend.getRiders().find(r => r.id === user.id);
      if (latestRider) setRiderData(latestRider);

      const allRides = mockBackend.getRides();
      setRides(allRides.filter(r => r.status === 'pending' || r.status === 'matched'));
      
      const inProgress = allRides.find(r => r.riderId === user.id && r.status !== 'completed' && r.status !== 'cancelled');
      if (inProgress) setActiveRide(inProgress);

      const lrs = mockBackend.getLoadRequests().filter(r => r.riderId === user.id);
      const activeLR = lrs.find(r => r.status === 'pending');
      setActiveLoadRequest(activeLR || null);

      // Calculate Today's Earnings from Transactions
      const txs = mockBackend.getTransactionsByUserId(user.id);
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      
      const todaySum = txs
        .filter(t => new Date(t.createdAt) >= startOfDay)
        .filter(t => t.type === 'ride_payment' || (t.type === 'admin_fee' && t.amount > 0)) // Note: mock logic might vary, usually rider gets the totalFare - adminFee
        .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);
      
      // Simpler calculation: Sum of fares from completed rides today
      const completedToday = allRides
        .filter(r => r.riderId === user.id && r.status === 'completed' && new Date(r.createdAt) >= startOfDay);
      
      const earningsToday = completedToday.reduce((sum, r) => sum + (r.totalFare - r.adminFee), 0);
      setTodayEarnings(earningsToday);
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeLoadRequest?.messages]);

  useEffect(() => {
    if (!mapRef.current) return;

    const riderIcon = L.divIcon({
      className: 'rider-marker',
      html: `
        <div class="relative">
          <div class="absolute inset-0 bg-black rounded-full scale-125 animate-ping opacity-20"></div>
          <div class="bg-black text-yellow-400 p-2 rounded-xl shadow-2xl border-2 border-white relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>
      `,
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
        const rideIcon = L.divIcon({
          className: 'ride-marker',
          html: `
            <div class="bg-yellow-400 text-black p-2 rounded-full shadow-lg border-2 border-white animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        });
        const marker = L.marker([ride.pickupLocation.latitude, ride.pickupLocation.longitude], { icon: rideIcon })
          .addTo(mapRef.current!)
          .bindPopup(`<div class="font-black text-xs uppercase tracking-tighter">₱${ride.totalFare.toFixed(0)} Mission</div>`);
        rideMarkersRef.current.push(marker);
      });
    }

    if (polylineRef.current) polylineRef.current.remove();
    if (activeRide) {
      const latlngs: [number, number][] = [
        [currentPos.latitude, currentPos.longitude],
        [activeRide.pickupLocation.latitude, activeRide.pickupLocation.longitude],
        [activeRide.destination.latitude, activeRide.destination.longitude]
      ];
      polylineRef.current = L.polyline(latlngs, { color: '#000', weight: 4, dashArray: '10, 10', opacity: 0.8 }).addTo(mapRef.current);
      mapRef.current.fitBounds(polylineRef.current.getBounds().pad(0.2));
    }
  }, [online, rides, activeRide, currentPos]);

  const toggleOnline = () => setOnline(!online);

  const handlePlaceBid = (rideId: string) => {
    const amount = parseFloat(bidInputs[rideId]);
    if (isNaN(amount) || amount <= 0) return;
    mockBackend.placeBid({ rideId, riderId: riderData.id, bidAmount: amount });
    setBidInputs(prev => ({ ...prev, [rideId]: '' }));
  };

  const handleCompleteRide = () => {
    if (activeRide) {
      mockBackend.completeRide(activeRide.id);
      setActiveRide(null);
    }
  };

  const submitLoadRequest = () => {
    const amount = typeof loadAmount === 'string' ? parseFloat(loadAmount) : loadAmount;
    if (isNaN(amount) || amount <= 0) return;
    mockBackend.createLoadRequest(riderData.id, amount);
    setShowLoadModal(false);
  };

  const sendChatMessage = () => {
    if (!activeLoadRequest || !chatMessage.trim()) return;
    mockBackend.sendLoadChatMessage(activeLoadRequest.id, riderData.id, chatMessage);
    setChatMessage('');
  };

  const downloadCertificate = (ride: Ride) => {
    const docContent = `CERTIFICATE OF MISSION COMPLETION...`;
    const blob = new Blob([docContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate_${ride.id}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const renderLoadRequestChat = () => (
    <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl overflow-hidden flex flex-col h-[400px]">
      <div className="bg-black p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
            <MessageSquare size={16} className="text-black" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Admin Support</p>
            <p className="text-xs font-bold">Load Request: ₱{activeLoadRequest?.amount}</p>
          </div>
        </div>
        <button onClick={() => setActiveLoadRequest(null)} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeLoadRequest?.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.senderId === riderData.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-bold ${
              msg.senderId === riderData.id ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              {msg.text}
              <p className="text-[8px] opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex gap-2">
        <input 
          type="text" 
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          placeholder="Type payment reference..."
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold"
          onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
        />
        <button onClick={sendChatMessage} className="bg-black text-white p-2 rounded-xl"><Send size={16} /></button>
      </div>
    </div>
  );

  const renderEarnings = () => {
    const transactions = mockBackend.getTransactionsByUserId(riderData.id).reverse();
    const myHistory = mockBackend.getRides().filter(r => r.riderId === riderData.id && r.status === 'completed').reverse();

    return (
      <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-md p-6 overflow-y-auto animate-fade-in">
        <div className="max-w-xl mx-auto space-y-8 pt-12 pb-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                <Wallet size={24} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter">EARNINGS</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payouts and Ledger</p>
              </div>
            </div>
            {!activeLoadRequest && (
              <button onClick={() => setShowLoadModal(true)} className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <PlusCircle size={14} className="inline mr-2" /> REQUEST LOAD
              </button>
            )}
          </div>

          {activeLoadRequest && renderLoadRequestChat()}

          <div className="bg-black p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"></div>
             <div className="flex justify-between items-start mb-6">
                <div>
                   <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Today's Payout</p>
                   <h3 className="text-5xl font-black italic tracking-tighter text-yellow-400">₱{todayEarnings.toFixed(2)}</h3>
                </div>
                <TrendingUp size={32} className="opacity-20" />
             </div>
             <div className="flex justify-between items-end border-t border-white/10 pt-4">
               <div>
                  <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Lifetime</p>
                  <p className="text-sm font-black italic">₱{riderData.totalEarnings.toFixed(2)}</p>
               </div>
               <div>
                  <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Current Balance</p>
                  <p className={`text-sm font-black italic ${riderData.currentBalance < 50 ? 'text-red-400' : 'text-green-400'}`}>₱{riderData.currentBalance.toFixed(2)}</p>
               </div>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Past Missions</h4>
             {myHistory.length === 0 ? (
               <p className="text-center py-5 opacity-30 italic font-medium">No missions completed yet.</p>
             ) : (
               <div className="space-y-3">
                 {myHistory.map(ride => (
                   <div key={ride.id} className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                         <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(ride.createdAt).toLocaleDateString()}</span>
                         <button onClick={() => downloadCertificate(ride)} className="flex items-center gap-1.5 bg-black text-yellow-400 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase">
                            <FileCheck size={10} /> Download Certificate
                         </button>
                      </div>
                      <div className="flex justify-between items-end">
                         <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-gray-800 truncate">{ride.destination.placeName}</p>
                            <p className="text-[8px] text-gray-400 uppercase font-black">{ride.distance} KM • MISSION DONE</p>
                         </div>
                         <p className="font-black italic text-green-600">₱{(ride.totalFare - ride.adminFee).toFixed(0)}</p>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

        {showLoadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-4"><CreditCard size={32} /></div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">REQUEST TOP-UP</h3>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</div>
                <input type="number" value={loadAmount} onChange={(e) => setLoadAmount(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-10 pr-4 font-black text-lg" />
              </div>
              <div className="space-y-3">
                 <button onClick={submitLoadRequest} className="w-full bg-black text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Open Support Chat</button>
                 <button onClick={() => setShowLoadModal(false)} className="w-full text-gray-400 font-black py-2 rounded-2xl uppercase tracking-widest text-[10px]">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-md p-6 overflow-y-auto animate-fade-in">
        <div className="max-w-xl mx-auto space-y-8 pt-12 pb-24">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
              <Settings size={24} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter">PROFILE & MISSION</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identity and Vehicle</p>
            </div>
          </div>

          <div className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-[2rem] shadow-xl">
             <img src={`https://picsum.photos/seed/${riderData.id}/100/100`} className="w-20 h-20 rounded-3xl border-4 border-yellow-400" alt="Rider" />
             <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">{riderData.name}</h3>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                      <Star size={10} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-black">{riderData.rating.toFixed(1)}</span>
                   </div>
                   <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                      <ShieldCheck size={10} className="text-green-500" />
                      <span className="text-[10px] font-black text-green-600 uppercase">Verified</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl space-y-4">
                <Truck size={16} className="text-gray-400" />
                <div>
                   <p className="text-sm font-black italic">{riderData.vehicle.brand} {riderData.vehicle.model}</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{riderData.vehicle.plateNumber}</p>
                </div>
             </div>
             <div className="p-5 bg-gray-50 border border-gray-100 rounded-3xl space-y-4">
                <ShieldCheck size={16} className="text-gray-400" />
                <ul className="space-y-2">
                   {['NBI Clearance', 'LTO License', 'Motor Registration'].map(doc => (
                     <li key={doc} className="flex items-center justify-between text-xs font-bold text-gray-600">
                        {doc} <CheckCircle size={14} className="text-green-500" />
                     </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>
    </div>
  );

  const assignedPassenger = activeRide ? mockBackend.getPassengers().find(p => p.id === activeRide.passengerId) : null;

  return (
    <div className="relative w-full h-[calc(100vh-10rem)] rounded-3xl overflow-hidden bg-gray-200 border-4 border-white shadow-2xl">
      <div id="leaflet-map" ref={mapContainerRef} className={`absolute inset-0 z-0 h-full w-full transition-all duration-700 ${!online && !activeRide ? 'grayscale contrast-75 brightness-75' : ''}`} />

      {activeTab === 'earnings' && renderEarnings()}
      {activeTab === 'settings' && renderSettings()}

      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-none">
          <div className="w-48 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden pointer-events-auto">
             <div className="bg-black p-3 flex items-center gap-3">
                <img src={`https://picsum.photos/seed/${riderData.id}/40/40`} className="w-8 h-8 rounded-lg border border-yellow-400" alt="Rider" />
                <div>
                   <p className="text-[10px] font-black text-yellow-400 uppercase italic tracking-tighter leading-none">{riderData.name.split(' ')[0]}</p>
                   <div className="flex items-center gap-1 mt-0.5">
                      <Star size={8} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] text-white font-bold">{riderData.rating.toFixed(1)}</span>
                   </div>
                </div>
             </div>
             <div className="p-3 grid grid-cols-2 gap-2">
                <div className="text-center border-r border-gray-100 pr-1">
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Today</p>
                   <p className="text-xs font-black italic text-green-600">₱{todayEarnings.toFixed(0)}</p>
                </div>
                <div className="text-center pl-1">
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Wallet</p>
                   <p className="text-xs font-black italic text-gray-800">₱{riderData.currentBalance.toFixed(0)}</p>
                </div>
             </div>
          </div>

          <div className="flex flex-col items-end gap-2 pointer-events-auto">
             <button onClick={toggleOnline} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 ${online ? 'bg-green-500 text-white border-white' : 'bg-red-500 text-white border-white'}`}>
                <Power size={14} /> {online ? 'ONLINE' : 'OFFLINE'}
             </button>
             <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-gray-100">
                <LocateFixed size={14} className="text-black cursor-pointer" onClick={() => { mapRef.current?.setView([currentPos.latitude, currentPos.longitude], 16); mapRef.current?.invalidateSize(); }} />
             </div>
          </div>
        </div>

        {activeTab === 'home' && !activeRide && (
           <div className="w-full pointer-events-none">
             {online ? (
               <div className="max-w-md mx-auto pointer-events-auto">
                 <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">
                    <div className="bg-yellow-400 p-3 flex items-center justify-between">
                       <h3 className="text-[10px] font-black italic tracking-widest">NEARBY MISSIONS</h3>
                       <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded uppercase">{rides.length} FOUND</span>
                    </div>
                    <div className="p-3">
                       {rides.length === 0 ? <div className="py-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning area...</div> : (
                         <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {rides.map(ride => (
                              <div key={ride.id} className="min-w-[260px] bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-4">
                                 <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                       <div className="flex items-center gap-2"><MapPin size={10} className="text-blue-500" /><p className="text-[10px] font-bold truncate w-24">{ride.pickupLocation.placeName}</p></div>
                                       <div className="flex items-center gap-2"><Navigation size={10} className="text-red-500" /><p className="text-[10px] font-bold truncate w-24">{ride.destination.placeName}</p></div>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Price</p>
                                       <p className="text-sm font-black italic text-green-600">₱{ride.totalFare.toFixed(0)}</p>
                                    </div>
                                 </div>
                                 <button onClick={() => mockBackend.updateRide(ride.id, { riderId: riderData.id, status: 'accepted' })} className="w-full bg-yellow-400 text-black font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest">ACCEPT MISSION</button>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>
               </div>
             ) : (
               <div className="max-w-xs mx-auto mb-4 pointer-events-auto">
                  <div className="bg-black text-white p-4 rounded-3xl shadow-2xl text-center border border-white/10 backdrop-blur-md">
                     <p className="text-xs font-black italic tracking-widest uppercase mb-1">Offline</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Turn online to start receiving money-making opportunities.</p>
                  </div>
               </div>
             )}
           </div>
        )}

        {activeTab === 'home' && activeRide && (
           <div className="w-full pointer-events-auto">
                <div className="max-w-xl mx-auto">
                   <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden transform animate-slide-up">
                      <div className="bg-black p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Navigation size={20} className="text-yellow-400" />
                            <div><h3 className="text-sm font-black italic text-yellow-400 tracking-tighter uppercase">MISSION IN PROGRESS</h3></div>
                         </div>
                         <div className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">{activeRide.status}</div>
                      </div>
                      <div className="p-5 grid grid-cols-2 gap-6">
                         <div className="space-y-4">
                            <p className="text-[8px] font-black text-gray-400 uppercase">Pickup: <span className="text-black italic">{activeRide.pickupLocation.placeName}</span></p>
                            <p className="text-[8px] font-black text-gray-400 uppercase">Drop: <span className="text-black italic">{activeRide.destination.placeName}</span></p>
                         </div>
                         <div className="flex flex-col justify-between">
                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex justify-between items-center">
                               <p className="text-[10px] font-black">{assignedPassenger?.name || 'Client'}</p>
                               <p className="text-lg font-black italic text-green-600">₱{activeRide.totalFare.toFixed(0)}</p>
                            </div>
                            <button onClick={handleCompleteRide} className="w-full bg-green-500 text-white font-black py-3 rounded-2xl uppercase tracking-[0.2em] text-[10px] mt-4">Finish Mission</button>
                         </div>
                      </div>
                   </div>
                </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default RiderPortal;
