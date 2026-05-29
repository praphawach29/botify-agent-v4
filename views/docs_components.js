// ═══════════════════════════════════════════════════════════
//  Customer Management
// ═══════════════════════════════════════════════════════════
function CustomerManagementPage({ toast }) {
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [form, setForm] = React.useState({ name: "", phone: "", email: "", address: "", tax_id: "", line_id: "" });
  const [search, setSearch] = React.useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers", { headers: { Authorization: "Bearer " + localStorage.getItem("botify_token") }});
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) { toast("Error: " + e.message, "error"); }
    setLoading(false);
  };
  React.useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.name) return toast("กรุณากรอกชื่อลูกค้า", "error");
    try {
      const url = editId ? `/api/customers/${editId}` : "/api/customers";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("botify_token") },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast("บันทึกข้อมูลเรียบร้อย", "success");
      setShowModal(false);
      loadData();
    } catch (e) { toast(e.message, "error"); }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)));

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>จัดการข้อมูลลูกค้า</h2>
        <button className="btn-primary" onClick={() => { setEditId(null); setForm({ name: "", phone: "", email: "", address: "", tax_id: "", line_id: "" }); setShowModal(true); }}>
          <Icon d={Icons.plus} /> เพิ่มลูกค้า
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <input className="input" placeholder="ค้นหาชื่อ, เบอร์โทร..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div>Loading...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 12 }}>ชื่อลูกค้า</th>
                <th style={{ padding: 12 }}>เบอร์โทร</th>
                <th style={{ padding: 12 }}>LINE ID</th>
                <th style={{ padding: 12 }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 12 }}>{c.name}</td>
                  <td style={{ padding: 12 }}>{c.phone || "-"}</td>
                  <td style={{ padding: 12 }}>{c.line_id || "-"}</td>
                  <td style={{ padding: 12 }}>
                    <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => { setEditId(c.id); setForm(c); setShowModal(true); }}>แก้ไข</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>ไม่มีข้อมูลลูกค้า</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h3>{editId ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"}</h3>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div><label className="label">ชื่อลูกค้า / บริษัท *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">เบอร์โทรศัพท์</label><input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="label">LINE ID</label><input className="input" value={form.line_id} onChange={e => setForm({...form, line_id: e.target.value})} /></div>
              <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="label">ที่อยู่</label><textarea className="input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={3} /></div>
              <div><label className="label">เลขประจำตัวผู้เสียภาษี</label><input className="input" value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSave}>บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Document Management
