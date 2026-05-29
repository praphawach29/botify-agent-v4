// ═══════════════════════════════════════════════════════════
//  DocumentPreview Component
// ═══════════════════════════════════════════════════════════
function DocumentPreview({ storeSettings, customer, items, docType, subtotal, discount, tax, total, note, signature, docNo, issueDate, dueDate }) {
  const fdate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const fp = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const docTypeLabels = {
    "quotation": "ใบเสนอราคา",
    "receipt": "ใบเสร็จรับเงิน",
    "billing": "ใบแจ้งหนี้ / ใบวางบิล",
    "delivery": "ใบส่งสินค้า"
  };

  const docName = docTypeLabels[docType] || "เอกสาร";
  
  return (
    <div style={{
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '3px solid #1a2b4a', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: '#1a2b4a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f7941d', fontWeight: 900, fontSize: '28px' }}>
            {storeSettings?.shop_name ? storeSettings.shop_name.charAt(0).toUpperCase() : 'B'}
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '22px', color: '#1a2b4a' }}>{storeSettings?.shop_name || 'Botify Shop'}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{storeSettings?.address || 'ระบบร้านค้าออนไลน์อัจฉริยะ'}</div>
            {storeSettings?.tax_id && <div style={{ fontSize: '12px', color: '#6b7280' }}>เลขประจำตัวผู้เสียภาษี: {storeSettings.tax_id}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#f7941d' }}>{docName}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2b4a', marginTop: '4px' }}>{docNo || 'DOC-PREVIEW'}</div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>วันที่ออก: {issueDate ? fdate(issueDate) : fdate(Date.now())}</div>
          {dueDate && <div style={{ fontSize: '13px', color: '#e3342f', marginTop: '2px', fontWeight: 700 }}>ครบกำหนด: {fdate(dueDate)}</div>}
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>ลูกค้า / ผู้รับบริการ</div>
          <div style={{ fontWeight: 700, fontSize: '18px', color: '#1a2b4a' }}>{customer?.name || '_________________________'}</div>
          <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
            {customer?.address || 'ที่อยู่ ____________________________________________________'}
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
            {customer?.phone && <div style={{ color: '#6b7280', fontSize: '13px' }}>โทร: {customer.phone}</div>}
            {customer?.tax_id && <div style={{ color: '#6b7280', fontSize: '13px' }}>เลขประจำตัวผู้เสียภาษี: {customer.tax_id}</div>}
          </div>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: '#1a2b4a', color: '#fff' }}>
            <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '13px', fontWeight: 700, width: '48px', borderRadius: '8px 0 0 0' }}>ลำดับ</th>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '13px', fontWeight: 700 }}>รายการสินค้า / บริการ</th>
            <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '13px', fontWeight: 700, width: '80px' }}>จำนวน</th>
            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', fontWeight: 700, width: '140px' }}>ราคา/หน่วย (บาท)</th>
            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', fontWeight: 700, width: '140px', borderRadius: '0 8px 0 0' }}>รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{item.name || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'center', color: '#4b5563' }}>{item.qty}</td>
              <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'right', color: '#4b5563' }}>{fp(item.price)}</td>
              <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: '#1a2b4a' }}>{fp(item.qty * item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
        <div style={{ width: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px' }}>
            <span>ยอดรวมก่อนหักส่วนลด</span>
            <span style={{ fontWeight: 600 }}>{fp(subtotal)} บาท</span>
          </div>
          {Number(discount) > 0 && (
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e5e7eb', color: '#ef4444', fontSize: '13px' }}>
               <span>ส่วนลด</span>
               <span style={{ fontWeight: 600 }}>- {fp(discount)} บาท</span>
             </div>
          )}
          {Number(tax) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '13px' }}>
              <span>ภาษีมูลค่าเพิ่ม</span>
              <span style={{ fontWeight: 600 }}>{fp(tax)} บาท</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#1a2b4a', borderRadius: '10px', marginTop: '10px', color: '#fff' }}>
            <span style={{ fontWeight: 900, fontSize: '16px' }}>ยอดรวมทั้งสิ้น</span>
            <span style={{ fontWeight: 900, fontSize: '22px', color: '#f7941d' }}>{fp(total)} บาท</span>
          </div>
        </div>
      </div>

      {/* Note */}
      {note && (
        <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: '22px', marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>หมายเหตุ / เงื่อนไข</div>
          <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{note}</div>
        </div>
      )}
      
      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', position: 'absolute', bottom: '48px', left: '48px', right: '48px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {/* Customer Signature Space */}
          </div>
          <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '12px' }}>
            <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>ลายเซ็นผู้รับเอกสาร / ลูกค้า</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>วันที่: ______/______/______</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
            {signature ? (
              <img src={signature} style={{ maxHeight: '70px', maxWidth: '200px', objectFit: 'contain' }} alt="Signature" />
            ) : null}
          </div>
          <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '12px' }}>
            <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>ลายเซ็นผู้ออกเอกสาร / ผู้มีอำนาจ</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{storeSettings?.shop_name || 'Botify Shop'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  DocumentsPage Component
// ═══════════════════════════════════════════════════════════
function DocumentsPage({ toast }) {
  const [tab, setTab] = React.useState("create"); // history, create
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [storeSettings, setStoreSettings] = React.useState({});

  // Form State
  const [previewScale, setPreviewScale] = React.useState(0.6);
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 500) setPreviewScale(0.42);
      else if (window.innerWidth < 768) setPreviewScale(0.5);
      else if (window.innerWidth < 1024) setPreviewScale(0.7);
      else setPreviewScale(0.6);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fdateTH = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear() + 543}`;
  };
  const [issueDateFocused, setIssueDateFocused] = React.useState(false);
  const [dueDateFocused, setDueDateFocused] = React.useState(false);

  const generateDocNo = (prefix) => {
    const d = new Date();
    return `${prefix}${d.getFullYear().toString().slice(-2)}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
  };

  const getPrefix = (type) => {
    return { quotation: "QT", receipt: "RC", billing: "IV", delivery: "DL" }[type] || "DOC";
  };

  const [form, setForm] = React.useState({ 
    doc_type: "quotation", 
    doc_no: generateDocNo("QT"),
    issue_date: new Date().toISOString().split('T')[0],
    due_date: "",
    customer_id: "", 
    note: "ขอบคุณที่ไว้วางใจเลือกใช้บริการของเรา\nราคาดังกล่าวยังไม่รวมค่าจัดส่ง", 
    discount: 0, 
    taxRate: 0,
    signature: null
  });
  const [items, setItems] = React.useState([{ id: Date.now().toString(), name: "", price: 0, qty: 1 }]);
  const [customers, setCustomers] = React.useState([]);
  const [products, setProducts] = React.useState([]);

  // Search State
  const [customerSearchQuery, setCustomerSearchQuery] = React.useState("");
  const [showCustomerSearch, setShowCustomerSearch] = React.useState(false);
  const [activeItemSearchId, setActiveItemSearchId] = React.useState(null);
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const fileInputRef = React.useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: "Bearer " + localStorage.getItem("botify_token") };
      const [resDocs, resCust, resProd, resSet] = await Promise.all([
        fetch("/api/documents", { headers }),
        fetch("/api/customers", { headers }),
        fetch("/api/products", { headers }),
        fetch("/api/settings", { headers })
      ]);
      if(resDocs.ok) { const d = await resDocs.json(); setDocs(d.documents || []); }
      if(resCust.ok) { const d = await resCust.json(); setCustomers(d.customers || []); }
      if(resProd.ok) { const d = await resProd.json(); setProducts(d.products || []); }
      if(resSet.ok) { const d = await resSet.json(); setStoreSettings(d.settings || {}); }
    } catch(e){}
    setLoading(false);
  };

  React.useEffect(() => { loadData(); }, []);

  const handleDocTypeChange = (e) => {
    const type = e.target.value;
    setForm({ 
      ...form, 
      doc_type: type, 
      doc_no: generateDocNo(getPrefix(type)) 
    });
  };

  const calcTotals = () => {
    const subtotal = items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.qty || 0)), 0);
    const afterDiscount = Math.max(0, subtotal - Number(form.discount || 0));
    const tax = (afterDiscount * Number(form.taxRate || 0)) / 100;
    const total = afterDiscount + tax;
    return { subtotal, afterDiscount, tax, total };
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm({ ...form, signature: ev.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("print-area").innerHTML;
    const printWindow = window.open('', '', 'width=900,height=900');
    printWindow.document.write(`
      <html>
        <head>
          <title>${form.doc_no} - ${storeSettings.shop_name || 'Document'}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;900&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { 
              margin: 0; 
              padding: 0;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background: #fff;
            }
            .print-container {
              width: 100%;
              transform: none !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveDoc = async (sendMethod) => {
    if (!form.customer_id) return toast("กรุณาเลือกลูกค้า", "error");
    if (items.some(i => !i.name)) return toast("กรุณาระบุชื่อสินค้าให้ครบ", "error");

    setSaving(true);
    const cus = customers.find(c => c.id === form.customer_id);
    const { subtotal, tax, total } = calcTotals();
    const payload = {
      doc_type: form.doc_type,
      doc_no: form.doc_no,
      customer_id: cus.id,
      customer_info: cus,
      items: items.map(it => ({ name: it.name, price: Number(it.price), qty: Number(it.qty) })),
      subtotal, discount: Number(form.discount), tax_rate: Number(form.taxRate), tax, total,
      note: form.note,
      status: sendMethod ? "sent" : "draft"
    };

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("botify_token") },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      
      toast(sendMethod ? "บันทึกและส่งเอกสารสำเร็จ" : "บันทึกเอกสารเรียบร้อย", "success");
      
      if (sendMethod === 'line') {
         await sendDocToMethod(data.id, 'line', cus);
      } else if (sendMethod === 'email') {
         toast("ระบบส่งอีเมลกำลังอยู่ในช่วงพัฒนา", "success");
      }
      
      loadData();
    } catch (e) {
      toast(e.message, "error");
    }
    setSaving(false);
  };

  const sendDocToMethod = async (docId, method, cusInfo) => {
    try {
      const res = await fetch(`/api/documents/${docId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("botify_token") },
        body: JSON.stringify({ method, customer: cusInfo })
      });
      if (!res.ok) throw new Error("ส่งไม่สำเร็จ");
      toast(`ส่งเอกสารทาง ${method.toUpperCase()} สำเร็จ`, "success");
    } catch(e) { toast(e.message, "error"); }
  };

  // derived state
  const selectedCustomer = customers.find(c => c.id === form.customer_id);
  const totals = calcTotals();

  // Search logic
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(customerSearchQuery))
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col">

      {/* ── Top Bar ── */}
      <div className="flex flex-col gap-2.5 mb-4 px-4 pt-4 md:px-6 md:pt-6">

        {/* Row 1: Title */}
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-base md:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">เอกสารการขาย</h1>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5 hidden sm:block">สร้างและส่งใบเสนอราคา ใบเสร็จให้ลูกค้าอย่างมืออาชีพ</p>
          </div>
        </div>

        {/* Row 2: Action buttons — only when on 'create' tab, full width equal */}
        {tab === 'create' && (
          <div className="grid grid-cols-4 gap-2">
            <button disabled={saving} onClick={() => handleSaveDoc(null)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all active:scale-95">
              <Icon d={Icons.save} size={16} />
              <span className="text-[9px] font-bold leading-none">บันทึก</span>
            </button>
            <button onClick={handlePrint}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition-all active:scale-95">
              <Icon d={Icons.fileText} size={16} />
              <span className="text-[9px] font-bold leading-none">PDF</span>
            </button>
            <button disabled={saving} onClick={() => handleSaveDoc('email')}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all active:scale-95">
              <Icon d={Icons.send} size={16} />
              <span className="text-[9px] font-bold leading-none">อีเมล</span>
            </button>
            <button disabled={saving} onClick={() => handleSaveDoc('line')}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-[#06C755] hover:bg-[#05a847] text-white rounded-xl shadow-sm transition-all active:scale-95">
              <Icon d={Icons.chat} size={16} />
              <span className="text-[9px] font-bold leading-none">LINE</span>
            </button>
          </div>
        )}

        {/* Row 3: Tabs — full width equal */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setTab('create')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
              tab === 'create'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            <Icon d={Icons.plus} size={13} />
            สร้างเอกสาร
          </button>
          <button onClick={() => setTab('history')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
              tab === 'history'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            <Icon d={Icons.fileText} size={13} />
            ประวัติเอกสาร
            {docs.length > 0 && <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1">{docs.length}</span>}
          </button>
        </div>
      </div>

      {tab === "history" && (
        <div className="px-4 md:px-6 pb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
             <div className="p-10 text-center text-gray-400">กำลังโหลด...</div>
          ) : docs.length === 0 ? (
             <div className="p-10 text-center text-gray-400 font-bold">ยังไม่มีเอกสาร</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-4 font-bold">วันที่</th>
                    <th className="p-4 font-bold">เลขที่เอกสาร</th>
                    <th className="p-4 font-bold">ประเภท</th>
                    <th className="p-4 font-bold">ลูกค้า</th>
                    <th className="p-4 font-bold text-right">ยอดรวม</th>
                    <th className="p-4 font-bold text-center">สถานะ</th>
                    <th className="p-4 font-bold text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {docs.map(d => {
                    const typeName = { "quotation": "ใบเสนอราคา", "receipt": "ใบเสร็จรับเงิน", "billing": "ใบวางบิล", "delivery": "ใบส่งของ" }[d.doc_type] || "เอกสาร";
                    return (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-500">{new Date(d.created_at).toLocaleDateString('th-TH')}</td>
                      <td className="p-4 font-bold text-slate-900">{d.doc_no}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600">{typeName}</span></td>
                      <td className="p-4 font-medium text-slate-900">{d.customers?.name || d.customer_info?.name || "-"}</td>
                      <td className="p-4 text-right font-black text-orange-500">฿{Number(d.total).toLocaleString('th-TH')}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${d.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {d.status === 'sent' ? 'ส่งแล้ว' : 'ฉบับร่าง'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <a href={`/doc/${d.id}`} target="_blank" className="btn-secondary px-3 py-1.5 text-xs text-slate-900 bg-gray-100 hover:bg-gray-200 rounded-lg no-underline font-bold transition-colors">ดูเอกสาร</a>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      )}

      {tab === "create" && (
        <div className="px-4 md:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: FORM (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Document Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
               <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 rounded-t-2xl">
                 <h2 className="text-sm font-bold text-gray-700">ข้อมูลเอกสาร</h2>
               </div>
               <div className="p-5">
                 <div className="mb-4">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ประเภทเอกสาร</label>
                   <div className="relative">
                     <select 
                       className="w-full appearance-none px-4 py-3 bg-white rounded-xl text-sm border-2 border-orange-500/30 focus:border-orange-500 focus:outline-none font-bold text-slate-900 shadow-sm cursor-pointer"
                       value={form.doc_type} 
                       onChange={handleDocTypeChange}
                     >
                       <option value="quotation">ใบเสนอราคา (Quotation)</option>
                       <option value="billing">ใบวางบิล / ใบแจ้งหนี้ (Invoice)</option>
                       <option value="receipt">ใบเสร็จรับเงิน (Receipt)</option>
                       <option value="delivery">ใบส่งของ (Delivery Order)</option>
                     </select>
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                     </div>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">เลขที่เอกสาร</label>
                     <input type="text" className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none" value={form.doc_no} onChange={e => setForm({...form, doc_no: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">วันที่ออก</label>
                     <input type={issueDateFocused ? "date" : "text"} onFocus={() => setIssueDateFocused(true)} onBlur={() => setIssueDateFocused(false)} className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-orange-500" value={issueDateFocused ? form.issue_date : fdateTH(form.issue_date)} onChange={e => setForm({...form, issue_date: e.target.value})} placeholder="วว/ดด/ปปปป" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">ครบกำหนด</label>
                     <input type={dueDateFocused ? "date" : "text"} onFocus={() => setDueDateFocused(true)} onBlur={() => setDueDateFocused(false)} className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-orange-500" value={dueDateFocused ? form.due_date : fdateTH(form.due_date)} onChange={e => setForm({...form, due_date: e.target.value})} placeholder="วว/ดด/ปปปป" />
                   </div>
                 </div>
               </div>
            </div>

            {/* 2. Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
               <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
                 <h2 className="text-sm font-bold text-gray-700">ข้อมูลลูกค้า</h2>
                 <button onClick={() => { setShowCustomerSearch(!showCustomerSearch); setCustomerSearchQuery(""); }} className="text-xs text-orange-500 font-bold hover:underline">
                   ค้นหาลูกค้า
                 </button>
               </div>
               <div className="p-5">
                 <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowCustomerSearch(!showCustomerSearch); setCustomerSearchQuery(""); }}
                      className="w-full text-left px-4 py-3 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 flex justify-between items-center shadow-sm"
                    >
                      <span className={selectedCustomer ? "text-slate-900 font-bold text-base" : "text-gray-400"}>
                        {selectedCustomer ? (
                          <div className="flex flex-col">
                            <span>{selectedCustomer.name}</span>
                            {selectedCustomer.phone && <span className="text-xs text-gray-500 font-normal mt-0.5">{selectedCustomer.phone}</span>}
                          </div>
                        ) : "คลิกเพื่อค้นหา / เลือกลูกค้า ..."}
                      </span>
                      <Icon d={showCustomerSearch ? Icons.x : Icons.search} className="text-gray-400" size={18} />
                    </button>
                    
                    {showCustomerSearch && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="พิมพ์ชื่อ, เบอร์โทร..." 
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                            value={customerSearchQuery}
                            onChange={e => setCustomerSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-400 font-bold">ไม่พบลูกค้าในระบบ</div>
                          ) : (
                            filteredCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-orange-500/5 border-b border-gray-50 last:border-0 transition-colors flex flex-col"
                                onClick={() => { setForm({...form, customer_id: c.id}); setShowCustomerSearch(false); }}
                              >
                                <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                                {c.phone && <span className="text-xs text-gray-500 mt-1">{c.phone}</span>}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                 </div>
               </div>
            </div>

            {/* 3. Items List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
                 <h2 className="text-sm font-bold text-gray-700">รายการสินค้า / บริการ</h2>
                 <button
                  type="button"
                  onClick={() => setItems([...items, { id: Date.now().toString(), name: "", price: 0, qty: 1 }])}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-bold hover:bg-orange-500/20 transition-colors"
                >
                  <Icon d={Icons.plus} size={14} /> เพิ่มรายการ
                </button>
              </div>

              <div className="p-5 space-y-3">
                {items.map((it, idx) => (
                  <div key={it.id} className="bg-white rounded-xl p-4 border border-gray-200 relative shadow-sm">
                     {/* Search input inside row */}
                     <div className="mb-3">
                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">ชื่อสินค้า / ค้นหาสินค้า</label>
                       <div className="relative">
                         <input 
                           className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 font-bold text-slate-900 transition-all" 
                           placeholder={`รายการที่ ${idx+1}`}
                           value={it.name} 
                           onChange={e => { 
                             const newItems = [...items]; 
                             newItems[idx].name = e.target.value; 
                             setItems(newItems);
                             setActiveItemSearchId(it.id);
                             setProductSearchQuery(e.target.value);
                           }}
                           onFocus={() => { setActiveItemSearchId(it.id); setProductSearchQuery(it.name); }}
                         />
                         
                         {/* Product Auto-complete Dropdown */}
                         {activeItemSearchId === it.id && productSearchQuery && (
                           <>
                             <div className="fixed inset-0 z-[5]" onClick={() => setActiveItemSearchId(null)}></div>
                             <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
                               {filteredProducts.length === 0 ? (
                                 <div className="p-3 text-center text-xs text-gray-400 font-bold">ไม่พบสินค้าในสต๊อก (พิมพ์เพื่อเพิ่มได้เลย)</div>
                               ) : (
                                 filteredProducts.map(p => (
                                   <button
                                     key={p.id}
                                     type="button"
                                     className="w-full text-left px-4 py-3 text-sm hover:bg-orange-500/5 border-b border-gray-50 last:border-0 transition-colors flex justify-between items-center"
                                     onClick={() => { 
                                       const newItems = [...items];
                                       newItems[idx].name = p.name;
                                       newItems[idx].price = p.price;
                                       setItems(newItems);
                                       setActiveItemSearchId(null);
                                     }}
                                   >
                                     <span className="font-bold text-slate-900 truncate pr-2">{p.name}</span>
                                     <span className="text-xs text-orange-500 font-black shrink-0">฿{Number(p.price).toLocaleString()}</span>
                                   </button>
                                 ))
                               )}
                             </div>
                           </>
                         )}
                       </div>
                     </div>

                     <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
                       <div className="flex-1 min-w-[100px]">
                         <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">จำนวน</label>
                         <input type="number" min="1" className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-orange-500 text-center" value={it.qty} onChange={e => { const newItems = [...items]; newItems[idx].qty = e.target.value; setItems(newItems); }} />
                       </div>
                       <div className="text-gray-300 font-black mt-4">×</div>
                       <div className="flex-1 min-w-[120px]">
                         <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">ราคา/หน่วย</label>
                         <input type="number" min="0" className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-orange-500 text-right" value={it.price} onChange={e => { const newItems = [...items]; newItems[idx].price = e.target.value; setItems(newItems); }} />
                       </div>
                       <div className="text-gray-300 font-black mt-4 hidden sm:block">=</div>
                       <div className="flex-1 sm:flex-none sm:w-32 text-right mt-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                         <div className="text-sm font-black text-slate-900">฿{((Number(it.price)||0) * (Number(it.qty)||0)).toLocaleString()}</div>
                       </div>
                       <button type="button" disabled={items.length <= 1} className="mt-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors" onClick={() => setItems(items.filter(x => x.id !== it.id))}>
                         <Icon d={Icons.trash} size={18} />
                       </button>
                     </div>
                  </div>
                ))}
              </div>

              {/* Totals Calculation */}
              <div className="p-5 bg-gray-50 border-t border-gray-100">
                <div className="max-w-xs ml-auto space-y-3">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>ยอดรวมก่อนหักส่วนลด</span>
                    <span className="font-bold text-gray-700">฿{totals.subtotal.toLocaleString('th-TH')}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm text-gray-500 whitespace-nowrap">ส่วนลด (บาท)</span>
                    <input type="number" className="w-24 px-2 py-1.5 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-orange-500 text-right" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm text-gray-500 whitespace-nowrap">ภาษีมูลค่าเพิ่ม (%)</span>
                    <select className="w-24 px-2 py-1.5 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-orange-500" value={form.taxRate} onChange={e => setForm({...form, taxRate: e.target.value})}>
                      <option value="0">ไม่มี</option>
                      <option value="7">7%</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                    <span className="font-black text-slate-900 text-base">ยอดรวมทั้งสิ้น</span>
                    <span className="font-black text-orange-500 text-xl">฿{totals.total.toLocaleString('th-TH')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Note & Conditions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 rounded-t-2xl">
                 <h2 className="text-sm font-bold text-gray-700">หมายเหตุ & เงื่อนไข</h2>
              </div>
              <div className="p-5">
                <textarea 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 resize-y min-h-[100px]" 
                  value={form.note} 
                  onChange={e => setForm({...form, note: e.target.value})} 
                  placeholder="พิมพ์เงื่อนไขการชำระเงิน หรือหมายเหตุถึงลูกค้าที่นี่..."
                ></textarea>
              </div>
            </div>

            {/* 5. Signature Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
                 <h2 className="text-sm font-bold text-gray-700">ลายเซ็นผู้อำนาจ</h2>
                 {form.signature && (
                   <button onClick={() => setForm({...form, signature: null})} className="text-xs text-red-500 font-bold hover:underline">ลบลายเซ็น</button>
                 )}
              </div>
              <div className="p-5">
                {!form.signature ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Icon d={Icons.edit} size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-bold text-gray-600 mb-1">คลิกเพื่ออัปโหลดรูปลายเซ็น</p>
                    <p className="text-xs text-gray-400">รองรับไฟล์ PNG, JPG ที่พื้นหลังโปร่งใส</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleSignatureUpload}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <img src={form.signature} alt="Signature preview" className="max-h-24 max-w-full object-contain mb-3" />
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1"><Icon d={Icons.check} size={12}/> แนบลายเซ็นสำเร็จแล้ว</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: LIVE PREVIEW (5 cols) */}
          <div className="lg:col-span-5 relative">
             <div className="sticky top-4">
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Icon d={Icons.eye} size={16} className="text-orange-500" />
                    ตัวอย่างเอกสาร ({form.doc_type === 'quotation' ? 'ใบเสนอราคา' : form.doc_type === 'receipt' ? 'ใบเสร็จ' : form.doc_type === 'billing' ? 'ใบแจ้งหนี้' : 'ใบส่งของ'})
                  </p>
                  <span className="text-[10px] font-bold text-slate-900 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">A4 Size</span>
               </div>
               
               {/* The actual A4 Preview scaled down */}
               <div className="rounded-2xl shadow-lg border border-gray-200 bg-gray-300 overflow-hidden relative" style={{ height: 'min(800px, calc(100vh - 150px))' }}>
                 <div className="absolute inset-0 overflow-auto flex justify-center custom-scrollbar pb-10">
                   <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center', marginTop: '20px', marginBottom: `-${(1 - previewScale) * 100}%` }}>
                     <div id="print-area">
                       <DocumentPreview 
                         storeSettings={storeSettings}
                         customer={selectedCustomer}
                         items={items}
                         docType={form.doc_type}
                         docNo={form.doc_no}
                         issueDate={form.issue_date}
                         dueDate={form.due_date}
                         subtotal={totals.subtotal}
                         discount={form.discount}
                         tax={totals.tax}
                         total={totals.total}
                         note={form.note}
                         signature={form.signature}
                       />
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
