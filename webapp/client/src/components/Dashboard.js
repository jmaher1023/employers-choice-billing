import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  AlertCircle 
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_invoices: 0,
    pending_invoices: 0,
    paid_invoices: 0,
    total_amount: 0,
    pending_amount: 0,
    paid_amount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats.total_invoices,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Pending Invoices',
      value: stats.pending_invoices,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Paid Invoices',
      value: stats.paid_invoices,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Amount',
      value: formatCurrency(stats.total_amount),
      icon: DollarSign,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Pending Amount',
      value: formatCurrency(stats.pending_amount),
      icon: AlertCircle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    },
    {
      title: 'Paid Amount',
      value: formatCurrency(stats.paid_amount),
      icon: TrendingUp,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your invoice billing system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card-brand p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary-500">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-primary-500">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-brand p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/upload"
              className="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary-500 mr-3" />
              <span className="text-primary-600 font-medium">Upload New Invoices</span>
            </Link>
            <Link
              to="/invoices"
              className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <span className="text-green-700 font-medium">View All Invoices</span>
            </Link>
          </div>
        </div>

        <div className="card-brand p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Paid Amount</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(stats.paid_amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending Amount</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(stats.pending_amount)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${stats.total_amount > 0 ? (stats.paid_amount / stats.total_amount) * 100 : 0}%`
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 text-center">
              {stats.total_amount > 0 
                ? `${((stats.paid_amount / stats.total_amount) * 100).toFixed(1)}% collected`
                : 'No invoices yet'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