// ═══════════════════════════════════════════════════════════
function DocumentsPage({ toast }) {
  const [tab, setTab] = React.useState("history"); // history, create
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Form State
  const [form, setForm] = React.useState({ doc_type: "quotation", customer_id: "", note: "", discount: 0, taxRate: 0 });
  const [items, setItems] = React.useState([{ name: "", price: 0, qty: 1 }]);
  const [customers, setCustomers] = React.useState([]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", { headers: { Authorization: "Bearer " + localStorage.getItem("botify_token") }});
      const data = await res.json();
      setDocs(data.documents || []);
    } catch(e){}
    setLoading(false);
  };
  const loadCustomers = async () => {
    try {
      const res = await fetch("/api/customers", { headers: { Authorization: "Bearer " + localStorage.getItem("botify_token") }});
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch(e){}
  };

  React.useEffect(() => {
    loadDocs();
    loadCustomers();
  }, []);

  const calcTotals = () => {
    const subtotal = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.qty)), 0);
    const afterDiscount = Math.max(0, subtotal - Number(form.discount));
    const tax = (afterDiscount * Number(form.taxRate)) / 100;
    const total = afterDiscount + tax;
    return { subtotal, tax, total };
  };

  const handleSaveDoc = async (sendMethod) => {
    if (!form.customer_id) return toast("กรุณาเลือกลูกค้า", "error");
    if (items.some(i => !i.name)) return toast("กรุณากรอกชื่อสินค้าให้ครบ", "error");

    const cus = customers.find(c => c.id === form.customer_id);
    const { subtotal, tax, total } = calcTotals();
    const payload = {
      doc_type: form.doc_type,
      customer_id: cus.id,
      customer_info: cus,
      items: items,
      subtotal,
      tax,
      discount: Number(form.discount),
      total,
      note: form.note
    };

    try {
      const res = await fetch("/api/documents", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("botify_token") },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast("บันทึกเอกสารสำเร็จ", "success");
      
      if (sendMethod) {
        toast("กำลังส่งเอกสาร...", "info");
        const sendRes = await fetch(`/api/documents/${data.document.id}/send`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("botify_token") },
          body: JSON.stringify({ method: sendMethod, to_line_id: cus.line_id, to_email: cus.email })
        });
        const sendData = await sendRes.json();
        if (sendData.error) toast("ส่งไม่สำเร็จ: " + sendData.error, "error");
        else toast("ส่งเอกสารเรียบร้อย!", "success");
      }

      setTab("history");
      loadDocs();
      // Reset form
      setForm({ doc_type: "quotation", customer_id: "", note: "", discount: 0, taxRate: 0 });
      setItems([{ name: "", price: 0, qty: 1 }]);
    } catch (e) { toast(e.message, "error"); }
  };

  const sendDoc = async (id, method, cus) => {
    if (method === "line" && !cus.line_id) return toast("ลูกค้านี้ไม่มี LINE ID", "error");
    toast("กำลังส่งเอกสาร...", "info");
    try {
      const sendRes = await fetch(`/api/documents/${id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("botify_token") },
        body: JSON.stringify({ method, to_line_id: cus.line_id, to_email: cus.email })
      });
      const sendData = await sendRes.json();
      if (sendData.error) toast("ส่งไม่สำเร็จ: " + sendData.error, "error");
      else toast("ส่งเอกสารเรียบร้อย!", "success");
      loadDocs();
    } catch(e) { toast("Error: " + e.message, "error"); }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 20, marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 10 }}>
        <button style={{ background: "none", border: "none", fontWeight: tab === "history" ? 700 : 400, color: tab === "history" ? "#3b82f6" : "#6b7280", cursor: "pointer", fontSize: 16 }} onClick={() => setTab("history")}>ประวัติเอกสาร</button>
        <button style={{ background: "none", border: "none", fontWeight: tab === "create" ? 700 : 400, color: tab === "create" ? "#3b82f6" : "#6b7280", cursor: "pointer", fontSize: 16 }} onClick={() => setTab("create")}>สร้างเอกสารใหม่</button>
      </div>

      {tab === "history" && (
        <div>
          {loading ? <div>Loading...</div> : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 12 }}>วันที่</th>
                    <th style={{ padding: 12 }}>เลขที่</th>
                    <th style={{ padding: 12 }}>ประเภท</th>
                    <th style={{ padding: 12 }}>ลูกค้า</th>
                    <th style={{ padding: 12 }}>ยอดเงิน</th>
                    <th style={{ padding: 12 }}>สถานะ</th>
                    <th style={{ padding: 12 }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => {
                    const typeName = { "quotation": "ใบเสนอราคา", "receipt": "ใบเสร็จรับเงิน", "billing": "ใบแจ้งหนี้/วางบิล", "delivery": "ใบส่งของ" }[d.doc_type] || "เอกสาร";
                    return (
                    <tr key={d.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 12 }}>{new Date(d.created_at).toLocaleDateString('th-TH')}</td>
                      <td style={{ padding: 12, fontWeight: 500 }}>{d.doc_no}</td>
                      <td style={{ padding: 12 }}>{typeName}</td>
                      <td style={{ padding: 12 }}>{d.customers?.name || d.customer_info?.name || "-"}</td>
                      <td style={{ padding: 12 }}>฿ {Number(d.total).toLocaleString('th-TH')}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ padding: "4px 8px", borderRadius: 4, fontSize: 12, background: d.status === 'sent' ? '#dcfce7' : '#f3f4f6', color: d.status === 'sent' ? '#166534' : '#374151' }}>
                          {d.status === 'sent' ? 'ส่งแล้ว' : 'สร้างแล้ว'}
                        </span>
                      </td>
                      <td style={{ padding: 12, display: "flex", gap: 8 }}>
                        <a href={`/doc/${d.id}`} target="_blank" className="btn-secondary" style={{ padding: "6px 10px", fontSize: 12, textDecoration: "none" }}>ดูเอกสาร</a>
                        <button className="btn-primary" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => sendDoc(d.id, 'line', d.customer_info)}>ส่ง LINE</button>
                      </td>
                    </tr>
                  )})}
                  {docs.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>ไม่มีประวัติเอกสาร</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "create" && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label className="label">ประเภทเอกสาร</label>
              <select className="input" value={form.doc_type} onChange={e => setForm({...form, doc_type: e.target.value})}>
                <option value="quotation">ใบเสนอราคา (Quotation)</option>
                <option value="billing">ใบแจ้งหนี้ / ใบวางบิล (Invoice / Billing)</option>
                <option value="receipt">ใบเสร็จรับเงิน (Receipt)</option>
                <option value="delivery">ใบส่งของ (Delivery Note)</option>
              </select>
            </div>
            <div>
              <label className="label">ลูกค้า</label>
              <select className="input" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ fontSize: 12, marginTop: 4, color: "#6b7280" }}>* หากไม่มีชื่อลูกค้า ให้ไปเพิ่มที่เมนู "จัดการลูกค้า" ก่อน</div>
            </div>
          </div>

          <h3 style={{ fontSize: 16, marginTop: 30, marginBottom: 10 }}>รายการสินค้า</h3>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 20 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                <input className="input" style={{ flex: 2 }} placeholder="ชื่อรายการ..." value={it.name} onChange={e => { const newItems = [...items]; newItems[idx].name = e.target.value; setItems(newItems); }} />
                <input className="input" style={{ flex: 1 }} type="number" placeholder="ราคา" value={it.price} onChange={e => { const newItems = [...items]; newItems[idx].price = e.target.value; setItems(newItems); }} />
                <input className="input" style={{ width: 80 }} type="number" placeholder="จำนวน" value={it.qty} onChange={e => { const newItems = [...items]; newItems[idx].qty = e.target.value; setItems(newItems); }} />
                <div style={{ width: 100, textAlign: "right" }}>฿ {(it.price * it.qty).toLocaleString('th-TH')}</div>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} onClick={() => { const newItems = items.filter((_, i) => i !== idx); setItems(newItems); }}>
                  <Icon d={Icons.trash} />
                </button>
              </div>
            ))}
            <button className="btn-secondary" style={{ fontSize: 13, padding: "6px 12px" }} onClick={() => setItems([...items, { name: "", price: 0, qty: 1 }])}>+ เพิ่มรายการ</button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <div style={{ width: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>รวมเป็นเงิน</span><span>฿ {calcTotals().subtotal.toLocaleString('th-TH')}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                <span>ส่วนลด (บาท)</span>
                <input className="input" style={{ width: 100, padding: "4px 8px", textAlign: "right" }} type="number" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                <span>ภาษีมูลค่าเพิ่ม (%)</span>
                <select className="input" style={{ width: 100, padding: "4px 8px" }} value={form.taxRate} onChange={e => setForm({...form, taxRate: e.target.value})}>
                  <option value="0">ไม่มี</option>
                  <option value="7">7%</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #e5e7eb", paddingTop: 12, marginTop: 8, fontWeight: "bold", fontSize: 18 }}>
                <span>ยอดสุทธิ</span><span style={{ color: "#3b82f6" }}>฿ {calcTotals().total.toLocaleString('th-TH')}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="label">หมายเหตุ (แสดงท้ายเอกสาร)</label>
            <textarea className="input" rows={3} value={form.note} onChange={e => setForm({...form, note: e.target.value})}></textarea>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 30 }}>
            <button className="btn-secondary" onClick={() => handleSaveDoc(null)}>💾 บันทึกอย่างเดียว</button>
            <button className="btn-primary" onClick={() => handleSaveDoc('line')}>💬 บันทึก & ส่งผ่าน LINE</button>
          </div>
        </div>
      )}
    </div>
  );
}
