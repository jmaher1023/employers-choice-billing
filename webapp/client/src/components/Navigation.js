import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Upload, BarChart3, Receipt, Plus, Users, Building2 } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/invoices', label: 'Invoices', icon: Receipt },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/create-custom', label: 'Create Custom', icon: Plus },
    { path: '/clients', label: 'Clients', icon: Users },
    { path: '/businesses', label: 'Businesses', icon: Building2 },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-primary-500">The Employers Choice</span>
                <div className="text-sm text-gray-600">Invoice Billing System</div>
              </div>
            </Link>
            
            <div className="flex space-x-6">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === path
                      ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
