import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  DocumentPreview Component
// ═══════════════════════════════════════════════════════════
function DocumentPreview({
  storeSettings,
  customer,
  items,
  docType,
  subtotal,
  discount,
  tax,
  total,
  note,
  signature,
  docNo,
  issueDate,
  dueDate
}) {
  const fdate = d => {
    if (!d) return "";
    return new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const fp = n => Number(n || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const docTypeLabels = {
    "quotation": "ใบเสนอราคา",
    "receipt": "ใบเสร็จรับเงิน",
    "billing": "ใบแจ้งหนี้ / ใบวางบิล",
    "delivery": "ใบส่งสินค้า"
  };
  const docName = docTypeLabels[docType] || "เอกสาร";
  return <div style={{
    width: '794px',
    background: '#fff',
    fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
    fontSize: '14px',
    color: '#1a1a2e',
    padding: '48px',
    boxSizing: 'border-box',
    border: '1px solid #e5e7eb',
    margin: '0 auto',
    minHeight: '1123px',
    position: 'relative'
  }}>
      {/* Header */}
      <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '32px',
      borderBottom: '3px solid #1a2b4a',
      paddingBottom: '24px'
    }}>
        <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center'
      }}>
          {storeSettings?.logo ? <img src={storeSettings.logo} style={{
          width: '60px',
          height: '60px',
          borderRadius: '10px',
          objectFit: 'contain',
          border: '1px solid #e5e7eb'
        }} alt="Shop Logo" /> : <div style={{
          width: '60px',
          height: '60px',
          background: '#1a2b4a',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f7941d',
          fontWeight: 900,
          fontSize: '28px'
        }}>
              {storeSettings?.shop_name ? storeSettings.shop_name.charAt(0).toUpperCase() : 'B'}
            </div>}
          <div>
            <div style={{
            fontWeight: 900,
            fontSize: '22px',
            color: '#1a2b4a'
          }}>{storeSettings?.shop_name || 'Botify Shop'}</div>
            <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '4px'
          }}>{storeSettings?.address || 'ระบบร้านค้าออนไลน์อัจฉริยะ'}</div>
            {storeSettings?.tax_id && <div style={{
            fontSize: '12px',
            color: '#6b7280'
          }}>เลขประจำตัวผู้เสียภาษี: {storeSettings.tax_id}</div>}
          </div>
        </div>
        <div style={{
        textAlign: 'right'
      }}>
          <div style={{
          fontSize: '30px',
          fontWeight: 900,
          color: '#f7941d'
        }}>{docName}</div>
          <div style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#1a2b4a',
          marginTop: '4px'
        }}>{docNo || 'DOC-PREVIEW'}</div>
          <div style={{
          fontSize: '13px',
          color: '#6b7280',
          marginTop: '6px'
        }}>วันที่ออก: {issueDate ? fdate(issueDate) : fdate(Date.now())}</div>
          {dueDate && <div style={{
          fontSize: '13px',
          color: '#e3342f',
          marginTop: '2px',
          fontWeight: 700
        }}>ครบกำหนด: {fdate(dueDate)}</div>}
        </div>
      </div>

      {/* Customer Info */}
      <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '20px',
      marginBottom: '28px'
    }}>
        <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #e5e7eb'
      }}>
          <div style={{
          fontSize: '11px',
          fontWeight: 900,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          marginBottom: '8px'
        }}>ลูกค้า / ผู้รับบริการ</div>
          <div style={{
          fontWeight: 700,
          fontSize: '18px',
          color: '#1a2b4a'
        }}>{customer?.name || '_________________________'}</div>
          <div style={{
          color: '#6b7280',
          fontSize: '13px',
          marginTop: '6px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap'
        }}>
            {customer?.address || 'ที่อยู่ ____________________________________________________'}
          </div>
          <div style={{
          display: 'flex',
          gap: '24px',
          marginTop: '8px'
        }}>
            {customer?.phone && <div style={{
            color: '#6b7280',
            fontSize: '13px'
          }}>โทร: {customer.phone}</div>}
            {customer?.tax_id && <div style={{
            color: '#6b7280',
            fontSize: '13px'
          }}>เลขประจำตัวผู้เสียภาษี: {customer.tax_id}</div>}
          </div>
        </div>
      </div>

      {/* Items */}
      <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '24px'
    }}>
        <thead>
          <tr style={{
          background: '#1a2b4a',
          color: '#fff'
        }}>
            <th style={{
            padding: '12px 14px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 700,
            width: '48px',
            borderRadius: '8px 0 0 0'
          }}>ลำดับ</th>
            <th style={{
            padding: '12px 14px',
            textAlign: 'left',
            fontSize: '13px',
            fontWeight: 700
          }}>รายการสินค้า / บริการ</th>
            <th style={{
            padding: '12px 14px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 700,
            width: '80px'
          }}>จำนวน</th>
            <th style={{
            padding: '12px 14px',
            textAlign: 'right',
            fontSize: '13px',
            fontWeight: 700,
            width: '140px'
          }}>ราคา/หน่วย (บาท)</th>
            <th style={{
            padding: '12px 14px',
            textAlign: 'right',
            fontSize: '13px',
            fontWeight: 700,
            width: '140px',
            borderRadius: '0 8px 0 0'
          }}>รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => <tr key={idx} style={{
          background: idx % 2 === 0 ? '#f9fafb' : '#fff',
          borderBottom: '1px solid #f3f4f6'
        }}>
              <td style={{
            padding: '12px 14px',
            fontSize: '13px',
            color: '#6b7280',
            textAlign: 'center'
          }}>{idx + 1}</td>
              <td style={{
            padding: '12px 14px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#1a1a2e'
          }}>{item.name || '—'}</td>
              <td style={{
            padding: '12px 14px',
            fontSize: '13px',
            textAlign: 'center',
            color: '#4b5563'
          }}>{item.qty}</td>
              <td style={{
            padding: '12px 14px',
            fontSize: '13px',
            textAlign: 'right',
            color: '#4b5563'
          }}>{fp(item.price)}</td>
              <td style={{
            padding: '12px 14px',
            fontSize: '13px',
            textAlign: 'right',
            fontWeight: 700,
            color: '#1a2b4a'
          }}>{fp(item.qty * item.price)}</td>
            </tr>)}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '32px'
    }}>
        <div style={{
        width: '320px'
      }}>
          <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '9px 0',
          borderBottom: '1px solid #e5e7eb',
          color: '#6b7280',
          fontSize: '13px'
        }}>
            <span>ยอดรวมก่อนหักส่วนลด</span>
            <span style={{
            fontWeight: 600
          }}>{fp(subtotal)} บาท</span>
          </div>
          {Number(discount) > 0 && <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '9px 0',
          borderBottom: '1px solid #e5e7eb',
          color: '#ef4444',
          fontSize: '13px'
        }}>
               <span>ส่วนลด</span>
               <span style={{
            fontWeight: 600
          }}>- {fp(discount)} บาท</span>
             </div>}
          {Number(tax) > 0 && <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '9px 0',
          borderBottom: '1px solid #e5e7eb',
          color: '#6b7280',
          fontSize: '13px'
        }}>
              <span>ภาษีมูลค่าเพิ่ม</span>
              <span style={{
            fontWeight: 600
          }}>{fp(tax)} บาท</span>
            </div>}
          <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          background: '#1a2b4a',
          borderRadius: '10px',
          marginTop: '10px',
          color: '#fff'
        }}>
            <span style={{
            fontWeight: 900,
            fontSize: '16px'
          }}>ยอดรวมทั้งสิ้น</span>
            <span style={{
            fontWeight: 900,
            fontSize: '22px',
            color: '#f7941d'
          }}>{fp(total)} บาท</span>
          </div>
        </div>
      </div>

      {/* Note */}
      {note && <div style={{
      borderTop: '2px solid #f3f4f6',
      paddingTop: '22px',
      marginBottom: '40px'
    }}>
          <div style={{
        fontSize: '12px',
        fontWeight: 900,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '8px'
      }}>หมายเหตุ / เงื่อนไข</div>
          <div style={{
        fontSize: '13px',
        color: '#4b5563',
        lineHeight: '1.7',
        whiteSpace: 'pre-line'
      }}>{note}</div>
        </div>}
      
      {/* Signatures */}
      <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '60px',
      position: 'absolute',
      bottom: '48px',
      left: '48px',
      right: '48px'
    }}>
        <div style={{
        textAlign: 'center'
      }}>
          <div style={{
          height: '80px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
            {/* Customer Signature Space */}
          </div>
          <div style={{
          borderTop: '1px solid #9ca3af',
          paddingTop: '12px'
        }}>
            <div style={{
            fontSize: '13px',
            color: '#4b5563',
            fontWeight: 600
          }}>ลายเซ็นผู้รับเอกสาร / ลูกค้า</div>
            <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '6px'
          }}>วันที่: ______/______/______</div>
          </div>
        </div>
        <div style={{
        textAlign: 'center'
      }}>
          <div style={{
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyItems: 'center',
          justifyContent: 'center'
        }}>
            {signature ? <img src={signature} style={{
            maxHeight: '70px',
            maxWidth: '200px',
            objectFit: 'contain'
          }} alt="Signature" /> : null}
          </div>
          <div style={{
          borderTop: '1px solid #9ca3af',
          paddingTop: '12px'
        }}>
            <div style={{
            fontSize: '13px',
            color: '#4b5563',
            fontWeight: 600
          }}>ลายเซ็นผู้ออกเอกสาร / ผู้มีอำนาจ</div>
            <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '6px'
          }}>{storeSettings?.shop_name || 'Botify Shop'}</div>
          </div>
        </div>
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  DocumentsPage Component
// ═══════════════════════════════════════════════════════════
