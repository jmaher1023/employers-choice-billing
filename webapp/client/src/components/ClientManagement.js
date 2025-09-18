import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business: '',
    locations: '',
    phone: '',
    address: ''
  });
  
  // Ads management state
  const [ads, setAds] = useState([]);
  const [showAdsSection, setShowAdsSection] = useState(false);
  const [selectedClientForAds, setSelectedClientForAds] = useState(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [adFormData, setAdFormData] = useState({
    ad_title: '',
    city: '',
    state: '',
    job_key: '',
    reference_number: ''
  });

  useEffect(() => {
    fetchClients();
    fetchBusinesses();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses');
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('Failed to load businesses');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.business) {
      toast.error('Name and business are required');
      return;
    }

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowAddModal(false);
        setEditingClient(null);
        setFormData({
          name: '',
          email: '',
          business: '',
          locations: '',
          phone: '',
          address: ''
        });
        fetchClients();
      } else {
        toast.error(data.error || 'Failed to save client');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      business: client.business,
      locations: client.locations || '',
      phone: client.phone || '',
      address: client.address || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchClients();
      } else {
        toast.error(data.error || 'Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      business: '',
      locations: '',
      phone: '',
      address: ''
    });
  };

  // Ads management functions
  const fetchAds = async (clientId) => {
    try {
      const response = await fetch(`/api/ads?client_id=${clientId}`);
      const data = await response.json();
      setAds(data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast.error('Failed to load ads');
    }
  };

  const handleShowAds = (client) => {
    setSelectedClientForAds(client);
    setShowAdsSection(true);
    fetchAds(client.id);
  };

  const handleAdSubmit = async (e) => {
    e.preventDefault();
    
    if (!adFormData.ad_title) {
      toast.error('Ad title is required');
      return;
    }

    try {
      const url = editingAd ? `/api/ads/${editingAd.id}` : '/api/ads';
      const method = editingAd ? 'PUT' : 'POST';
      
      const requestBody = editingAd 
        ? adFormData 
        : { ...adFormData, client_id: selectedClientForAds.id };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowAdModal(false);
        setEditingAd(null);
        setAdFormData({
          ad_title: '',
          city: '',
          state: '',
          job_key: '',
          reference_number: ''
        });
        fetchAds(selectedClientForAds.id);
      } else {
        toast.error(data.error || 'Failed to save ad');
      }
    } catch (error) {
      console.error('Error saving ad:', error);
      toast.error('Failed to save ad');
    }
  };

  const handleEditAd = (ad) => {
    setEditingAd(ad);
    setAdFormData({
      ad_title: ad.ad_title,
      city: ad.city || '',
      state: ad.state || '',
      job_key: ad.job_key || '',
      reference_number: ad.reference_number || ''
    });
    setShowAdModal(true);
  };

  const handleDeleteAd = async (adId) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ads/${adId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchAds(selectedClientForAds.id);
      } else {
        toast.error(data.error || 'Failed to delete ad');
      }
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete ad');
    }
  };

  const resetAdForm = () => {
    setShowAdModal(false);
    setEditingAd(null);
    setAdFormData({
      ad_title: '',
      city: '',
      state: '',
      job_key: '',
      reference_number: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-brand flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </button>
      </div>

      {/* Clients Table */}
      <div className="card-brand">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Clients ({clients.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {businesses.find(b => b.id === client.business)?.name || client.business}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.locations ? (
                      <div className="max-w-xs">
                        {client.locations.split(',').length > 3 ? (
                          <span title={client.locations}>
                            {client.locations.split(',').slice(0, 3).join(', ')}...
                          </span>
                        ) : (
                          client.locations
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleShowAds(client)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Manage Ads"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit Client"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ads Management Section */}
      {showAdsSection && selectedClientForAds && (
        <div className="card-brand">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Ads for {selectedClientForAds.name}
              </h3>
              <span className="text-sm text-gray-500">
                ({ads.length} ads)
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAdModal(true)}
                className="btn-brand flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Ad
              </button>
              <button
                onClick={() => {
                  setShowAdsSection(false);
                  setSelectedClientForAds(null);
                  setAds([]);
                }}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Close
              </button>
            </div>
          </div>
          
          {ads.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>No ads found for this client.</p>
              <p className="text-sm mt-2">Click "Add Ad" to create the first ad.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ad Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ads.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ad.ad_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.city && ad.state ? `${ad.city}, ${ad.state}` : ad.city || ad.state || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.job_key || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditAd(ad)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit Ad"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAd(ad.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Ad"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business *
                </label>
                <select
                  value={formData.business}
                  onChange={(e) => setFormData(prev => ({ ...prev, business: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Business</option>
                  {businesses.map(business => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locations
                </label>
                <input
                  type="text"
                  value={formData.locations}
                  onChange={(e) => setFormData(prev => ({ ...prev, locations: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Huntsville, Birmingham, Mobile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-brand flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingClient ? 'Update Client' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingAd ? 'Edit Ad' : 'Add New Ad'}
            </h3>
            <form onSubmit={handleAdSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Title *
                </label>
                <input
                  type="text"
                  value={adFormData.ad_title}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, ad_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  placeholder="e.g., Software Engineer Position"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={adFormData.city}
                    onChange={(e) => setAdFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Huntsville"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={adFormData.state}
                    onChange={(e) => setAdFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., AL"
                    maxLength="2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Key
                </label>
                <input
                  type="text"
                  value={adFormData.job_key}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, job_key: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., SE-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={adFormData.reference_number}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., REF-12345"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={resetAdForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-brand flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingAd ? 'Update Ad' : 'Add Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
