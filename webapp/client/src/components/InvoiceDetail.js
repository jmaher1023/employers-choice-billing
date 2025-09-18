import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Mail, 
  DollarSign, 
  Calendar, 
  FileText,
  Plus,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';

const InvoiceDetail = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', notes: '' });
  const [emailData, setEmailData] = useState({ 
    client_email: '', 
    client_name: '', 
    message: '', 
    notes: '',
    invoice_date_from: '',
    invoice_date_to: '',
    custom_notes: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingItemData, setEditingItemData] = useState({});
  const [editingHeader, setEditingHeader] = useState(false);
  const [editingHeaderData, setEditingHeaderData] = useState({});
  const [clients, setClients] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [linkedInvoices, setLinkedInvoices] = useState([]);
  const [parentInvoices, setParentInvoices] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());

  useEffect(() => {
    fetchInvoiceDetails();
    fetchClients();
    fetchBusinesses();
    fetchLinkedInvoices();
    fetchParentInvoices();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${id}`);
      const data = await response.json();
      
      setInvoice(data.invoice);
      setItems(data.items);
      setPayments(data.payments);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses');
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const fetchLinkedInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/links`);
      const data = await response.json();
      setLinkedInvoices(data.linked_invoices || []);
    } catch (error) {
      console.error('Error fetching linked invoices:', error);
    }
  };

  const fetchParentInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/parents`);
      const data = await response.json();
      setParentInvoices(data.parent_invoices || []);
    } catch (error) {
      console.error('Error fetching parent invoices:', error);
    }
  };

  const fetchAvailableInvoices = async () => {
    try {
      const response = await fetch('/api/invoices?limit=100');
      const data = await response.json();
      // Filter out current invoice and already linked invoices
      const currentLinkedIds = linkedInvoices.map(li => li.id);
      const available = data.invoices.filter(inv => 
        inv.id !== id && !currentLinkedIds.includes(inv.id)
      );
      setAvailableInvoices(available);
    } catch (error) {
      console.error('Error fetching available invoices:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || newPayment.amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPayment)
      });

      if (response.ok) {
        toast.success('Payment recorded successfully');
        setNewPayment({ amount: '', notes: '' });
        setShowPaymentModal(false);
        fetchInvoiceDetails(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const openEmailModal = () => {
    // Pre-populate client information if available
    const client = clients.find(c => c.id === invoice?.client_id);
    if (client) {
      setEmailData(prev => ({
        ...prev,
        client_name: client.name
      }));
    }
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!emailData.client_email) {
      toast.error('Please enter client email');
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        toast.success('Invoice sent successfully');
        setEmailData({ 
          client_email: '', 
          client_name: '', 
          message: '', 
          notes: '',
          invoice_date_from: '',
          invoice_date_to: '',
          custom_notes: ''
        });
        setShowEmailModal(false);
        fetchInvoiceDetails(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send invoice');
    }
  };

  const handleDeleteInvoice = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm deletion');
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Invoice deleted successfully');
        // Redirect to invoices list
        window.location.href = '/invoices';
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Handle date strings consistently in Central Time
    const date = new Date(dateString + 'T00:00:00');
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    // Ensure we get the correct date for input fields in Central Time
    const date = new Date(dateString + 'T00:00:00');
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-CA', {
      timeZone: 'America/Chicago'
    });
  };

  // const isCustomInvoice = invoice?.invoice_number?.endsWith('-MERGED');

  const startEditingItem = (item) => {
    setEditingItem(item.id);
    setEditingItemData({
      job_key: item.job_key || '',
      reference_number: item.reference_number || '',
      job_title: item.job_title || '',
      location: item.location || '',
      quantity: item.quantity || '',
      unit: item.unit || '',
      average_cost: item.average_cost || '',
      total: item.total || '',
      original_invoice_date: formatDateForInput(item.original_invoice_date)
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditingItemData({});
  };

  const saveItemEdit = async () => {
    try {
      const response = await fetch(`/api/invoice-items/${editingItem}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingItemData)
      });

      if (response.ok) {
        toast.success('Item updated successfully');
        setEditingItem(null);
        setEditingItemData({});
        fetchInvoiceDetails(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const startEditingHeader = () => {
    setEditingHeader(true);
    setEditingHeaderData({
      invoice_number: invoice?.invoice_number || '',
      invoice_date: formatDateForInput(invoice?.invoice_date),
      client_id: invoice?.client_id || '',
      business: invoice?.business || ''
    });
  };

  const cancelHeaderEdit = () => {
    setEditingHeader(false);
    setEditingHeaderData({});
  };

  const saveHeaderEdit = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingHeaderData)
      });

      if (response.ok) {
        toast.success('Invoice updated successfully');
        setEditingHeader(false);
        setEditingHeaderData({});
        fetchInvoiceDetails(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const handleLinkInvoices = async (childInvoiceIds) => {
    try {
      const response = await fetch(`/api/invoices/${id}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ child_invoice_ids: childInvoiceIds })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        fetchLinkedInvoices();
        setShowLinkModal(false);
      } else {
        toast.error(data.error || 'Failed to link invoices');
      }
    } catch (error) {
      console.error('Error linking invoices:', error);
      toast.error('Failed to link invoices');
    }
  };

  const handleUnlinkInvoices = async (childInvoiceIds) => {
    try {
      const response = await fetch(`/api/invoices/${id}/unlink`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ child_invoice_ids: childInvoiceIds })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        fetchLinkedInvoices();
      } else {
        toast.error(data.error || 'Failed to unlink invoices');
      }
    } catch (error) {
      console.error('Error unlinking invoices:', error);
      toast.error('Failed to unlink invoices');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = invoice ? invoice.grand_total - totalPaid : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice not found</h3>
        <Link to="/invoices" className="text-primary-600 hover:text-primary-700">
          Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/invoices"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Invoices
          </Link>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={openEmailModal}
            className="btn-brand-secondary flex items-center"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Invoice
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn-brand flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Invoice
          </button>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="card-brand p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            {editingHeader ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={editingHeaderData.invoice_number}
                    onChange={(e) => setEditingHeaderData(prev => ({ ...prev, invoice_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={editingHeaderData.invoice_date}
                    onChange={(e) => setEditingHeaderData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business
                  </label>
                  <select
                    value={editingHeaderData.business}
                    onChange={(e) => setEditingHeaderData(prev => ({ ...prev, business: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Business</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <select
                    value={editingHeaderData.client_id}
                    onChange={(e) => setEditingHeaderData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Client</option>
                    {clients
                      .filter(client => !editingHeaderData.business || client.business === editingHeaderData.business)
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={saveHeaderEdit}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelHeaderEdit}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                <div className="flex items-center mt-2 text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(invoice.invoice_date)}
                </div>
                <button
                  onClick={startEditingHeader}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Edit Invoice Details
                </button>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <FileText className="h-4 w-4 mr-2" />
              Business
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {invoice.business_name || invoice.business || 'Not assigned'}
            </span>
          </div>
          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <FileText className="h-4 w-4 mr-2" />
              Client
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {invoice.client_name || 'Not assigned'}
            </span>
          </div>
          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <FileText className="h-4 w-4 mr-2" />
              Status
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-brand p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Subtotal</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(invoice.subtotal)}
              </p>
            </div>
          </div>
        </div>
        <div className="card-brand p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Grand Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(invoice.grand_total)}
              </p>
            </div>
          </div>
        </div>
        <div className="card-brand p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-emerald-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Paid Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Linking */}
      {(linkedInvoices.length > 0 || parentInvoices.length > 0) && (
        <div className="card-brand">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Links</h3>
              <button
                onClick={() => {
                  fetchAvailableInvoices();
                  setShowLinkModal(true);
                }}
                className="btn-brand-secondary text-sm"
              >
                Link Invoices
              </button>
            </div>
          </div>
          <div className="p-6">
            {parentInvoices.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Parent Invoices</h4>
                <div className="space-y-2">
                  {parentInvoices.map((parent) => (
                    <div key={parent.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <Link to={`/invoices/${parent.id}`} className="font-medium text-blue-900 hover:text-blue-700">
                          {parent.invoice_number}
                        </Link>
                        <p className="text-sm text-blue-700">
                          {parent.client_name} • {formatCurrency(parent.grand_total)} • {parent.status}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(parent.status)}`}>
                        {parent.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {linkedInvoices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Linked Child Invoices</h4>
                <div className="space-y-2">
                  {linkedInvoices.map((child) => (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <Link to={`/invoices/${child.id}`} className="font-medium text-green-900 hover:text-green-700">
                          {child.invoice_number}
                        </Link>
                        <p className="text-sm text-green-700">
                          {child.client_name} • {formatCurrency(child.grand_total)} • {child.status}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(child.status)}`}>
                          {child.status}
                        </span>
                        <button
                          onClick={() => handleUnlinkInvoices([child.id])}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Items */}
      <div className="card-brand">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        value={editingItemData.job_title}
                        onChange={(e) => setEditingItemData(prev => ({ ...prev, job_title: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      item.job_title
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        value={editingItemData.location}
                        onChange={(e) => setEditingItemData(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      item.location
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingItem === item.id ? (
                      <input
                        type="date"
                        value={formatDateForInput(editingItemData.original_invoice_date)}
                        onChange={(e) => setEditingItemData(prev => ({ ...prev, original_invoice_date: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      item.original_invoice_date ? formatDate(item.original_invoice_date) : '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        value={editingItemData.quantity}
                        onChange={(e) => setEditingItemData(prev => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        value={editingItemData.unit}
                        onChange={(e) => setEditingItemData(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      item.unit
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingItemData.average_cost}
                        onChange={(e) => setEditingItemData(prev => ({ ...prev, average_cost: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      formatCurrency(item.average_cost)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingItemData.total}
                        onChange={(e) => setEditingItemData(prev => ({ ...prev, total: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      formatCurrency(item.total)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingItem === item.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={saveItemEdit}
                          className="text-green-600 hover:text-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditingItem(item)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments */}
      <div className="card-brand">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
        </div>
        <div className="p-6">
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>
                  {payment.notes && (
                    <p className="text-sm text-gray-600">{payment.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h3>
              <p className="text-gray-500">Add a payment to track this invoice.</p>
            </div>
          )}
          
          {remainingAmount > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Remaining Amount:</strong> {formatCurrency(remainingAmount)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                  placeholder="Payment notes..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                className="btn-brand"
              >
                Add Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Email
                </label>
                <input
                  type="email"
                  value={emailData.client_email}
                  onChange={(e) => setEmailData(prev => ({ ...prev, client_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name (optional)
                </label>
                <input
                  type="text"
                  value={emailData.client_name}
                  onChange={(e) => setEmailData(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Client Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                  placeholder="Personal message to include in the email..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date From (optional)
                </label>
                <input
                  type="date"
                  value={emailData.invoice_date_from}
                  onChange={(e) => setEmailData(prev => ({ ...prev, invoice_date_from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date To (optional)
                </label>
                <input
                  type="date"
                  value={emailData.invoice_date_to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, invoice_date_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Notes (optional)
                </label>
                <textarea
                  value={emailData.custom_notes}
                  onChange={(e) => setEmailData(prev => ({ ...prev, custom_notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                  placeholder="Custom notes to replace the default 'Combined billing from...' text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (optional)
                </label>
                <textarea
                  value={emailData.notes}
                  onChange={(e) => setEmailData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                  placeholder="Additional notes to include in the invoice..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="btn-brand"
              >
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Invoice</h3>
            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete invoice <strong>{invoice?.invoice_number}</strong>? 
                This action cannot be undone and will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                <li>The invoice record</li>
                <li>All invoice items ({items.length} items)</li>
                <li>All payment records ({payments.length} payments)</li>
              </ul>
              <p className="text-red-600 font-medium mb-2">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Type DELETE to confirm"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteInvoice}
                disabled={deleteConfirmation !== 'DELETE'}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  deleteConfirmation === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Invoices Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Link Invoices</h3>
            <p className="text-gray-600 mb-4">
              Select invoices to link as children of <strong>{invoice?.invoice_number}</strong>. 
              When this invoice is marked as paid, all linked invoices will automatically be marked as paid.
            </p>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    id={`invoice-${inv.id}`}
                    className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvoices(prev => new Set([...prev, inv.id]));
                      } else {
                        setSelectedInvoices(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(inv.id);
                          return newSet;
                        });
                      }
                    }}
                  />
                  <label htmlFor={`invoice-${inv.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">{inv.invoice_number}</div>
                    <div className="text-sm text-gray-600">
                      {inv.client_name} • {formatCurrency(inv.grand_total)} • {inv.status}
                    </div>
                  </label>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLinkInvoices(Array.from(selectedInvoices))}
                disabled={selectedInvoices.size === 0}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedInvoices.size > 0
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Link {selectedInvoices.size} Invoice{selectedInvoices.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;
