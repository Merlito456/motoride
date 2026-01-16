
import React, { useState, useEffect } from 'react';
import { UserType, User, Passenger, Rider, EmergencyAlert } from './types';
import { supabaseService, ConnectionStatus } from './services/supabaseService';
import { mockBackend } from './services/mockBackend';
import Layout from './components/Layout';
import PassengerPortal from './portals/PassengerPortal';
import RiderPortal from './portals/RiderPortal';
import AdminPortal from './portals/AdminPortal';
// Added TrendingUp to the imports below to fix the "Cannot find name 'TrendingUp'" error on line 202
import { 
  LogIn, ShieldAlert, X, Megaphone, Zap, ShieldCheck, 
  DollarSign, Clock, ChevronRight, User as UserIcon, 
  UserPlus, ArrowLeft, Bike, Star, Info, CheckCircle,
  MapPin, Heart, FileText, Lock, AlertCircle, Database, HelpCircle, 
  ChevronDown, MousePointer2, Globe, LayoutDashboard, Truck, Wallet,
  TrendingUp
} from 'lucide-react';

type LandingView = 'landing' | 'login' | 'register' | 'safety' | 'pricing' | 'areas' | 'mission' | 'privacy' | 'terms';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<EmergencyAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<ConnectionStatus>('checking');

  const [view, setView] = useState<LandingView>('landing');
  const [authRole, setAuthRole] = useState<UserType>('passenger');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [orCrNo, setOrCrNo] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [motorModel, setMotorModel] = useState('');
  const [plateNo, setPlateNo] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
        try {
          mockBackend.initialize();
          const status = await supabaseService.checkConnectionStatus();
          setDbStatus(status);

          const alert = status === 'online' 
            ? await supabaseService.getLatestAlert() 
            : mockBackend.getLatestEmergency();
          if (alert) setCurrentAlert(alert as any);
        } catch (globalE) {
          setDbStatus('prototype');
        } finally {
          setIsInitialized(true);
        }
    };
    initializeApp();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        if (dbStatus === 'online') {
          const user = await supabaseService.login(username, password, authRole);
          if (user) {
            setCurrentUser(user);
            setActiveTab(user.userType === 'admin' ? 'dashboard' : 'home');
            return;
          }
        }

        const mockUser = mockBackend.login(username, password, authRole);
        if (mockUser) {
          setCurrentUser(mockUser);
          setActiveTab(mockUser.userType === 'admin' ? 'dashboard' : 'home');
        } else {
          setError('Invalid credentials. Access restricted to registered accounts.');
        }
    } catch (err: any) {
        setError(err.message || 'Login failed.');
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        let registrationData: any = { name: fullName, username, password, phone };
        if (authRole === 'rider') {
            registrationData = {
                ...registrationData,
                licenseNumber: licenseNo,
                governmentLicenseId: orCrNo, 
                vehicle: {
                  plateNumber: plateNo,
                  model: motorModel,
                  brand: motorModel.split(' ')[0] || 'Generic',
                }
            };
        }

        if (dbStatus === 'online') {
          const newUser = await supabaseService.register(registrationData, authRole);
          setCurrentUser(newUser as any);
          setActiveTab('home');
        } else {
          const newUser = authRole === 'rider' ? mockBackend.registerRider(registrationData) : mockBackend.registerPassenger(registrationData);
          setCurrentUser(newUser);
          setActiveTab('home');
        }
    } catch (err: any) {
        setError(err.message || 'Registration failed.');
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('landing');
    resetForms();
  };

  const resetForms = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setPhone('');
    setOrCrNo('');
    setLicenseNo('');
    setMotorModel('');
    setPlateNo('');
    setError('');
  };

  if (!isInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-yellow-400">
        <Zap className="animate-ping" size={48} />
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-yellow-200">
        {/* Status bar removed for cleaner landing page as requested */}
        
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center justify-between px-8">
           <div onClick={() => setView('landing')} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                 <span className="text-yellow-400 font-black text-xl italic tracking-tighter">M</span>
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter">MOTORIDE</h1>
           </div>
           <div className="flex items-center gap-6">
              <button onClick={() => { setView('login'); resetForms(); }} className="text-xs font-black uppercase tracking-widest text-gray-800 hover:text-yellow-600 transition-colors">Login</button>
              <button onClick={() => { setView('register'); setAuthRole('passenger'); resetForms(); }} className="bg-black text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">Get Started</button>
           </div>
        </nav>

        {view === 'landing' && (
          <div className="pt-20">
            {/* Hero Section */}
            <section className="px-8 py-20 md:py-32 flex flex-col items-center text-center space-y-8 bg-gradient-to-b from-yellow-50/50 to-white relative overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-400/10 rounded-full blur-[120px] -z-10"></div>
               
               <div className="inline-flex items-center gap-2 bg-black text-yellow-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                  <Zap size={14} className="fill-yellow-400" /> MISSION CRITICAL MOBILITY
               </div>
               
               <h2 className="text-6xl md:text-9xl font-black italic tracking-tighter leading-[0.85] max-w-6xl uppercase">
                  THE GOLD STANDARD <br/> <span className="text-yellow-500 underline decoration-black underline-offset-8">FOR TWO WHEELS.</span>
               </h2>
               
               <p className="text-gray-500 max-w-2xl text-lg md:text-xl font-medium leading-relaxed">
                  Philippines' first premium, high-integrity motorcycle network. Regulated fares. Professional pilots. Instant dispatch.
               </p>
               
               <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg pt-4">
                  <button onClick={() => { setView('register'); setAuthRole('passenger'); }} className="flex-1 bg-black text-white px-10 py-6 rounded-3xl font-black italic text-lg flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-black/20 group">
                    RIDE NOW <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => { setView('register'); setAuthRole('rider'); }} className="flex-1 bg-yellow-400 text-black px-10 py-6 rounded-3xl font-black italic text-lg flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-yellow-200 group">
                    BECOME A PILOT <Truck size={22} className="group-hover:rotate-12 transition-transform" />
                  </button>
               </div>

               {/* Stats Row */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 pt-20">
                  {[
                    { label: 'Avg Dispatch', val: '2.4 MIN', icon: Clock },
                    { label: 'Safety Rating', val: '4.9/5.0', icon: ShieldCheck },
                    { label: 'Pilot Growth', val: '+400%', icon: TrendingUp },
                    { label: 'Regulated', val: 'LTFRB+', icon: Lock }
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center">
                       <s.icon size={20} className="text-yellow-500 mb-2" />
                       <p className="text-2xl font-black italic tracking-tighter">{s.val}</p>
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                    </div>
                  ))}
               </div>
            </section>

            {/* Core Pillars */}
            <section className="px-8 py-24 max-w-7xl mx-auto">
               <div className="text-center mb-16 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-600">Infrastructure</h3>
                  <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase">Built for reliability</h2>
               </div>
               
               <div className="grid md:grid-cols-3 gap-8">
                  {[
                    { icon: ShieldCheck, title: 'Extreme Vetting', desc: 'NBI, PNP, and Drug Clearance mandatory for all our pilots. We don\'t compromise on who takes you home.', color: 'bg-green-500' },
                    { icon: DollarSign, title: 'Smart Bidding', desc: 'The first fair bidding system. You and the pilot agree on a price within government regulated limits.', color: 'bg-blue-500' },
                    { icon: LayoutDashboard, title: 'Pilot Command', desc: 'A dedicated OS for riders to manage earnings, top-ups, and active missions with zero downtime.', color: 'bg-purple-500' }
                  ].map((feat, i) => (
                    <div key={i} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl hover:-translate-y-2 transition-all group">
                       <div className={`w-16 h-16 rounded-2xl ${feat.color} text-white flex items-center justify-center mb-6 shadow-xl rotate-3 group-hover:rotate-0 transition-transform`}><feat.icon size={32} /></div>
                       <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-3">{feat.title}</h3>
                       <p className="text-gray-500 text-base font-medium leading-relaxed">{feat.desc}</p>
                    </div>
                  ))}
               </div>
            </section>

            {/* Visual Object Break - Call to Action Area */}
            <section className="px-8 py-20">
               <div className="bg-black rounded-[4rem] p-12 md:p-20 text-white flex flex-col lg:flex-row items-center gap-16 shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400 opacity-10 rounded-full blur-[100px] -z-0"></div>
                  <div className="flex-1 space-y-8 z-10">
                     <h4 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9]">Start earning <br/> on your terms.</h4>
                     <p className="text-gray-400 text-lg max-w-lg font-medium">Join the most professional fleet in the country. We provide the tech, you provide the ride. Weekly payouts, lower commission, and 24/7 pilot support.</p>
                     <button onClick={() => { setView('register'); setAuthRole('rider'); }} className="bg-yellow-400 text-black px-12 py-6 rounded-3xl font-black italic text-xl flex items-center gap-4 hover:bg-white transition-all shadow-2xl">
                        JOIN THE FLEET <Truck size={28} />
                     </button>
                  </div>
                  <div className="flex-shrink-0 w-full lg:w-96 h-96 bg-yellow-400 rounded-[4rem] flex items-center justify-center rotate-6 group-hover:rotate-0 transition-all duration-500 shadow-2xl">
                     <Bike size={240} className="text-black drop-shadow-2xl" />
                  </div>
               </div>
            </section>
          </div>
        )}

        {(view === 'login' || view === 'register') && (
          <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 pt-28">
            <div className="w-full max-w-xl bg-white rounded-[4rem] shadow-2xl border border-white overflow-hidden relative">
               <div className="bg-black p-10 text-white flex justify-between items-center">
                  <div>
                    <button onClick={() => setView('landing')} className="text-[10px] font-black text-gray-400 hover:text-white flex items-center gap-2 mb-4 tracking-widest"><ArrowLeft size={14}/> BACK TO HOME</button>
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase">{view === 'login' ? 'Login' : 'Create Account'}</h2>
                  </div>
                  <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center text-black rotate-6 shadow-xl"><UserIcon size={40} /></div>
               </div>

               <div className="p-12 space-y-8">
                  <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-6">
                     <div className="flex bg-gray-100 p-1.5 rounded-[2rem] border border-gray-200">
                        {/* Registration role selector: only Passenger and Rider */}
                        {(view === 'register' ? ['passenger', 'rider'] : ['passenger', 'rider', 'admin']).map(role => (
                          <button key={role} type="button" onClick={() => setAuthRole(role as any)} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${authRole === role ? 'bg-black text-white shadow-xl' : 'text-gray-400 hover:text-black'}`}>{role}</button>
                        ))}
                     </div>

                     {error && <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-xs font-bold flex items-center gap-3 border border-red-100 animate-shake"><ShieldAlert size={20}/> {error}</div>}

                     {view === 'register' && (
                       <>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Identification</label>
                            <input required type="text" placeholder="Legal Full Name" className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl font-bold focus:bg-white transition-all outline-none focus:ring-4 focus:ring-yellow-400/20" value={fullName} onChange={e => setFullName(e.target.value)} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Contact</label>
                            <input required type="tel" placeholder="Mobile Number" className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl font-bold focus:bg-white transition-all outline-none focus:ring-4 focus:ring-yellow-400/20" value={phone} onChange={e => setPhone(e.target.value)} />
                         </div>
                       </>
                     )}

                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Account Access</label>
                        <input required type="text" placeholder="Username" className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl font-bold focus:bg-white transition-all outline-none focus:ring-4 focus:ring-yellow-400/20" value={username} onChange={e => setUsername(e.target.value)} />
                        <input required type="password" placeholder="Password" className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl font-bold focus:bg-white transition-all outline-none focus:ring-4 focus:ring-yellow-400/20 mt-3" value={password} onChange={e => setPassword(e.target.value)} />
                     </div>
                     
                     {view === 'register' && authRole === 'rider' && (
                       <div className="space-y-4 p-8 bg-yellow-50/50 rounded-[2.5rem] border border-yellow-100 shadow-inner">
                         <p className="text-[10px] font-black uppercase text-yellow-600 tracking-widest ml-2 flex items-center gap-2"><Truck size={14}/> Vehicle Authentication</p>
                         <input required type="text" placeholder="Driver's License ID" className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-sm shadow-sm" value={licenseNo} onChange={e => setLicenseNo(e.target.value)} />
                         <input required type="text" placeholder="OR/CR Document No." className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-sm shadow-sm" value={orCrNo} onChange={e => setOrCrNo(e.target.value)} />
                         <div className="grid grid-cols-2 gap-3">
                            <input required type="text" placeholder="Vehicle Model" className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-sm shadow-sm" value={motorModel} onChange={e => setMotorModel(e.target.value)} />
                            <input required type="text" placeholder="Plate Number" className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-sm shadow-sm" value={plateNo} onChange={e => setPlateNo(e.target.value)} />
                         </div>
                       </div>
                     )}

                     <button type="submit" disabled={loading} className="w-full bg-black text-white py-6 rounded-[2rem] font-black italic text-xl uppercase shadow-2xl shadow-black/30 hover:bg-gray-900 active:scale-95 transition-all mt-4">
                       {loading ? 'Validating...' : view === 'login' ? 'Proceed to Portal' : 'Register Profile'}
                     </button>
                  </form>
               </div>
            </div>
          </div>
        )}

        <footer className="py-24 px-8 border-t border-gray-100 bg-gray-50">
           <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2 space-y-6">
                 <h1 className="text-3xl font-black italic tracking-tighter">MOTORIDE</h1>
                 <p className="text-gray-400 text-lg max-w-sm font-medium">Re-engineering urban transit in the Philippines with uncompromising safety and fairness. Join the movement.</p>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white"><Globe size={20} /></div>
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white"><ShieldCheck size={20} /></div>
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white"><Zap size={20} /></div>
                 </div>
              </div>
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Mission</h4>
                 <ul className="text-sm font-bold text-gray-600 space-y-3">
                    <li className="hover:text-yellow-600 cursor-pointer">Safety Guidelines</li>
                    <li className="hover:text-yellow-600 cursor-pointer">Fare Calculator</li>
                    <li className="hover:text-yellow-600 cursor-pointer">Service Map</li>
                 </ul>
              </div>
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Portal</h4>
                 <ul className="text-sm font-bold text-gray-600 space-y-3">
                    <li onClick={() => { setAuthRole('admin'); setView('login'); }} className="hover:text-black cursor-pointer flex items-center gap-2 font-black italic uppercase tracking-tighter text-xs">
                       <LayoutDashboard size={14}/> Node Access
                    </li>
                 </ul>
              </div>
           </div>
           <div className="max-w-7xl mx-auto pt-16 border-t border-gray-200 mt-16 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
              <p>© 2024 MOTORIDE GLOBAL PH</p>
              <div className="flex gap-8">
                 <span className="cursor-pointer hover:text-black">Privacy</span>
                 <span className="cursor-pointer hover:text-black">Terms</span>
              </div>
           </div>
        </footer>
      </div>
    );
  }

  return (
    <Layout userType={currentUser.userType} userName={currentUser.name} onLogout={handleLogout} activeTab={activeTab} onTabChange={setActiveTab}>
      {currentUser.userType === 'passenger' && <PassengerPortal user={currentUser as Passenger} activeTab={activeTab} dbStatus={dbStatus} />}
      {currentUser.userType === 'rider' && <RiderPortal user={currentUser as Rider} activeTab={activeTab} dbStatus={dbStatus} />}
      {currentUser.userType === 'admin' && <AdminPortal activeTab={activeTab} dbStatus={dbStatus} />}
    </Layout>
  );
};

export default App;
