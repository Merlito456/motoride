
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Ride, Rider, Passenger, Transaction, LoadRequest } from '../types';
import { mockBackend } from '../services/mockBackend';
import { supabaseService } from '../services/supabaseService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, Truck, DollarSign, Activity, Download, Star, 
  ShieldAlert, Radio, Zap, TrendingUp, AlertTriangle, 
  CheckCircle2, Search, X, ShieldCheck, MessageSquare, 
  Send, CheckCircle, Bell, Megaphone, Database, Wifi, WifiOff,
  Cpu, HardDrive, Globe, RefreshCcw, Code, ExternalLink, Info, DatabaseZap
} from 'lucide-react';

const AdminPortal: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadRequests, setLoadRequests] = useState<LoadRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'flagged'>('all');
  
  const [activeSupportRequest, setActiveSupportRequest] = useState<LoadRequest | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyText, setEmergencyText] = useState('');
  const [emergencySeverity, setEmergencySeverity] = useState<'high' | 'medium' | 'low'>('medium');

  // Database status state
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [realtimeStats, setRealtimeStats] = useState({
    ridesCount: 0,
    ridersCount: 0,
    activeRidersCount: 0,
    passengersCount: 0,
    totalRevenue: 0
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    // Local mock data sync for UI prototype
    setRides(mockBackend.getRides());
    setRiders(mockBackend.getRiders());
    setPassengers(mockBackend.getPassengers());
    setTransactions(mockBackend.getTransactions());
    setLoadRequests(mockBackend.getLoadRequests());

    if (activeSupportRequest) {
      const updated = mockBackend.getLoadRequests().find(r => r.id === activeSupportRequest.id);
      if (updated) setActiveSupportRequest(updated);
    }

    // Try to fetch real stats if DB is online
    if (dbStatus === 'online') {
      try {
        const stats = await supabaseService.getDashboardStats();
        setRealtimeStats(stats);
      } catch (e) {
        console.warn("Failed to fetch real-time stats", e);
      }
    }
  };

  const checkDB = async () => {
    setDbStatus('checking');
    const isOnline = await supabaseService.checkConnection();
    setDbStatus(isOnline ? 'online' : 'offline');
    if (isOnline) fetchData();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    checkDB();
    const dbInterval = setInterval(checkDB, 20000);

    return () => {
      clearInterval(interval);
      clearInterval(dbInterval);
    };
  }, [activeSupportRequest?.id, dbStatus]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSupportRequest?.messages]);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([14.5995, 120.9842], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (!mapRef.current || activeTab !== 'dashboard') return;

    const currentRiderIds = new Set(riders.map(r => r.id));
    Object.keys(riderMarkersRef.current).forEach(id => {
      if (!currentRiderIds.has(id)) {
        riderMarkersRef.current[id].remove();
        delete riderMarkersRef.current[id];
      }
    });

    riders.forEach(rider => {
      const icon = L.divIcon({
        className: 'admin-rider-marker',
        html: `
          <div class="relative group">
            <div class="absolute -inset-1 bg-${rider.isOnline ? 'green' : 'gray'}-500 rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
            <div class="bg-black text-${rider.isOnline ? 'yellow-400' : 'gray-400'} p-1.5 rounded-lg border border-white shadow-xl relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (!riderMarkersRef.current[rider.id]) {
        riderMarkersRef.current[rider.id] = L.marker([rider.currentLocation.latitude, rider.currentLocation.longitude], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`<div class="font-black text-[10px] uppercase tracking-tighter">${rider.name} - ${rider.isOnline ? 'Online' : 'Offline'}</div>`);
      } else {
        riderMarkersRef.current[rider.id].setLatLng([rider.currentLocation.latitude, rider.currentLocation.longitude]);
        riderMarkersRef.current[rider.id].setIcon(icon);
      }
    });
  }, [riders, activeTab]);

  const toggleFlag = (userId: string, type: 'rider' | 'passenger') => {
    mockBackend.toggleFlagUser(userId, type);
    fetchData(); 
  };

  const sendSupportMessage = () => {
    if (!activeSupportRequest || !supportMessage.trim()) return;
    mockBackend.sendLoadChatMessage(activeSupportRequest.id, 'admin', supportMessage);
    setSupportMessage('');
    fetchData();
  };

  const approveRequest = (req: LoadRequest) => {
    mockBackend.approveLoadRequest(req.id);
    setActiveSupportRequest(null);
    fetchData();
  };

  const handleBroadcastEmergency = () => {
    if (!emergencyText.trim()) return;
    mockBackend.sendEmergency(emergencyText, emergencySeverity);
    setEmergencyText('');
    setShowEmergencyModal(false);
  };

  const stats = [
    { label: 'Total Revenue', value: dbStatus === 'online' ? `₱${realtimeStats.totalRevenue.toFixed(0)}` : `₱${transactions.filter(t => t.type === 'admin_fee').reduce((sum, t) => sum + Math.abs(t.amount), 0).toFixed(0)}`, icon: DollarSign, color: 'from-green-500 to-emerald-600', trend: dbStatus === 'online' ? 'LIVE' : 'MOCK' },
    { label: 'Platform Rides', value: dbStatus === 'online' ? realtimeStats.ridesCount : rides.length, icon: Activity, color: 'from-blue-500 to-indigo-600', trend: dbStatus === 'online' ? 'LIVE' : 'MOCK' },
    { label: 'Active Fleet', value: dbStatus === 'online' ? realtimeStats.activeRidersCount : riders.filter(r => r.isOnline).length, icon: Truck, color: 'from-yellow-400 to-orange-500', trend: dbStatus === 'online' ? 'LIVE' : 'MOCK' },
    { label: 'Total Users', value: dbStatus === 'online' ? (realtimeStats.ridersCount + realtimeStats.passengersCount) : (riders.length + passengers.length), icon: Users, color: 'from-purple-500 to-pink-600', trend: dbStatus === 'online' ? 'LIVE' : 'MOCK' },
  ];

  const chartData = [
    { name: 'Mon', rev: 120, rides: 12 },
    { name: 'Tue', rev: 210, rides: 18 },
    { name: 'Wed', rev: 180, rides: 15 },
    { name: 'Thu', rev: 350, rides: 28 },
    { name: 'Fri', rev: 420, rides: 32 },
    { name: 'Sat', rev: 580, rides: 45 },
    { name: 'Sun', rev: 640, rides: 52 },
  ];

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      {/* DB Monitoring Card */}
      <div className={`p-6 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col md:flex-row items-center gap-8 ${
        dbStatus === 'online' ? 'bg-white border-green-100' : 'bg-red-50/50 border-red-100'
      }`}>
         <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg animate-pulse ${
               dbStatus === 'online' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
               {dbStatus === 'online' ? <Wifi size={32} /> : <WifiOff size={32} />}
            </div>
            <div>
               <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">SUPABASE STATUS: {dbStatus.toUpperCase()}</h3>
                  {dbStatus === 'checking' && <RefreshCcw size={16} className="animate-spin text-gray-400" />}
               </div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {dbStatus === 'online' 
                    ? 'All systems nominal. Streaming real-time data from AWS Region.' 
                    : 'Connectivity lost or placeholder keys detected. Operating in Local Mock Mode.'}
               </p>
            </div>
         </div>
         <div className="flex-1 flex justify-end gap-3 w-full md:w-auto">
            <button 
              onClick={checkDB}
              className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
            >
               <RefreshCcw size={14} /> Re-Verify Connection
            </button>
            {dbStatus === 'offline' && (
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                className="bg-yellow-400 text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-100"
              >
                 <ExternalLink size={14} /> Configure Database
              </a>
            )}
         </div>
      </div>

      {dbStatus === 'offline' && (
        <div className="bg-black text-white p-8 rounded-[3rem] shadow-2xl space-y-6 border border-gray-800 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl"></div>
           <div className="flex items-center gap-4 text-yellow-400">
              <DatabaseZap size={24} />
              <h4 className="text-lg font-black italic uppercase tracking-widest">Setup Guide: Fixing "Invalid API Error"</h4>
           </div>
           <p className="text-xs text-gray-400 font-medium">To fix registration errors and sync this dashboard, follow these steps:</p>
           <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Env Variables', desc: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in your deployment environment.' },
                { step: '02', title: 'Execute SQL', desc: 'Copy the content of database.md and run it in the Supabase SQL Editor.' },
                { step: '03', title: 'RLS Policies', desc: 'Ensure Profiles and Rides tables allow INSERT/SELECT. (Check database.md updates)' }
              ].map((step, i) => (
                <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                   <span className="text-2xl font-black italic text-yellow-400/50">{step.step}</span>
                   <h5 className="font-black uppercase tracking-tighter text-sm">{step.title}</h5>
                   <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
           </div>
           <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-yellow-400">
              <Info size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">Prototype continues to work using Browser Local Storage.</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2`}></div>
            <div className="flex justify-between items-start mb-4">
               <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                 <stat.icon size={24} />
               </div>
               <span className={`text-[10px] font-black px-2 py-1 rounded-full ${stat.trend === 'LIVE' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                 {stat.trend}
               </span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black italic text-gray-800 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
           <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative group">
              <div className="absolute top-6 left-6 z-20 pointer-events-none">
                 <div className="bg-black text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md">
                    <Radio size={16} className="text-yellow-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Global Radar</span>
                 </div>
              </div>
              <div className="h-[450px] rounded-[2rem] overflow-hidden">
                 <div id="leaflet-map" ref={mapContainerRef} className="h-full w-full" />
              </div>
           </div>
        </div>

        <div className="bg-black text-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full border border-gray-800">
           <div className="p-6 bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <Zap size={18} className="text-black" />
                 </div>
                 <h3 className="text-sm font-black italic uppercase tracking-widest">Live Ledger</h3>
              </div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide max-h-[400px]">
              {transactions.slice(-8).reverse().map(tx => (
                <div key={tx.id} className="flex gap-4 group animate-fade-in">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors`}>
                    <DollarSign size={16} className="text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-black text-gray-200 uppercase tracking-tighter truncate">{tx.description}</p>
                     <p className="text-[10px] text-gray-500 uppercase font-bold">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-black italic ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                       {tx.amount > 0 ? '+' : ''}₱{Math.abs(tx.amount).toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => {
    let filteredRiders = riders.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    let filteredPass = passengers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (userFilter === 'flagged') {
      filteredRiders = filteredRiders.filter(r => r.isFlagged);
      filteredPass = filteredPass.filter(p => p.isFlagged);
    }

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search name, phone or vehicle..." 
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-bold text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
              <button 
                onClick={() => setUserFilter('all')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${userFilter === 'all' ? 'bg-black text-white shadow-lg scale-105' : 'text-gray-500 hover:text-black'}`}
              >
                All Users
              </button>
              <button 
                onClick={() => setUserFilter('flagged')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${userFilter === 'flagged' ? 'bg-red-500 text-white shadow-lg scale-105' : 'text-gray-500 hover:text-red-600'}`}
              >
                Flagged
              </button>
           </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
           <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2">
                   <Truck size={16} className="text-gray-400" /> Riders
                 </h3>
                 <span className="bg-black text-yellow-400 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">{filteredRiders.length} FOUND</span>
              </div>
              <div className="divide-y divide-gray-50">
                 {filteredRiders.map(rider => (
                   <div key={rider.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                         <img src={`https://picsum.photos/seed/${rider.id}/40/40`} className={`w-10 h-10 rounded-xl transition-all ${rider.isFlagged ? 'border-2 border-red-500 ring-4 ring-red-50 shadow-lg' : 'grayscale hover:grayscale-0'}`} alt="Rider" />
                         <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black uppercase tracking-tight">{rider.name}</p>
                              {rider.isFlagged && <span className="bg-red-100 text-red-600 text-[6px] font-black px-1 rounded border border-red-200 uppercase tracking-widest">FLAGGED</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold">{rider.phone} • {rider.vehicle.plateNumber}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right">
                            <div className="flex items-center gap-0.5 justify-end">
                               <Star size={8} className="text-yellow-500 fill-yellow-500" />
                               <span className="text-[10px] font-black">{rider.rating}</span>
                            </div>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">₱{rider.currentBalance.toFixed(0)} WALLET</p>
                         </div>
                         <button 
                            onClick={() => toggleFlag(rider.id, 'rider')}
                            title={rider.isFlagged ? "Unflag User" : "Flag User"}
                            className={`p-2 rounded-xl transition-all active:scale-90 ${rider.isFlagged ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-red-500 hover:text-white hover:shadow-lg'}`}
                         >
                            <AlertTriangle size={14} />
                         </button>
                      </div>
                   </div>
                 ))}
                 {filteredRiders.length === 0 && <div className="p-10 text-center opacity-20 italic font-bold">No riders found.</div>}
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2">
                   <Users size={16} className="text-gray-400" /> Passengers
                 </h3>
                 <span className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">{filteredPass.length} ACTIVE</span>
              </div>
              <div className="divide-y divide-gray-50">
                 {filteredPass.map(pass => (
                   <div key={pass.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                         <img src={`https://picsum.photos/seed/${pass.id}/40/40`} className={`w-10 h-10 rounded-xl transition-all ${pass.isFlagged ? 'border-2 border-red-500 ring-4 ring-red-50 shadow-lg' : 'grayscale hover:grayscale-0'}`} alt="Pass" />
                         <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black uppercase tracking-tight">{pass.name}</p>
                              {pass.isFlagged && <span className="bg-red-100 text-red-600 text-[6px] font-black px-1 rounded border border-red-200 uppercase tracking-widest">FLAGGED</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold">{pass.phone}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <p className="text-xs font-black italic uppercase tracking-tighter">₱{pass.currentBalance.toFixed(0)}</p>
                         <button 
                            onClick={() => toggleFlag(pass.id, 'passenger')}
                            title={pass.isFlagged ? "Unflag User" : "Flag User"}
                            className={`p-2 rounded-xl transition-all active:scale-90 ${pass.isFlagged ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-red-500 hover:text-white hover:shadow-lg'}`}
                         >
                            <AlertTriangle size={14} />
                         </button>
                      </div>
                   </div>
                 ))}
                 {filteredPass.length === 0 && <div className="p-10 text-center opacity-20 italic font-bold">No passengers found.</div>}
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    return (
      <div className="space-y-8 animate-fade-in relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Revenue Chart */}
           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2">
                <TrendingUp size={24} className="text-green-500" /> Revenue Velocity
              </h3>
              <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                       <defs>
                         <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                       <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                       />
                       <Area type="monotone" dataKey="rev" stroke="#22c55e" strokeWidth={4} fill="url(#colorRev)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Support Queue */}
           <div className="bg-black p-8 rounded-[2.5rem] shadow-2xl text-white overflow-hidden flex flex-col h-full border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-yellow-400 flex items-center gap-3">
                  <Zap size={24} className="text-yellow-400" /> Operational Queue
                </h3>
                <span className="bg-yellow-400 text-black text-[10px] font-black px-3 py-1 rounded-full animate-pulse">
                  {loadRequests.filter(r => r.status === 'pending').length} ACTION REQUIRED
                </span>
              </div>
              
              <div className="space-y-4 overflow-y-auto scrollbar-hide flex-1">
                 {loadRequests.filter(r => r.status === 'pending').length === 0 ? (
                   <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 italic">
                      <CheckCircle2 size={48} className="text-green-400" />
                      <p className="font-bold uppercase tracking-widest text-xs">All load requests cleared.</p>
                   </div>
                 ) : (
                   loadRequests.filter(r => r.status === 'pending').map(req => {
                      const rider = riders.find(r => r.id === req.riderId);
                      return (
                        <div 
                          key={req.id} 
                          onClick={() => setActiveSupportRequest(req)}
                          className={`p-5 bg-white/5 border rounded-3xl cursor-pointer transition-all hover:bg-white/10 group ${
                            activeSupportRequest?.id === req.id ? 'border-yellow-400 bg-white/10 ring-4 ring-yellow-400/20' : 'border-white/10'
                          }`}
                        >
                           <div className="flex justify-between items-start">
                              <div className="flex items-center gap-4">
                                 <img src={`https://picsum.photos/seed/${req.riderId}/40/40`} className="w-10 h-10 rounded-xl border-2 border-white/20" alt="Rider" />
                                 <div>
                                    <p className="text-[10px] font-black uppercase text-yellow-400 tracking-widest">Load Request</p>
                                    <p className="text-sm font-black italic text-white uppercase tracking-tighter">{rider?.name || 'Unknown Rider'}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-xl font-black text-green-400 italic leading-none">₱{req.amount}</p>
                                 <p className="text-[8px] text-gray-500 uppercase font-bold mt-1">Pending approval</p>
                              </div>
                           </div>
                           <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                              <div className="flex items-center gap-1.5">
                                 <MessageSquare size={12} className="text-yellow-400" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-yellow-400 transition-colors">Open Support Chat</span>
                              </div>
                              <p className="text-[8px] text-gray-600 font-bold">{new Date(req.createdAt).toLocaleTimeString()}</p>
                           </div>
                        </div>
                      );
                   })
                 )}
              </div>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
           <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2">
             <Activity size={24} className="text-indigo-500" /> Recent Platform Activity
           </h3>
           <div className="space-y-4">
              {rides.slice(-8).reverse().map(ride => (
                <div key={ride.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-yellow-400 font-black italic shadow-lg">M</div>
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-black uppercase tracking-tight">Mission {ride.id.substring(5, 10)}</p>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              ride.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                            }`}>{ride.status}</span>
                         </div>
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{ride.pickupLocation.placeName} → {ride.destination.placeName}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-black italic text-gray-800 tracking-tighter leading-none">₱{ride.totalFare.toFixed(0)}</p>
                      <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase">{new Date(ride.createdAt).toLocaleDateString()}</p>
                   </div>
                </div>
              ))}
              {rides.length === 0 && <div className="py-20 text-center opacity-30 italic font-bold">No missions recorded.</div>}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
           <div className="flex items-center gap-4">
             <h2 className="text-3xl font-black italic tracking-tighter uppercase text-gray-800">COMMAND CENTER</h2>
           </div>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time Platform Orchestration</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setShowEmergencyModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95"
           >
              <ShieldAlert size={16} /> BROADCAST EMERGENCY
           </button>
           <button className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-gray-900 transition-all active:scale-95">
              <Download size={16} /> DOWNLOAD REPORT
           </button>
        </div>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'reports' && renderReports()}

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-red-600 p-6 flex items-center gap-4 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Emergency Broadcast</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Alert all riders and passengers</p>
              </div>
              <button onClick={() => setShowEmergencyModal(false)} className="ml-auto text-white/60 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Broadcast Message</label>
                 <textarea 
                  value={emergencyText}
                  onChange={(e) => setEmergencyText(e.target.value)}
                  placeholder="e.g. System undergoing emergency maintenance. Please conclude active rides."
                  className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Severity Level</label>
                 <div className="grid grid-cols-3 gap-3">
                    {(['low', 'medium', 'high'] as const).map(sev => (
                      <button 
                        key={sev}
                        onClick={() => setEmergencySeverity(sev)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          emergencySeverity === sev 
                          ? 'bg-black text-white border-black shadow-lg scale-105' 
                          : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button 
                   onClick={handleBroadcastEmergency}
                   className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                 >
                   <Megaphone size={18} /> Send Broadcast
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Chat Overlay */}
      {activeSupportRequest && (
        <div className="fixed bottom-0 right-0 left-0 md:left-64 z-[100] p-4 pointer-events-none">
          <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-black overflow-hidden flex flex-col h-[550px] animate-slide-up pointer-events-auto max-w-4xl mx-auto">
            <div className="bg-black p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center text-black shadow-xl rotate-3">
                   <Users size={28} />
                </div>
                <div>
                   <h3 className="text-lg font-black italic uppercase tracking-widest text-yellow-400">MISSION CONTROL SUPPORT</h3>
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">RIDER: {riders.find(r => r.id === activeSupportRequest.riderId)?.name}</span>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                   </div>
                </div>
              </div>
              <div className="flex gap-3">
                 <button 
                  onClick={() => approveRequest(activeSupportRequest)}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-green-200 transition-all active:scale-95"
                 >
                   <CheckCircle size={18} /> Approve Load
                 </button>
                 <button onClick={() => setActiveSupportRequest(null)} className="bg-white/10 hover:bg-red-500 text-white p-3 rounded-2xl transition-all">
                   <X size={24} />
                 </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50 backdrop-blur-md">
               {activeSupportRequest.messages.length === 0 ? (
                 <div className="py-20 text-center opacity-30 italic">Start the conversation...</div>
               ) : (
                 activeSupportRequest.messages.map(msg => (
                   <div key={msg.id} className={`flex ${msg.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[65%] p-5 rounded-[2rem] shadow-xl text-sm font-bold animate-fade-in ${
                       msg.senderId === 'admin' ? 'bg-black text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                     }`}>
                       {msg.text}
                       <div className={`flex items-center gap-2 mt-3 pt-2 border-t ${msg.senderId === 'admin' ? 'border-white/10' : 'border-gray-50'}`}>
                          <p className={`text-[8px] font-black uppercase tracking-widest ${msg.senderId === 'admin' ? 'text-gray-400' : 'text-gray-400'}`}>
                             {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <CheckCircle2 size={10} className={msg.senderId === 'admin' ? 'text-yellow-400' : 'text-green-500'} />
                       </div>
                     </div>
                   </div>
                 ))
               )}
               <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex gap-4">
               <div className="flex-1 relative">
                 <input 
                   type="text" 
                   value={supportMessage}
                   onChange={(e) => setSupportMessage(e.target.value)}
                   placeholder="Type payment instructions or approval details..."
                   className="w-full bg-gray-100 border border-gray-100 rounded-[2rem] pl-8 pr-16 py-5 font-black text-sm focus:outline-none focus:ring-4 focus:ring-yellow-400/20 transition-all shadow-inner"
                   onKeyPress={(e) => e.key === 'Enter' && sendSupportMessage()}
                 />
                 <button 
                   onClick={sendSupportMessage}
                   className="absolute right-3 top-1/2 -translate-y-1/2 bg-black text-yellow-400 p-3 rounded-full hover:bg-gray-900 transition-all flex items-center justify-center shadow-lg active:scale-90"
                 >
                   <Send size={20} />
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
