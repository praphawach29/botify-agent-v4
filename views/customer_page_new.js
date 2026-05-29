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
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">จัดการข้อมูลลูกค้า</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">จัดการรายชื่อ ข้อมูลการติดต่อ และที่อยู่ของลูกค้าทั้งหมด</p>
        </div>
        <button 
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-sm md:text-base font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
          onClick={() => { setEditId(null); setForm({ name: "", phone: "", email: "", address: "", tax_id: "", line_id: "" }); setShowModal(true); }}
        >
          <Icon d={Icons.plus} size={16} />
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Icon d={Icons.search} size={16} />
            </div>
            <input 
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              placeholder="ค้นหาชื่อ, เบอร์โทร..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex items-center text-sm text-gray-500 font-medium">
            ลูกค้าทั้งหมด {filtered.length} รายการ
          </div>
        </div>

        {/* Table/List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-[11px] md:text-xs uppercase tracking-wider font-semibold whitespace-nowrap">
                  <th className="px-4 py-3 md:px-6 md:py-4">ชื่อลูกค้า</th>
                  <th className="px-4 py-3 md:px-6 md:py-4">เบอร์โทร</th>
                  <th className="px-4 py-3 md:px-6 md:py-4">LINE ID</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{c.name}</div>
                          {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.phone ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {c.phone}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      {c.line_id ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          {c.line_id}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        onClick={() => { setEditId(c.id); setForm(c); setShowModal(true); }}
                        title="แก้ไขข้อมูล"
                      >
                        <Icon d={Icons.edit} size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Icon d={Icons.users} size={28} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">ไม่พบข้อมูลลูกค้า</h3>
                      <p className="text-gray-500">ยังไม่มีข้อมูลลูกค้าในระบบ หรือไม่พบผลลัพธ์จากการค้นหา</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                {editId ? "✏️ แก้ไขข้อมูลลูกค้า" : "✨ เพิ่มลูกค้าใหม่"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <Icon d={Icons.x} size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อลูกค้า / บริษัท <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
                    placeholder="เช่น บริษัท เอบีซี จำกัด"
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
                    placeholder="08X-XXX-XXXX"
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">LINE ID</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
                    placeholder="@yourline"
                    value={form.line_id} 
                    onChange={e => setForm({...form, line_id: e.target.value})} 
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">อีเมล</label>
                  <input 
                    type="email"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
                    placeholder="email@example.com"
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ที่อยู่</label>
                  <textarea 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
                    placeholder="ที่อยู่สำหรับออกเอกสาร..."
                    rows={3} 
                    value={form.address} 
                    onChange={e => setForm({...form, address: e.target.value})} 
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">เลขประจำตัวผู้เสียภาษี</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
                    placeholder="13 หลัก"
                    value={form.tax_id} 
                    onChange={e => setForm({...form, tax_id: e.target.value})} 
                  />
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button 
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                onClick={() => setShowModal(false)}
              >
                ยกเลิก
              </button>
              <button 
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                onClick={handleSave}
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
