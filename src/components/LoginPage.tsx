import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LockIcon, EyeIcon, EyeOffIcon, AlertIcon, BadgeIcon } from '@/components/icons/Icons';
import { supabase } from '@/lib/supabase';
const heroImage = 'https://d64gsuwffb70l.cloudfront.net/68e12fc2c4a3a6a769b60461_1765898244738_e941034a.jpg';

const shpdLogo = 'https://d64gsuwffb70l.cloudfront.net/68e12fc2c4a3a6a769b60461_1765897849387_330bdaab.png';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLogin
}) => {
  const {
    login,
    isLoading
  } = useAuth();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [trainingCount, setTrainingCount] = useState<number>(0);

  useEffect(() => {
    // Fetch training count from Supabase
    const fetchTrainingCount = async () => {
      const { count } = await supabase
        .from('training_courses')
        .select('*', { count: 'exact', head: true });
      setTrainingCount(count || 0);
    };
    fetchTrainingCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!badgeNumber.trim()) {
      setError('Badge number is required');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    const success = await login(badgeNumber, password);
    if (success) {
      onLogin();
    } else {
      setError('Invalid badge number or password');
    }
  };

  const demoCredentials = [{
    badge: '1001',
    role: 'Administrator',
    name: 'Capt. Mitchell'
  }, {
    badge: '2045',
    role: 'Supervisor',
    name: 'Sgt. Rodriguez'
  }, {
    badge: '3078',
    role: 'Officer',
    name: 'Off. Chen'
  }, {
    badge: '4092',
    role: 'Accounting',
    name: 'E. Thompson'
  }];

  return (
    <div className="min-h-screen flex" data-mixed-content="true">
      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src={heroImage} alt="Police Training Academy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/70" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={shpdLogo} 
                alt="SHPD Logo" 
                className="w-14 h-14 object-contain"
              />
              <span className="text-2xl font-bold">SHPD Training</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Shaker Heights Police<br />Training Management System
          </h1>
          <p className="text-slate-300 text-lg max-w-md">
            Streamline training requests, track certifications, and manage professional development across your department.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-400">{trainingCount}+</div>
              <div className="text-slate-300 text-sm">Training Courses</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-400">100%</div>
              <div className="text-slate-300 text-sm">Digital Tracking</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img 
              src={shpdLogo} 
              alt="SHPD Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-xl font-bold text-slate-800">SHPD Training</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
              <p className="text-slate-500 mt-2">Sign in with your badge credentials</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertIcon size={18} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Badge Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BadgeIcon className="text-slate-400" size={20} />
                  </div>
                  <input 
                    type="text" 
                    value={badgeNumber} 
                    onChange={e => setBadgeNumber(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors" 
                    placeholder="Enter badge number" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon className="text-slate-400" size={20} />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors" 
                    placeholder="Enter password" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
              </button>
            </form>

            {/* Password Change Notice */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertIcon size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>First-time login:</strong> Please change your password immediately after signing in. Contact your supervisor if you need password assistance.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Authorized personnel only. All access is monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
