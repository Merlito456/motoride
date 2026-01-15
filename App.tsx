
import React, { useState, useEffect } from 'react';
import { UserType, User, Passenger, Rider, EmergencyAlert } from './types';
import { supabaseService } from './services/supabaseService';
import Layout from './components/Layout';
import PassengerPortal from './portals/PassengerPortal';
import RiderPortal from './portals/RiderPortal';
import AdminPortal from './portals/AdminPortal';
import { 
  LogIn, ShieldAlert, X, Megaphone, Zap, ShieldCheck, 
  DollarSign, Clock, ChevronRight, User as UserIcon, 
  UserPlus, ArrowLeft, Bike, Star, Info, CheckCircle,
  MapPin, Heart, FileText, Lock
} from 'lucide-react';

type LandingView = 'landing' | 'login' | 'register' | 'safety' | 'pricing' | 'areas' | 'mission' | 'privacy' | 'terms';

const StaticContentPage = ({ title, icon: Icon, children, onBack }: { title: string, icon: any, children?: React.ReactNode, onBack: () => void }) => (
  <div className="min-h-screen pt-32 pb-20 px-8 bg-white animate-fade-in">
    <div className="max-w-4xl mx-auto space-y-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all"
      >
        <ArrowLeft size={16} /> Back to Home
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

  // Landing Page States
  const [view, setView] = useState<LandingView>('landing');
  const [authRole, setAuthRole] = useState<UserType>('passenger');
  
  // Auth Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Rider-specific Registration
  const [orCrNo, setOrCrNo] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [motorModel, setMotorModel] = useState('');
  const [plateNo, setPlateNo] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    // Initial check for latest emergency
    const fetchAlert = async () => {
        try {
            const alert = await supabaseService.getLatestAlert();
            setCurrentAlert(alert as any);
        } catch (e) {
            console.error("Alert fetch failed", e);
        }
    };
    fetchAlert();

    const alertInterval = setInterval(fetchAlert, 30000);
    setIsInitialized(true);
    return () => clearInterval(alertInterval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        const user = await supabaseService.login(username, password, authRole);
        if (user) {
          setCurrentUser(user);
          setActiveTab(user.userType === 'admin' ? 'dashboard' : 'home');
        } else {
          setError('Invalid username or password.');
        }
    } catch (err: any) {
        setError(err.message || 'An error occurred during login.');
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
        const newUser = await supabaseService.register(registrationData, authRole);
        setCurrentUser(newUser as any);
        setActiveTab('home');
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
        {/* Landing Page Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center justify-between px-8">
           <div 
            onClick={() => setView('landing')}
            className="flex items-center gap-3 cursor-pointer"
           >
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg rotate-3">
                 <span className="text-yellow-400 font-black text-xl italic tracking-tighter">M</span>
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter">MOTORIDE</h1>
           </div>
           <div className="flex items-center gap-6">
              <button 
                onClick={() => { setView('login'); setAuthRole('passenger'); resetForms(); }}
                className="text-xs font-black uppercase tracking-widest text-gray-800 hover:text-yellow-600 transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => { setView('register'); setAuthRole('passenger'); resetForms(); }}
                className="bg-black text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              >
                Register
              </button>
           </div>
        </nav>

        {view === 'landing' && (
          <div className="pt-20">
            {/* Hero Section */}
            <section className="px-8 py-20 md:py-32 flex flex-col items-center text-center space-y-8 bg-gradient-to-b from-yellow-50 to-white">
               <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-yellow-200">
                  <Zap size={14} /> The Future of Transit is Here
               </div>
               <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none max-w-4xl">
                  URBAN MOBILITY <br/> <span className="text-yellow-500 underline decoration-black underline-offset-8">REIMAGINED.</span>
               </h2>
               <p className="text-gray-500 max-w-2xl text-lg font-medium leading-relaxed">
                  Join the Philippines new motorcycle ride-hailing network. Regulated fares, certified pilots, and real-time bidding for maximum efficiency.
               </p>
               <div className="flex flex-col md:flex-row gap-4 w-full max-w-md pt-4">
                  <button 
                    onClick={() => { setView('register'); setAuthRole('passenger'); resetForms(); }}
                    className="flex-1 bg-black text-white px-8 py-5 rounded-2xl font-black italic flex items-center justify-center gap-3 group hover:scale-105 transition-transform shadow-2xl shadow-gray-300"
                  >
                    REGISTER <UserPlus size={20} className="group-hover:rotate-12 transition-transform" />
                  </button>
                  <button 
                    onClick={() => { setView('login'); setAuthRole('passenger'); resetForms(); }}
                    className="flex-1 bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black italic flex items-center justify-center gap-3 group hover:scale-105 transition-transform shadow-2xl shadow-yellow-100"
                  >
                    LOGIN <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
            </section>

            {/* Features Section */}
            <section className="px-8 py-24 max-w-7xl mx-auto space-y-20">
               <div className="text-center space-y-4">
                  <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase">Why Choose Motoride?</h3>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Industry leading safety and efficiency standards</p>
               </div>

               <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { icon: ShieldCheck, title: 'Safe & Verified', desc: 'Every pilot undergoes strict background checks and document verification. Safety gear is mandatory.', color: 'text-green-500' },
                    { icon: DollarSign, title: 'Fair Pricing', desc: 'Government regulated base fares with a transparent bidding system for peak demand.', color: 'text-blue-500' },
                    { icon: Clock, title: 'Zero Wait Time', desc: 'Advanced dispatch algorithms ensure a pilot reaches you in minutes, not hours.', color: 'text-purple-500' },
                    { icon: Star, title: 'Top-Tier Service', desc: 'Our community-rated system ensures only the best pilots stay on the road.', color: 'text-yellow-500' }
                  ].map((feat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-4 hover:border-yellow-200 transition-colors group">
                       <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center ${feat.color} group-hover:scale-110 transition-transform`}>
                          <feat.icon size={28} />
                       </div>
                       <h3 className="text-xl font-black italic uppercase tracking-tighter leading-none">{feat.title}</h3>
                       <p className="text-gray-400 text-sm font-medium leading-relaxed">{feat.desc}</p>
                    </div>
                  ))}
               </div>

               {/* Advantage Card */}
               <div className="bg-black rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center gap-12 shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="flex-1 space-y-6">
                     <h4 className="text-3xl font-black italic tracking-tighter uppercase">The Motoride Advantage</h4>
                     <ul className="space-y-4">
                        {[
                           "Regulated and Transparent Pricing Policy",
                           "Real-time GPS Tracking and Emergency SOS",
                           "Seamless Digital and Cash Payment Options",
                           "Verified Vehicle History and Maintenance Logs"
                        ].map((adv, i) => (
                           <li key={i} className="flex items-center gap-4">
                              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black">
                                 <CheckCircle size={14} />
                              </div>
                              <span className="font-bold text-sm text-gray-300">{adv}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div className="flex-shrink-0 w-64 h-64 bg-yellow-400 rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-3">
                     <Bike size={120} className="text-black" />
                  </div>
               </div>
            </section>
          </div>
        )}

        {/* Static Pages Content */}
        {view === 'safety' && (
          <StaticContentPage title="Safety Protocols" icon={ShieldCheck} onBack={() => setView('landing')}>
            <p>At MotoRide, your safety is our top priority. Our platform is built on a foundation of rigorous safety measures designed to protect both riders and passengers.</p>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 bg-gray-50 p-6 rounded-3xl">
                <h4 className="text-xl font-black italic uppercase tracking-tighter">Pilot Vetting</h4>
                <p className="text-sm">Every pilot undergoes a multi-stage background check, including criminal record clearance, valid driver's license verification, and motorcycle condition assessment.</p>
              </div>
              <div className="space-y-4 bg-gray-50 p-6 rounded-3xl">
                <h4 className="text-xl font-black italic uppercase tracking-tighter">Real-time SOS</h4>
                <p className="text-sm">Our app features a dedicated Emergency SOS button that instantly alerts our 24/7 Command Center and local authorities with your live GPS location.</p>
              </div>
            </div>
          </StaticContentPage>
        )}

        {view === 'pricing' && (
          <StaticContentPage title="Pricing Model" icon={DollarSign} onBack={() => setView('landing')}>
            <p>Transparency is the core of our pricing policy. We adhere to government-regulated base fares while allowing market flexibility through our bidding system.</p>
            <div className="bg-black text-white p-10 rounded-[3rem] space-y-6">
              <h4 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-400">Standard Rate Structure</h4>
              <ul className="space-y-4 font-bold text-gray-400">
                <li className="flex justify-between border-b border-white/10 pb-2"><span>Base Fare</span> <span className="text-white">₱40.00</span></li>
                <li className="flex justify-between border-b border-white/10 pb-2"><span>Per Kilometer Rate</span> <span className="text-white">₱12.00</span></li>
                <li className="flex justify-between border-b border-white/10 pb-2"><span>Wait Time (per min)</span> <span className="text-white">₱2.00</span></li>
                <li className="flex justify-between"><span>Admin Support Fee</span> <span className="text-white">₱5.00</span></li>
              </ul>
            </div>
          </StaticContentPage>
        )}

        {view === 'areas' && (
          <StaticContentPage title="Service Areas" icon={MapPin} onBack={() => setView('landing')}>
            <p>MotoRide is rapidly expanding across the Philippines. Currently, we operate in the following key metropolitan areas:</p>
            <div className="grid md:grid-cols-3 gap-6">
              {['Metro Manila', 'Metro Cebu', 'Metro Davao', 'Pampanga', 'Iloilo City', 'Cagayan de Oro'].map(city => (
                <div key={city} className="bg-yellow-400 p-6 rounded-2xl flex items-center justify-between group cursor-default">
                  <span className="font-black italic uppercase tracking-tighter">{city}</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </StaticContentPage>
        )}

        {view === 'mission' && (
          <StaticContentPage title="Our Mission" icon={Heart} onBack={() => setView('landing')}>
            <p className="text-2xl italic font-black text-black">"To democratize urban transit by providing a safe, regulated, and professional motorcycle hailing ecosystem that empowers riders and serves the community."</p>
            <div className="space-y-8 mt-12">
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-black text-yellow-400 rounded-xl flex-shrink-0 flex items-center justify-center font-black">01</div>
                <div>
                  <h5 className="font-black uppercase tracking-widest text-sm mb-1">Empowerment</h5>
                  <p className="text-sm">We provide our pilots with sustainable earnings, digital literacy, and professional pride.</p>
                </div>
              </div>
            </div>
          </StaticContentPage>
        )}

        {view === 'privacy' && (
          <StaticContentPage title="Privacy Policy" icon={Lock} onBack={() => setView('landing')}>
            <p>Your privacy is important to us. Information is used exclusively for service improvement, emergency response coordination, and regulatory compliance.</p>
          </StaticContentPage>
        )}

        {view === 'terms' && (
          <StaticContentPage title="Terms of Use" icon={FileText} onBack={() => setView('landing')}>
             <p>Users acknowledge that motorcycle transit involves inherent risks. Both riders and passengers must maintain professional behavior.</p>
          </StaticContentPage>
        )}

        {(view === 'login' || view === 'register') && (
          <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 pt-24">
            <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white">
               <div className="bg-black p-8 text-white flex justify-between items-center">
                  <div>
                    <button 
                      onClick={() => setView('landing')}
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white flex items-center gap-2 mb-4"
                    >
                      <ArrowLeft size={14} /> Back to Home
                    </button>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                      {view === 'login' ? 'Welcome Back' : 'Join MotoRide'}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Portal for {authRole}s</p>
                  </div>
                  <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-black shadow-xl rotate-3">
                     <UserIcon size={32} />
                  </div>
               </div>

               <div className="p-8 md:p-12 space-y-8 overflow-y-auto max-h-[70vh]">
                  <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                     {(['passenger', 'rider'] as const).map(role => (
                       <button 
                        key={role}
                        onClick={() => { setAuthRole(role); resetForms(); }}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authRole === role ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                       >
                         {role}
                       </button>
                     ))}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-shake">
                       <ShieldAlert size={16} /> {error}
                    </div>
                  )}

                  <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-6">
                     {view === 'register' && (
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Full Name</label>
                          <input 
                           required 
                           type="text" 
                           className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                           placeholder="Juan Dela Cruz"
                           value={fullName}
                           onChange={(e) => setFullName(e.target.value)}
                          />
                       </div>
                     )}

                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Username</label>
                           <input 
                            required 
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                            placeholder="motoride_fan"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Password</label>
                           <input 
                            required 
                            type="password" 
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                           />
                        </div>
                     </div>

                     {view === 'register' && authRole === 'rider' && (
                        <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                           <input required type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="OR/CR No." value={orCrNo} onChange={(e) => setOrCrNo(e.target.value)} />
                           <input required type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="Driver's License" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
                           <input required type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="Motorcycle Model" value={motorModel} onChange={(e) => setMotorModel(e.target.value)} />
                           <input required type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="Plate No." value={plateNo} onChange={(e) => setPlateNo(e.target.value)} />
                        </div>
                     )}

                     <div className="pt-4 flex flex-col gap-4">
                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full bg-black text-white py-5 rounded-2xl font-black italic tracking-tighter text-xl uppercase shadow-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                           {loading ? <Zap className="animate-spin" /> : (view === 'login' ? <LogIn size={24} /> : <UserPlus size={24} />)}
                           {view === 'login' ? 'Proceed to App' : 'Create Account'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setView(view === 'login' ? 'register' : 'login')}
                          className="w-full text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
                        >
                          {view === 'login' ? "New to MotoRide? Create account" : "Already registered? Login here"}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
          </div>
        )}

        {/* Restore Footer */}
        <footer className="py-20 px-8 border-t border-gray-100">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                       <span className="text-yellow-400 font-black italic">M</span>
                    </div>
                    <h1 className="text-xl font-black italic tracking-tighter">MOTORIDE</h1>
                 </div>
                 <p className="text-gray-400 text-sm max-w-xs font-medium">Urban mobility, regulated fares, and professional service. The gold standard for motorcycle hailing.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Platform</h4>
                    <ul className="text-sm font-bold text-gray-400 space-y-2">
                       <li onClick={() => setView('safety')} className="hover:text-black cursor-pointer">Safety Protocols</li>
                       <li onClick={() => setView('pricing')} className="hover:text-black cursor-pointer">Pricing Model</li>
                       <li onClick={() => setView('areas')} className="hover:text-black cursor-pointer">Service Areas</li>
                    </ul>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Company</h4>
                    <ul className="text-sm font-bold text-gray-400 space-y-2">
                       <li onClick={() => setView('mission')} className="hover:text-black cursor-pointer">Our Mission</li>
                       <li onClick={() => setView('privacy')} className="hover:text-black cursor-pointer">Privacy Policy</li>
                       <li onClick={() => setView('terms')} className="hover:text-black cursor-pointer">Terms of Use</li>
                    </ul>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Admin</h4>
                    <ul className="text-sm font-bold text-gray-400 space-y-2">
                       <li onClick={() => { setAuthRole('admin'); setView('login'); resetForms(); }} className="hover:text-black cursor-pointer">Command Center</li>
                    </ul>
                 </div>
              </div>
           </div>
           <div className="max-w-7xl mx-auto pt-20 border-t border-gray-50 mt-20 text-center">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">© 2024 MotoRide PH. All Rights Reserved.</p>
           </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative">
      {currentAlert && (
        <div className={`fixed top-0 left-0 right-0 z-[1000] p-4 animate-slide-down ${currentAlert.severity === 'high' ? 'bg-red-600' : 'bg-orange-500'} text-white shadow-2xl`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
             <Megaphone size={20} />
             <p className="text-sm font-black italic tracking-tight">{currentAlert.message}</p>
             <button onClick={() => setCurrentAlert(null)} className="ml-auto p-2 bg-white/10 rounded-lg"><X size={16} /></button>
          </div>
        </div>
      )}

      <Layout 
        userType={currentUser.userType} 
        userName={currentUser.name} 
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {currentUser.userType === 'passenger' && <PassengerPortal user={currentUser as Passenger} activeTab={activeTab} />}
        {currentUser.userType === 'rider' && <RiderPortal user={currentUser as Rider} activeTab={activeTab} />}
        {currentUser.userType === 'admin' && <AdminPortal activeTab={activeTab} />}
      </Layout>
    </div>
  );
};

export default App;
