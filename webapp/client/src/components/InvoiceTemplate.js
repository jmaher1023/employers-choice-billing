import React from 'react';

const InvoiceTemplate = ({ invoice, items, clientName = "The Clint McLain Agencies" }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const getDateRange = () => {
    if (!items || items.length === 0) return '';
    
    const dates = items.map(item => new Date(item.created_at || invoice.created_at));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return `${formatDate(minDate)} to ${formatDate(maxDate)}`;
  };

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#f6f8fa',
      color: '#222',
      padding: '20px',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '1000px',
        background: '#fff',
        margin: '0 auto',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          textAlign: 'left',
          fontSize: '0.8rem'
        }}>
          <img 
            src="https://storage.googleapis.com/msgsndr/XPERMRtQgB8C0tBynt4n/media/68af58b65ee8e01f49daf830.svg" 
            alt="The Employers Choice Logo"
            style={{
              height: '60px',
              width: 'auto',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              background: '#fff',
              objectFit: 'contain',
              maxWidth: '110px',
              textAlign: 'center'
            }}
          />
          <div style={{
            fontSize: '1.6rem',
            fontWeight: 'bold',
            color: '#9D0035',
            marginTop: '0.5rem'
          }}>
            The Employers Choice
          </div>
          <div style={{ fontSize: '0.55rem', marginTop: '0.5rem' }}>
            <p>
              650 Edgewood Dr. Maumelle, AR 72113<br />
              Phone: (501) 851-4111<br />
              Email: theemployerschoice@yahoo.com<br />
            </p>
          </div>
          <h1 style={{
            fontSize: '1.15rem',
            color: '#444',
            fontWeight: '400',
            margin: '0.25rem 0 0.25rem 0'
          }}>
            Invoice — {clientName}
          </h1>
          <h2 style={{
            fontSize: '0.9rem',
            color: '#444',
            fontWeight: '400',
            margin: '0'
          }}>
            Invoice Date: {getDateRange()}
          </h2>
        </div>

        {/* Invoice Table */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '2rem'
        }}>
          <thead>
            <tr>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'left'
              }}>Reference #</th>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'left'
              }}>Job Title</th>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'left'
              }}>Location</th>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'left'
              }}>Billing Date</th>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}>Qty</th>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}>Unit</th>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}>Avg. Cost</th>
              <th style={{
                padding: '0.4rem 0.6rem',
                borderBottom: '1px solid #e6e6e6',
                background: '#9d003529',
                fontSize: '0.7rem',
                color: '#9D0035',
                textTransform: 'uppercase',
                textAlign: 'center'
              }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} style={{
                backgroundColor: index % 2 === 0 ? '#f9fafb' : 'transparent'
              }}>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'left'
                }}>{item.reference_number}</td>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'left'
                }}>{item.job_title}</td>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'left'
                }}>{item.location}</td>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'left'
                }}>{formatDate(invoice.invoice_date)}</td>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'right'
                }}>{item.quantity}</td>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'center'
                }}>{item.unit}</td>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'right'
                }}>{formatCurrency(item.average_cost)}</td>
                <td style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e6e6e6',
                  fontSize: '0.65rem',
                  textAlign: 'right'
                }}>{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="7" style={{
                padding: '0.4rem 0.6rem',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                textAlign: 'right',
                background: '#f6f8fa',
                borderTop: '2px solid #9D0035'
              }}>Subtotal</td>
              <td style={{
                padding: '0.4rem 0.6rem',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                textAlign: 'right',
                background: '#f6f8fa',
                borderTop: '2px solid #9D0035'
              }}>{formatCurrency(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan="7" style={{
                padding: '0.4rem 0.6rem',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                textAlign: 'right',
                background: '#f6f8fa'
              }}>Billing Fee (10%)</td>
              <td style={{
                padding: '0.4rem 0.6rem',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                textAlign: 'right',
                background: '#f6f8fa'
              }}>{formatCurrency(invoice.grand_total - invoice.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan="7" style={{
                padding: '0.4rem 0.6rem',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                textAlign: 'right',
                background: '#f6f8fa'
              }}>Grand Total</td>
              <td style={{
                padding: '0.4rem 0.6rem',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                textAlign: 'right',
                background: '#f6f8fa'
              }}>{formatCurrency(invoice.grand_total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes */}
        <div style={{
          fontSize: '0.65rem',
          textAlign: 'left',
          border: '1px solid #e6e6e6',
          borderRadius: '5px',
          padding: '1rem',
          marginTop: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '0.8rem',
            color: '#444',
            fontWeight: '600',
            margin: '0 0 0.5rem 0'
          }}>Notes:</h3>
          <p>Combined billing from {getDateRange()}</p>
        </div>

        {/* Footer */}
        <footer style={{
          textAlign: 'left',
          color: '#888',
          fontSize: '0.75rem',
          marginTop: '2rem'
        }}>
          <p>
            Please submit payment via check to the above address.<br />
            Via ACH to Routing No. 082902757 Acct. 501211145<br />
            Via CashApp to $JeanetteHurley
          </p>
        </footer>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
