import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Search, 
  Plus,
  CheckSquare,
  Square
} from 'lucide-react';

const CreateCustomInvoice = () => {
  const [business, setBusiness] = useState('');
  const [clientId, setClientId] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableBusinesses, setAvailableBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load businesses on component mount
  useEffect(() => {
    fetchBusinesses();
  }, []);

  // Load clients when business changes
  useEffect(() => {
    if (business) {
      fetchClients();
    } else {
      setAvailableClients([]);
      setClientId('');
    }
  }, [business]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses');
      const data = await response.json();
      setAvailableBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('Failed to load businesses');
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`/api/clients?business=${business}`);
      const data = await response.json();
      setAvailableClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const searchInvoices = async () => {
    if (!business) {
      toast.error('Please select a business');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        business: business,
        ...(clientId && { client_id: clientId }),
        ...(locationFilter && { location_filter: locationFilter })
      });

      const response = await fetch(`/api/invoices/for-custom?${params}`);
      const data = await response.json();
      
      setAvailableInvoices(data.invoices || []);
      setSelectedInvoices([]); // Reset selections
      
      // Extract unique locations from the results
      if (data.invoices && data.invoices.length > 0) {
        const locations = [...new Set(data.invoices.flatMap(inv => inv.locations ? inv.locations.split(',') : []))];
        setAvailableLocations(locations.filter(loc => loc && loc.trim()));
      } else {
        setAvailableLocations([]);
      }
      
      if (data.invoices.length === 0) {
        toast.info('No unpaid invoices found matching your criteria');
      }
    } catch (error) {
      console.error('Error searching invoices:', error);
      toast.error('Failed to search invoices');
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoiceSelection = (invoiceNumber) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceNumber)
        ? prev.filter(num => num !== invoiceNumber)
        : [...prev, invoiceNumber]
    );
  };

  const selectAllInvoices = () => {
    setSelectedInvoices(availableInvoices.map(inv => inv.invoice_number));
  };

  const clearSelection = () => {
    setSelectedInvoices([]);
  };

  const createCustomInvoice = async () => {
    if (!customInvoiceNumber) {
      toast.error('Please enter a custom invoice number');
      return;
    }

    if (selectedInvoices.length === 0) {
      toast.error('Please select at least one invoice');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/invoices/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business: business,
          client_id: clientId,
          location_filter: locationFilter,
          invoice_numbers: selectedInvoices,
          custom_invoice_number: customInvoiceNumber,
          client_name: clientName
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Custom invoice ${customInvoiceNumber} created successfully!`);
        // Reset form
        setCustomInvoiceNumber('');
        setClientName('');
        setSelectedInvoices([]);
        setAvailableInvoices([]);
      } else {
        toast.error(data.error || 'Failed to create custom invoice');
      }
    } catch (error) {
      console.error('Error creating custom invoice:', error);
      toast.error('Failed to create custom invoice');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Create Custom Invoice</h1>
        </div>
      </div>

      {/* Search Criteria */}
      <div className="card-brand p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Criteria</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business *
            </label>
            <select
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Business</option>
              {availableBusinesses.map(businessOption => (
                <option key={businessOption.id} value={businessOption.id}>
                  {businessOption.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!business}
            >
              <option value="">All Clients</option>
              {availableClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location Filter
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {availableLocations.map(location => (
                <option key={location} value={location.trim()}>
                  {location.trim()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={searchInvoices}
            disabled={loading || !business}
            className="btn-brand flex items-center"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Searching...' : 'Search Unpaid Invoices'}
          </button>
        </div>
      </div>

      {/* Available Invoices */}
      {availableInvoices.length > 0 && (
        <div className="card-brand">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Unpaid Invoices ({availableInvoices.length})
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={selectAllInvoices}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locations
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {availableInvoices.map((invoice) => (
                  <tr key={invoice.invoice_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleInvoiceSelection(invoice.invoice_number)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {selectedInvoices.includes(invoice.invoice_number) ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.client_name || 'No Client'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(invoice.grand_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.item_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.locations}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Invoice Details */}
      {selectedInvoices.length > 0 && (
        <div className="card-brand p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Custom Invoice Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Invoice Number *
              </label>
              <input
                type="text"
                value={customInvoiceNumber}
                onChange={(e) => setCustomInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., MCLAIN-HUNTSVILLE-001 (will become MCLAIN-HUNTSVILLE-001-MERGED)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name (optional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Client Name"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              <strong>Selected Invoices:</strong> {selectedInvoices.length} invoices will be combined
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Business: {availableBusinesses.find(b => b.id === business)?.name || business} | 
              {clientId && ` Client: ${availableClients.find(c => c.id === clientId)?.name || 'Selected'} |`}
              {locationFilter && ` Location Filter: ${locationFilter}`}
            </p>
          </div>

          <div className="mt-6">
            <button
              onClick={createCustomInvoice}
              disabled={creating || !customInvoiceNumber}
              className="btn-brand flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              {creating ? 'Creating Invoice...' : 'Create Custom Invoice'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCustomInvoice;
