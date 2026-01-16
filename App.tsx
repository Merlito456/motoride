
import React, { useState, useEffect } from 'react';
import { UserType, User, Passenger, Rider, EmergencyAlert } from './types';
import { supabaseService, ConnectionStatus } from './services/supabaseService';
import { mockBackend } from './services/mockBackend';
import Layout from './components/Layout';
import PassengerPortal from './portals/PassengerPortal';
import RiderPortal from './portals/RiderPortal';
import AdminPortal from './portals/AdminPortal';
import { 
  LogIn, ShieldAlert, X, Megaphone, Zap, ShieldCheck, 
  DollarSign, Clock, ChevronRight, User as UserIcon, 
  UserPlus, ArrowLeft, Bike, Star, Info, CheckCircle,
  MapPin, Heart, FileText, Lock, AlertCircle, Database, HelpCircle, 
  ChevronDown, MousePointer2, Globe
} from 'lucide-react';

type LandingView = 'landing' | 'login' | 'register' | 'safety' | 'pricing' | 'areas' | 'mission' | 'privacy' | 'terms';

const StaticContentPage = ({ title, icon: Icon, children, onBack }: { title: string, icon: any, children?: React.ReactNode, onBack: () => void }) => (
  <div className="min-h-screen pt-32 pb-20 px-8 bg-white animate-fade-in">
    <div className="max-w-4xl mx-auto space-y-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
      </button>
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-black rounded-[2rem] flex items-center justify-center text-yellow-400 shadow-2xl rotate-3">
          <Icon size={40} />
        </div>
        <div>
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">{title}</h2>
          <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">MotoRide Global Documentation</p>
        </div>
      </div>
      <div className="prose prose-lg max-w-none text-gray-600 font-medium leading-relaxed space-y-8">
        {children}
      </div>
    </div>
  </div>
);

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
          
          const performCheck = async () => {
            try {
              const status = await supabaseService.checkConnectionStatus();
              setDbStatus(status);

              const alert = status === 'online' 
                ? await supabaseService.getLatestAlert() 
                : mockBackend.getLatestEmergency();
              if (alert) setCurrentAlert(alert as any);
            } catch (innerE) {
              setDbStatus('prototype');
            }
          };

          await performCheck();
        } catch (globalE) {
          console.error("Global init failure", globalE);
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
          setError('Invalid credentials. Please check your username and password or register a new account.');
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
                  brand: motorModel.split(' ')[0] || 'Unknown',
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
        <div className={`text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 px-8 flex items-center justify-center gap-3 animate-slide-down ${
          dbStatus === 'online' ? 'bg-green-600' : 'bg-black'
        }`}>
           {dbStatus === 'online' ? (
             <><Globe size={14} /> Systems Online: Live Database Sync Active</>
           ) : (
             <><Database size={14} /> Prototype Mode: Local Storage Active</>
           )}
        </div>

        <nav className="fixed top-8 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center justify-between px-8">
           <div onClick={() => setView('landing')} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                 <span className="text-yellow-400 font-black text-xl italic tracking-tighter">M</span>
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter">MOTORIDE</h1>
           </div>
           <div className="flex items-center gap-6">
              <button onClick={() => { setView('login'); resetForms(); }} className="text-xs font-black uppercase tracking-widest text-gray-800 hover:text-yellow-600 transition-colors">Login</button>
              <button onClick={() => { setView('register'); resetForms(); }} className="bg-black text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">Register</button>
           </div>
        </nav>

        {view === 'landing' && (
          <div className="pt-28">
            <section className="px-8 py-20 flex flex-col items-center text-center space-y-8 bg-gradient-to-b from-yellow-50/50 to-white">
               <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-yellow-200">
                  <Zap size={14} /> The Future of Transit
               </div>
               <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none max-w-5xl">
                  URBAN MOBILITY <br/> <span className="text-yellow-500 underline decoration-black underline-offset-8">REIMAGINED.</span>
               </h2>
               <p className="text-gray-500 max-w-2xl text-lg font-medium">Join the Philippines' premier motorcycle hailing network. Safe, regulated, and professional.</p>
               <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
                  <button onClick={() => setView('register')} className="flex-1 bg-black text-white px-8 py-5 rounded-2xl font-black italic flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl">
                    REGISTER <UserPlus size={20} />
                  </button>
                  <button onClick={() => setView('login')} className="flex-1 bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black italic flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl shadow-yellow-100">
                    LOGIN <LogIn size={20} />
                  </button>
               </div>
            </section>

            <section className="px-8 py-24 max-w-7xl mx-auto space-y-20">
               <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { icon: ShieldCheck, title: 'Safe & Verified', desc: 'Strict background checks and mandatory safety gear for all pilots.', color: 'text-green-500' },
                    { icon: DollarSign, title: 'Fair Pricing', desc: 'Regulated base fares with a transparent real-time bidding system.', color: 'text-blue-500' },
                    { icon: Clock, title: 'Zero Wait', desc: 'Advanced dispatch algorithms connect you to the nearest pilot instantly.', color: 'text-purple-500' },
                    { icon: Star, title: 'Top Tier', desc: 'Community-rated pilots ensuring high professional standards every trip.', color: 'text-yellow-500' }
                  ].map((feat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl hover:border-yellow-200 transition-colors group">
                       <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center ${feat.color} group-hover:scale-110 transition-transform mb-4`}><feat.icon size={28} /></div>
                       <h3 className="text-xl font-black italic uppercase tracking-tighter">{feat.title}</h3>
                       <p className="text-gray-400 text-sm font-medium mt-2">{feat.desc}</p>
                    </div>
                  ))}
               </div>
            </section>
          </div>
        )}

        {(view === 'login' || view === 'register') && (
          <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 pt-28">
            <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl border border-white overflow-hidden">
               <div className="bg-black p-8 text-white flex justify-between items-center">
                  <div>
                    <button onClick={() => setView('landing')} className="text-[10px] font-black text-gray-400 hover:text-white flex items-center gap-2 mb-4"><ArrowLeft size={14}/> BACK</button>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">{view === 'login' ? 'Welcome Back' : 'Join MotoRide'}</h2>
                  </div>
                  <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-black rotate-3"><UserIcon size={32} /></div>
               </div>

               <div className="p-12 space-y-8">
                  <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-6">
                     <div className="flex bg-gray-100 p-1 rounded-2xl">
                        {['passenger', 'rider', 'admin'].map(role => (
                          <button key={role} type="button" onClick={() => setAuthRole(role as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${authRole === role ? 'bg-white text-black shadow-md' : 'text-gray-400'}`}>{role}</button>
                        ))}
                     </div>

                     {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2"><ShieldAlert size={16}/> {error}</div>}

                     {view === 'register' && (
                       <>
                         <input required type="text" placeholder="Full Name" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={fullName} onChange={e => setFullName(e.target.value)} />
                         <input required type="tel" placeholder="Phone Number" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={phone} onChange={e => setPhone(e.target.value)} />
                       </>
                     )}

                     <input required type="text" placeholder="Username" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={username} onChange={e => setUsername(e.target.value)} />
                     <input required type="password" placeholder="Password" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={password} onChange={e => setPassword(e.target.value)} />
                     
                     {view === 'register' && authRole === 'rider' && (
                       <div className="space-y-4 p-4 bg-gray-50 rounded-3xl border border-gray-100">
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Vehicle Verification</p>
                         <input required type="text" placeholder="Driver's License No." className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl font-bold text-sm" value={licenseNo} onChange={e => setLicenseNo(e.target.value)} />
                         <input required type="text" placeholder="OR/CR Registration No." className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl font-bold text-sm" value={orCrNo} onChange={e => setOrCrNo(e.target.value)} />
                         <div className="grid grid-cols-2 gap-3">
                            <input required type="text" placeholder="Motor Model" className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl font-bold text-sm" value={motorModel} onChange={e => setMotorModel(e.target.value)} />
                            <input required type="text" placeholder="Plate Number" className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl font-bold text-sm" value={plateNo} onChange={e => setPlateNo(e.target.value)} />
                         </div>
                       </div>
                     )}

                     <button type="submit" disabled={loading} className="w-full bg-black text-white py-5 rounded-2xl font-black italic text-xl uppercase shadow-xl hover:bg-gray-900 transition-all">
                       {loading ? 'Processing...' : view === 'login' ? 'Login' : 'Register'}
                     </button>
                  </form>
               </div>
            </div>
          </div>
        )}
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
