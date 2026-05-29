import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  SHOP PICKER (Super Admin — switch between shops)
// ═══════════════════════════════════════════════════════════
function ShopPicker({
  currentShop,
  onSelect
}) {
  const [shopList, setShopList] = useState([]);
  useEffect(() => {
    api("/api/shops").then(r => {
      if (r.shops) setShopList(r.shops);
    }).catch(() => {});
  }, []);
  if (shopList.length === 0) return null;
  return <div className="px-3 py-2 border-b border-gray-200/50">
      <label className="text-gray-400 text-xs block mb-1">เลือกร้าน</label>
      <DropdownSelect value={currentShop} onChange={v => onSelect(v)} options={[{
      value: "all",
      label: "ทุกร้าน"
    }, ...shopList.map(s => ({
      value: s.id,
      label: s.name
    }))]} />
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  PAYMENT PAGE (Shop Owner — เลือกแพ็กเกจ + ชำระเงิน)
// ═══════════════════════════════════════════════════════════
