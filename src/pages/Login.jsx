import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      let emailToLogin = loginId.trim();
      
      // If user inputs ID without @ (e.g. ST-1234), parse it to email
      if (!emailToLogin.includes('@')) {
        emailToLogin = `${emailToLogin.toLowerCase()}@bogcha.uz`;
      }

      await signInWithEmailAndPassword(auth, emailToLogin, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to login. Check your ID and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
        <div className="p-8 text-center bg-primary/5 border-b border-border">
          <div className="h-16 w-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg shadow-primary/30">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Bogcha CRM</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign in with your Email or Student ID</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-lg text-sm mb-6 border border-destructive/30">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Email or Student ID (e.g. 1000)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 uppercase"
                  placeholder="1000 or email"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value.toLowerCase())}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none">
                  Password
                </label>
                <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2 shadow-md"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
