import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import UploadInvoices from './components/UploadInvoices';
import CreateCustomInvoice from './components/CreateCustomInvoice';
import ClientManagement from './components/ClientManagement';
import BusinessManagement from './components/BusinessManagement';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/upload" element={<UploadInvoices />} />
            <Route path="/create-custom" element={<CreateCustomInvoice />} />
            <Route path="/clients" element={<ClientManagement />} />
            <Route path="/businesses" element={<BusinessManagement />} />
          </Routes>
        </main>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
