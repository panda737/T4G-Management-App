import { useRef, useState } from 'react';
import { Plus, Search, Trash2, ClipboardList } from 'lucide-react';
import { supabase, StockItem, Client, ClientSite, StockOrder, StockOrderItem, OrderSource } from '../../lib/supabase';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import { useOnClickOutside } from '../../lib/useOnClickOutside';
import Modal from '../../components/Modal';
import StockItemSearch from '../../components/StockItemSearch';
import { ORDER_SOURCES } from './constants';

interface OrderLine {
  id: number;
  itemId: string;
  quantity: number;
}

interface Props {
  items: StockItem[];
  clients: Client[];
  sites: ClientSite[];
  order?: StockOrder | null;          // present = edit (Open orders only)
  orderItems?: StockOrderItem[];
  onClose: () => void;
  onSave: () => void;
}

export default function OrderFormModal({ items, clients, sites, order, orderItems, onClose, onSave }: Props) {
  const isEdit = !!order;
  const [lines, setLines] = useState<OrderLine[]>(() => {
    if (orderItems && orderItems.length > 0) {
      return orderItems
        .slice()
        .sort((a, b) => a.line_no - b.line_no)
        .map((oi, idx) => ({
          id: idx + 1,
          itemId: oi.stock_item_id || '',
          quantity: oi.qty_ordered,
        }));
    }
    return [{ id: 1, itemId: '', quantity: 1 }];
  });
  const [clientId, setClientId] = useState(order?.client_id || '');
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdown, setClientDropdown] = useState(false);
  const [siteId, setSiteId] = useState(order?.site_id || '');
  const [siteSearch, setSiteSearch] = useState('');
  const [siteDropdown, setSiteDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(clientRef, () => setClientDropdown(false), clientDropdown);
  useOnClickOutside(siteRef, () => setSiteDropdown(false), siteDropdown);
  const [source, setSource] = useState<OrderSource>(order?.source || 'OrderCo');
  const [customerRef, setCustomerRef] = useState(order?.customer_reference || '');
  const [orderDate, setOrderDate] = useState(order?.order_date || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(order?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedClient = clients.find(c => c.id === clientId);
  const activeClients = clients.filter(c => c.active);
  const filteredClients = activeClients.filter(c => {
    const q = clientSearch.toLowerCase();
    return !q || `${c.client_name} ${c.client_code} ${c.contact_person}`.toLowerCase().includes(q);
  });

  const selectedSite = sites.find(s => s.id === siteId);
  const clientSites = sites.filter(s => s.client_id === clientId && s.active);
  const filteredSites = clientSites.filter(s => {
    const q = siteSearch.toLowerCase();
    return !q || `${s.generator_facility} ${s.site_code} ${s.generator_group} ${s.province}`.toLowerCase().includes(q);
  });

  // Sites are client-specific — clearing/changing the client invalidates the site.
  // Picking a client immediately opens the delivery-site picker below it.
  function selectClient(id: string) { setClientId(id); setClientDropdown(false); setSiteId(''); setSiteSearch(''); setSiteDropdown(true); }
  function clearClient() { setClientId(''); setClientSearch(''); setClientDropdown(false); setSiteId(''); setSiteSearch(''); setSiteDropdown(false); }

  function updateLine(id: number, patch: Partial<OrderLine>) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function removeLine(id: number) {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  function addLine() {
    const newId = lines.reduce((max, l) => Math.max(max, l.id), 0) + 1;
    setLines(prev => [...prev, { id: newId, itemId: '', search: '', showDropdown: false, quantity: 1 }]);
  }

  async function insertOrder(orderNumber: string) {
    const validLines = lines.filter(l => l.itemId);

    const { data: newOrder, error: orderErr } = await supabase
      .from('stock_orders')
      .insert({
        order_number: orderNumber,
        client_id: clientId,
        client_name: selectedClient?.client_name || '',
        site_id: siteId || null,
        site_name: selectedSite?.generator_facility || '',
        order_date: orderDate,
        source,
        customer_reference: customerRef,
        notes,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      })
      .select()
      .single();

    if (orderErr || !newOrder) return { err: orderErr, orderId: null };

    const itemRows = validLines.map((line, idx) => {
      const stockItem = items.find(i => i.id === line.itemId)!;
      return {
        order_id: newOrder.id,
        stock_item_id: line.itemId,
        stock_code: stockItem.stock_code || '',
        stock_item: stockItem.stock_item,
        description: stockItem.description || '',
        unit_of_measure: stockItem.unit_of_measure || '',
        qty_ordered: line.quantity,
        line_no: idx,
      };
    });

    const { error: itemsErr } = await supabase.from('stock_order_items').insert(itemRows);
    if (itemsErr) {
      // best-effort rollback of the header so a retry is clean
      await supabase.from('stock_orders').delete().eq('id', newOrder.id);
      return { err: itemsErr, orderId: null };
    }
    return { err: null, orderId: newOrder.id };
  }

  async function updateExistingOrder() {
    const validLines = lines.filter(l => l.itemId);

    const { error: orderErr } = await supabase
      .from('stock_orders')
      .update({
        client_id: clientId,
        client_name: selectedClient?.client_name || '',
        site_id: siteId || null,
        site_name: selectedSite?.generator_facility || '',
        order_date: orderDate,
        source,
        customer_reference: customerRef,
        notes,
      })
      .eq('id', order!.id)
      .eq('status', 'Open');

    if (orderErr) return orderErr;

    // Replace lines: delete + reinsert
    const { error: delErr } = await supabase.from('stock_order_items').delete().eq('order_id', order!.id);
    if (delErr) return delErr;

    const itemRows = validLines.map((line, idx) => {
      const stockItem = items.find(i => i.id === line.itemId)!;
      return {
        order_id: order!.id,
        stock_item_id: line.itemId,
        stock_code: stockItem.stock_code || '',
        stock_item: stockItem.stock_item,
        description: stockItem.description || '',
        unit_of_measure: stockItem.unit_of_measure || '',
        qty_ordered: line.quantity,
        line_no: idx,
      };
    });

    const { error: itemsErr } = await supabase.from('stock_order_items').insert(itemRows);
    return itemsErr;
  }

  async function handleSave() {
    setError('');
    if (!clientId) { setError('Please select a client.'); return; }
    if (!isEdit && !siteId) { setError('Please select a delivery site.'); return; }
    const validLines = lines.filter(l => l.itemId);
    if (validLines.length === 0) { setError('Please add at least one item.'); return; }
    for (const line of validLines) {
      if (line.quantity <= 0) { setError('All quantities must be greater than 0.'); return; }
    }

    setSaving(true);

    if (isEdit) {
      const err = await updateExistingOrder();
      if (err) { setError(err.message); setSaving(false); return; }
      setSaving(false);
      onSave();
      return;
    }

    let orderNumber = await generateSequentialNumber('stock_orders', 'order_number', 'DN');
    let result = await insertOrder(orderNumber);
    if (result.err?.code === '23505') {
      // Number collision (concurrent insert) — regenerate once and retry
      orderNumber = await generateSequentialNumber('stock_orders', 'order_number', 'DN');
      result = await insertOrder(orderNumber);
    }
    if (result.err) { setError(result.err.message); setSaving(false); return; }

    setSaving(false);
    onSave();
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const validLineCount = lines.filter(l => l.itemId).length;

  return (
    <Modal
      title={isEdit ? `Edit Order ${order!.order_number}` : 'Load Customer Order'}
      onClose={onClose}
      size="xl"
      accent="blue"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-blue-100 text-blue-700">
        <ClipboardList size={12} />
        Stock only moves when the signed delivery note is confirmed — loading an order reserves nothing.
      </div>

      {/* Order header */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div ref={clientRef} className="col-span-2 relative">
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Client *</label>
          {selectedClient ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border-2 border-blue-300 bg-blue-50 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selectedClient.client_name}</p>
                <p className="text-[10px] text-gray-500">{[selectedClient.client_code, selectedClient.contact_person, selectedClient.phone].filter(Boolean).join(' · ') || 'no details'}</p>
              </div>
              <button onClick={clearClient} className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs underline">change</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search client..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientDropdown(true); }}
                  onClick={() => setClientDropdown(true)}
                  onFocus={() => setClientDropdown(true)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {clientDropdown && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-[26rem] overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">
                      No active clients found — add clients under Commercial → Accounts
                    </p>
                  ) : filteredClients.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => selectClient(c.id)}
                      className="w-full text-left px-3 py-1.5 text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors leading-tight"
                    >
                      <p className="font-semibold text-gray-900">{c.client_name}</p>
                      <p className="text-[10px] text-gray-400">{[c.client_code, c.contact_person].filter(Boolean).join(' · ') || ' '}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {clientId && (
          <div ref={siteRef} className="col-span-2 relative">
            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Delivery Site *</label>
            {selectedSite ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border-2 border-blue-300 bg-blue-50 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{selectedSite.generator_facility}</p>
                  <p className="text-[10px] text-gray-500">{[selectedSite.site_code, selectedSite.province, selectedSite.generator_group].filter(Boolean).join(' · ') || 'no details'}</p>
                </div>
                <button onClick={() => { setSiteId(''); setSiteSearch(''); }} className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs underline">change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search site / facility..."
                    value={siteSearch}
                    onChange={e => { setSiteSearch(e.target.value); setSiteDropdown(true); }}
                    onClick={() => setSiteDropdown(true)}
                    onFocus={() => setSiteDropdown(true)}
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                {siteDropdown && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-[26rem] overflow-y-auto">
                    {filteredSites.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        No sites for this client — add sites under Commercial → Sites
                      </p>
                    ) : filteredSites.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setSiteId(s.id); setSiteDropdown(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors leading-tight"
                      >
                        <p className="font-semibold text-gray-900">{s.generator_facility}</p>
                        <p className="text-[10px] text-gray-400">{[s.site_code, s.province, s.generator_group].filter(Boolean).join(' · ') || ' '}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Order Source *</label>
          <select value={source} onChange={e => setSource(e.target.value as OrderSource)} className={inputCls}>
            {ORDER_SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Order Date</label>
          <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Customer Reference / PO No.</label>
          <input value={customerRef} onChange={e => setCustomerRef(e.target.value)} className={inputCls} placeholder="e.g. PO-12345" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Optional notes" />
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border-2 border-blue-200">
        <div className="px-4 py-2 flex items-center gap-2 bg-blue-600">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex-1">Order Items</span>
          <span className="text-xs text-white/70">Qty</span>
          <span className="w-7" />
        </div>

        <div className="divide-y divide-gray-100 bg-white">
          {lines.map((line, idx) => {
            const stockItem = items.find(i => i.id === line.itemId);
            const otherIds = lines.filter(l => l.id !== line.id && l.itemId).map(l => l.itemId);
            const overStock = stockItem && line.quantity > stockItem.current_quantity;

            return (
              <div key={line.id} className="px-3 py-1.5">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold w-5 text-center flex-shrink-0 text-blue-600">{idx + 1}</span>

                  <div className="flex-1">
                    <StockItemSearch
                      items={items}
                      value={line.itemId}
                      excludeIds={otherIds}
                      accent="blue"
                      onSelect={item => updateLine(line.id, { itemId: item.id })}
                      onClear={() => updateLine(line.id, { itemId: '' })}
                    />
                  </div>

                  {stockItem && (
                    <div className="text-center flex-shrink-0 w-16">
                      <p className="text-[10px] text-gray-400 leading-tight">on hand</p>
                      <p className={`text-sm font-bold leading-tight ${overStock ? 'text-amber-600' : 'text-gray-700'}`}>{stockItem.current_quantity}</p>
                    </div>
                  )}

                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    <button type="button" onClick={() => updateLine(line.id, { quantity: Math.max(1, line.quantity - 1) })} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 font-bold transition-colors text-base leading-none">−</button>
                    <input
                      type="number" min="1"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-14 text-center text-sm font-bold text-gray-900 focus:outline-none bg-white py-1.5"
                    />
                    <button type="button" onClick={() => updateLine(line.id, { quantity: line.quantity + 1 })} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 font-bold transition-colors text-base leading-none">+</button>
                  </div>

                  <button
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-20"
                    title="Remove line"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-3 py-2 border-t border-blue-100 bg-blue-50/50">
          <button
            onClick={addLine}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors text-blue-700 hover:text-blue-800"
          >
            <Plus size={13} /> Add another item
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || validLineCount === 0 || !clientId || (!isEdit && !siteId)}
          className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-semibold shadow-sm transition-colors bg-blue-600 hover:bg-blue-700"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : `Load Order (${validLineCount} item${validLineCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </Modal>
  );
}
