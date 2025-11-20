
import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Since we cannot use a real backend, we'll simulate the data that would be fetched from Google Sheets.
import { MOCK_USERS } from './data/mockData';

// Import Pages/Components
import QuotationForm from './components/QuotationForm';
import ProductSuggestionForm from './components/ProductSuggestionForm';
import IdeaSuggestionForm from './components/IdeaSuggestionForm';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import TutorialFormularios from './components/TutorialFormularios';
import TutorialDashboard from './components/TutorialDashboard';

// --- Authentication Context ---
interface AuthContextType {
  isAuthenticated: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!sessionStorage.getItem('dashboard_user'));

  const login = async (user: string, pass: string): Promise<boolean> => {
    const SPREADSHEET_ID = '1IkpsIk9sJbHWyVMPn0T-lX9Aq3EVeCzvkwfEQwj9NS0';
    const API_KEY = 'AIzaSyChiZPUY-G3oyZN2NGY_vlgRXUzry9Pkeo';
    const RANGE = 'users';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Failed to fetch users from Google Sheets:", response.statusText);
            return false;
        }
        const data = await response.json();
        const users: string[][] = data.values || [];
        
        // Find a user where column 0 (username) and column 1 (password) match.
        const foundUser = users.find(u => u.length >= 2 && u[0] === user && u[1] === pass);
        
        if (foundUser) {
            sessionStorage.setItem('dashboard_user', user);
            setIsAuthenticated(true);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error during authentication fetch:", error);
        return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('dashboard_user');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


// --- Protected Route Component ---
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};


// --- Main App Component ---
function App() {
  return (
    <AuthProvider>
      <div className="bg-neutral min-h-screen text-gray-800">
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<QuotationForm />} />
            <Route path="/sugestao-produto" element={<ProductSuggestionForm />} />
            <Route path="/sugestao-ideia" element={<IdeaSuggestionForm />} />
            <Route path="/tutorial-formularios" element={<TutorialFormularios />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/dashboard/tutorial" element={<TutorialDashboard />} />

            {/* Redirect any unknown routes to the main form */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
