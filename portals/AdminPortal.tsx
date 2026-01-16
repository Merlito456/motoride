
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Ride, Rider, Passenger, Transaction, LoadRequest } from '../types';
import { mockBackend } from '../services/mockBackend';
import { supabaseService, ConnectionStatus } from '../services/supabaseService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, Truck, DollarSign, Activity, Download, Star, 
  ShieldAlert, Radio, Zap, TrendingUp, AlertTriangle, 
  CheckCircle2, Search, X, ShieldCheck, MessageSquare, 
  Send, CheckCircle, Bell, Megaphone, Database, Wifi, WifiOff,
  Globe, RefreshCcw, ExternalLink, DatabaseZap
} from 'lucide-react';

interface AdminPortalProps {
  activeTab: string;
  dbStatus: ConnectionStatus;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ activeTab, dbStatus }) => {
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
    if (dbStatus === 'online') {
      try {
        const [rdr, pas, rds, txs, lrs, stats] = await Promise.all([
          supabaseService.getAllRiders(),
          supabaseService.getAllPassengers(),
          supabaseService.getAllRides(),
          supabaseService.getAllTransactions(),
          supabaseService.getAllLoadRequests(),
          supabaseService.getDashboardStats()
        ]);
        setRiders(rdr);
        setPassengers(pas);
        setRides(rds);
        setTransactions(txs);
        setLoadRequests(lrs);
        setRealtimeStats(stats);
        
        if (activeSupportRequest) {
          const updated = lrs.find(r => r.id === activeSupportRequest.id);
          if (updated) setActiveSupportRequest(updated);
        }
      } catch (e) {
        console.warn("Failed to fetch live admin data", e);
      }
    } else {
      const allRides = mockBackend.getRides();
      const allRiders = mockBackend.getRiders();
      const allPassengers = mockBackend.getPassengers();
      const allTransactions = mockBackend.getTransactions();
      const allLoadRequests = mockBackend.getLoadRequests();

      setRides(allRides);
      setRiders(allRiders);
      setPassengers(allPassengers);
      setTransactions(allTransactions);
      setLoadRequests(allLoadRequests);

      // Local mock stats calculation
      const revenue = allTransactions
        .filter(t => t.type === 'admin_fee')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      setRealtimeStats({
        ridesCount: allRides.length,
        ridersCount: allRiders.length,
        activeRidersCount: allRiders.filter(r => r.isOnline).length,
        passengersCount: allPassengers.length,
        totalRevenue: revenue
      });

      if (activeSupportRequest) {
        const updated = allLoadRequests.find(r => r.id === activeSupportRequest.id);
        if (updated) setActiveSupportRequest(updated);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
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

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 300);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard' && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
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
    if (dbStatus === 'online') {
      supabaseService.sendEmergencyAlert(emergencyText, emergencySeverity);
    }
    mockBackend.sendEmergency(emergencyText, emergencySeverity);
    setEmergencyText('');
    setShowEmergencyModal(false);
  };

  const stats = [
    { label: 'Total Revenue', value: `₱${realtimeStats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'from-green-500 to-emerald-600' },
    { label: 'Platform Rides', value: realtimeStats.ridesCount, icon: Activity, color: 'from-blue-500 to-indigo-600' },
    { label: 'Active Fleet', value: realtimeStats.activeRidersCount, icon: Truck, color: 'from-yellow-400 to-orange-500' },
    { label: 'Total Users', value: (realtimeStats.ridersCount + realtimeStats.passengersCount), icon: Users, color: 'from-purple-500 to-pink-600' },
  ];

  const chartData = [
    { name: 'Mon', rev: 120 }, { name: 'Tue', rev: 210 }, { name: 'Wed', rev: 180 }, { name: 'Thu', rev: 350 }, { name: 'Fri', rev: 420 }, { name: 'Sat', rev: 580 }, { name: 'Sun', rev: 640 },
  ];

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      <div className={`p-6 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex items-center gap-8 ${
        dbStatus === 'online' ? 'bg-white border-green-100' : 'bg-red-50/50 border-red-100'
      }`}>
         <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${dbStatus === 'online' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {dbStatus === 'online' ? <Wifi size={32} /> : <WifiOff size={32} />}
         </div>
         <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">SUPABASE: {dbStatus.toUpperCase()}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dbStatus === 'online' ? 'All systems nominal.' : 'Connectivity restricted. Local cache active.'}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2`}></div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg mb-4`}><stat.icon size={24} /></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black italic text-gray-800 tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
           <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative group">
              <div className="h-[450px] rounded-[2rem] overflow-hidden relative">
                 <div id="admin-radar-map" ref={mapContainerRef} className="h-full w-full absolute inset-0 z-0" />
              </div>
           </div>
        </div>
        <div className="bg-black text-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-gray-800">
           <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3"><Zap size={18} className="text-yellow-400" /><h3 className="text-sm font-black italic uppercase tracking-widest">Live Ledger</h3></div>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[400px]">
              {transactions.slice(-10).reverse().map(tx => (
                <div key={tx.id} className="flex gap-4 group">
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-black text-gray-200 uppercase tracking-tighter truncate">{tx.description}</p>
                     <p className="text-[10px] text-gray-500 uppercase font-bold">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <p className={`text-xs font-black italic ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>₱{Math.abs(tx.amount).toFixed(0)}</p>
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
        <div className="flex gap-4 items-center">
           <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Search users..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
           <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
              <button onClick={() => setUserFilter('all')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${userFilter === 'all' ? 'bg-black text-white' : 'text-gray-500'}`}>All Users</button>
              <button onClick={() => setUserFilter('flagged')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${userFilter === 'flagged' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Flagged</button>
           </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
           <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between"><h3 className="text-sm font-black italic uppercase tracking-widest">Riders</h3><span className="bg-black text-yellow-400 text-[8px] font-black px-2 py-0.5 rounded uppercase">{filteredRiders.length}</span></div>
              <div className="divide-y divide-gray-50">
                 {filteredRiders.map(rider => (
                   <div key={rider.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3"><img src={`https://picsum.photos/seed/${rider.id}/40/40`} className={`w-10 h-10 rounded-xl ${rider.isFlagged ? 'border-2 border-red-500' : ''}`} alt="Rider" /><div><p className="text-xs font-black uppercase tracking-tight">{rider.name}</p><p className="text-[10px] text-gray-400 font-bold">{rider.phone}</p></div></div>
                      <button onClick={() => toggleFlag(rider.id, 'rider')} className={`p-2 rounded-xl ${rider.isFlagged ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}><AlertTriangle size={14} /></button>
                   </div>
                 ))}
              </div>
           </div>
           <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between"><h3 className="text-sm font-black italic uppercase tracking-widest">Passengers</h3><span className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">{filteredPass.length}</span></div>
              <div className="divide-y divide-gray-50">
                 {filteredPass.map(pass => (
                   <div key={pass.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3"><img src={`https://picsum.photos/seed/${pass.id}/40/40`} className={`w-10 h-10 rounded-xl ${pass.isFlagged ? 'border-2 border-red-500' : ''}`} alt="Pass" /><div><p className="text-xs font-black uppercase tracking-tight">{pass.name}</p><p className="text-[10px] text-gray-400 font-bold">{pass.phone}</p></div></div>
                      <button onClick={() => toggleFlag(pass.id, 'passenger')} className={`p-2 rounded-xl ${pass.isFlagged ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}><AlertTriangle size={14} /></button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-8 animate-fade-in relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-2"><TrendingUp size={24} className="text-green-500" /> Revenue Velocity</h3>
              <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                       <XAxis dataKey="name" hide />
                       <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                       <Area type="monotone" dataKey="rev" stroke="#22c55e" strokeWidth={4} fill="#22c55e33" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-black p-8 rounded-[2.5rem] shadow-2xl text-white overflow-hidden flex flex-col h-full border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-yellow-400">Operational Queue</h3>
                <span className="bg-yellow-400 text-black text-[10px] font-black px-3 py-1 rounded-full">{loadRequests.filter(r => r.status === 'pending').length} PENDING</span>
              </div>
              <div className="space-y-4 overflow-y-auto flex-1">
                 {loadRequests.filter(r => r.status === 'pending').map(req => {
                    const rider = riders.find(r => r.id === req.riderId);
                    return (
                      <div key={req.id} onClick={() => setActiveSupportRequest(req)} className={`p-5 bg-white/5 border rounded-3xl cursor-pointer transition-all ${activeSupportRequest?.id === req.id ? 'border-yellow-400' : 'border-white/10'}`}>
                         <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4"><img src={`https://picsum.photos/seed/${req.riderId}/40/40`} className="w-10 h-10 rounded-xl" alt="Rider" /><div><p className="text-[10px] font-black uppercase text-yellow-400">Load Request</p><p className="text-sm font-black italic text-white">{rider?.name || 'Rider'}</p></div></div>
                            <p className="text-xl font-black text-green-400 italic">₱{req.amount}</p>
                         </div>
                      </div>
                    );
                 })}
              </div>
           </div>
        </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-gray-800">COMMAND CENTER</h2>
        <div className="flex gap-2">
           <button onClick={() => setShowEmergencyModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2"><ShieldAlert size={16} /> EMERGENCY</button>
           <button className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2"><Download size={16} /> REPORT</button>
        </div>
      </div>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'reports' && renderReports()}

      {showEmergencyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8">
            <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4 text-red-600">Emergency Broadcast</h3>
            <textarea value={emergencyText} onChange={(e) => setEmergencyText(e.target.value)} placeholder="Message..." className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-sm" />
            <div className="grid grid-cols-3 gap-3 my-4">
                {['low', 'medium', 'high'].map(sev => <button key={sev} onClick={() => setEmergencySeverity(sev as any)} className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 ${emergencySeverity === sev ? 'bg-black text-white border-black' : 'bg-white'}`}>{sev}</button>)}
            </div>
            <button onClick={handleBroadcastEmergency} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs">Send Broadcast</button>
            <button onClick={() => setShowEmergencyModal(false)} className="w-full mt-2 font-black uppercase text-xs text-gray-400">Cancel</button>
          </div>
        </div>
      )}

      {activeSupportRequest && (
        <div className="fixed bottom-0 right-0 left-0 md:left-64 z-[100] p-4 pointer-events-none">
          <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-black overflow-hidden flex flex-col h-[550px] pointer-events-auto max-w-4xl mx-auto">
            <div className="bg-black p-6 flex items-center justify-between text-white">
              <h3 className="text-lg font-black italic uppercase tracking-widest text-yellow-400">SUPPORT CHAT</h3>
              <div className="flex gap-3"><button onClick={() => approveRequest(activeSupportRequest)} className="bg-green-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase">Approve Load</button><button onClick={() => setActiveSupportRequest(null)} className="bg-white/10 p-3 rounded-2xl"><X size={24} /></button></div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50">
               {activeSupportRequest.messages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[65%] p-5 rounded-[2rem] shadow-xl text-sm font-bold ${msg.senderId === 'admin' ? 'bg-black text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>{msg.text}</div></div>
               ))}
               <div ref={chatEndRef} />
            </div>
            <div className="p-4 bg-white border-t flex gap-4">
                 <input type="text" value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Reply..." className="w-full bg-gray-100 border rounded-[2rem] px-8 py-5 font-black text-sm outline-none" onKeyPress={(e) => e.key === 'Enter' && sendSupportMessage()} />
                 <button onClick={sendSupportMessage} className="bg-black text-yellow-400 p-3 rounded-full"><Send size={20} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
