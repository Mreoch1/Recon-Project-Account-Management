import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Building2, ClipboardList, LogOut, Menu, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ContractorDetailPage from './pages/ContractorDetailPage';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import JoinProjectPage from './pages/JoinProjectPage';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check current auth status
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen-dynamic flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen-dynamic bg-gray-50">
        {user && (
          <nav className="bg-white shadow-sm relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link
                    to="/"
                    className="flex items-center px-2 py-2 text-gray-900 hover:text-gray-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Building2 className="h-6 w-6 mr-2" />
                    <span className="font-semibold hidden xs:block">Project Manager</span>
                  </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden sm:flex items-center space-x-4">
                  <Link
                    to="/projects"
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    <ClipboardList className="h-5 w-5 mr-1" />
                    <span>Projects</span>
                  </Link>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="h-5 w-5 mr-1" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center sm:hidden">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900"
                  >
                    {isMobileMenuOpen ? (
                      <X className="h-6 w-6" />
                    ) : (
                      <Menu className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className={`sm:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
              <div className="pt-2 pb-3 space-y-1 bg-white shadow-lg absolute w-full">
                <Link
                  to="/projects"
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <ClipboardList className="h-5 w-5 mr-2" />
                  <span>Projects</span>
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </nav>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route
              path="/"
              element={user ? <Navigate to="/projects" /> : <Navigate to="/auth" />}
            />
            <Route
              path="/auth"
              element={user ? <Navigate to="/projects" /> : <AuthPage />}
            />
            <Route
              path="/reset-password"
              element={user ? <Navigate to="/projects" /> : <ResetPasswordPage />}
            />
            <Route
              path="/join-project"
              element={<JoinProjectPage />}
            />
            <Route
              path="/projects"
              element={user ? <ProjectsPage /> : <Navigate to="/auth" />}
            />
            <Route
              path="/projects/:projectId"
              element={user ? <ProjectDetailPage /> : <Navigate to="/auth" />}
            />
            <Route
              path="/contractors/:contractorId"
              element={user ? <ContractorDetailPage /> : <Navigate to="/auth" />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;