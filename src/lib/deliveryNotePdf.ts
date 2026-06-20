import type { jsPDF as JsPDFType } from 'jspdf';
import { StockOrder, StockOrderItem, Client, ClientSite } from './supabase';

/*
  Native (vector) delivery-note PDF — real selectable text, crisp at any zoom,
  small files. Mirrors the on-screen design: logo letterhead, From / Deliver To,
  order meta, a light-grey items table and a bold total, signatures (dispatch)
  or POD status (finance). The logo is the only raster element.
*/

const COMPANY = {
  name: 'Tech4Green',
  tagline: 'Waste Management Solutions',
  addressLines: [] as string[], // e.g. ['12 Industria Road, Cape Town, 7460']
  contact: '',                  // e.g. '+27 21 000 0000 · orders@tech4green.co.za · www.tech4green.co.za'
  legal: '',                    // e.g. 'Reg. 2018/123456/07 · VAT 4123456789'
};
const LOGO_SRC = '/T4G_Logo.png';

const C = {
  ink: [31, 41, 55] as [number, number, number],
  g500: [107, 114, 128] as [number, number, number],
  g400: [156, 163, 175] as [number, number, number],
  greenD: [20, 83, 45] as [number, number, number],
  greenB: [63, 178, 74] as [number, number, number],
  fill: [243, 244, 246] as [number, number, number],
  line: [229, 231, 235] as [number, number, number],
};
const ML = 16, X_R = 194, CW = X_R - ML;

export interface DeliveryNotePage {
  order: StockOrder;
  items: StockOrderItem[];
  copyLabel: string;
  showDelivered?: boolean;
  client?: Client | null;
  site?: ClientSite | null;
}

type Logo = { data: string; ar: number } | null;
let logoPromise: Promise<Logo> | null = null;

// Load the brand logo once and downscale it so each PDF stays small.
function getLogo(): Promise<Logo> {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise<Logo>(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const targetW = 480;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = Math.round((img.naturalHeight / img.naturalWidth) * targetW);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL('image/png'), ar: img.naturalWidth / img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_SRC;
  });
  return logoPromise;
}

interface TxtOpts {
  size?: number; style?: 'normal' | 'bold' | 'italic'; color?: [number, number, number];
  align?: 'left' | 'center' | 'right'; charSpace?: number;
}
function txt(doc: JsPDFType, s: string, x: number, y: number, o: TxtOpts = {}) {
  doc.setFont('helvetica', o.style || 'normal');
  doc.setFontSize(o.size || 10);
  doc.setTextColor(...(o.color || C.ink));
  if (o.charSpace) doc.setCharSpace(o.charSpace);
  doc.text(String(s), x, y, { align: o.align || 'left' });
  if (o.charSpace) doc.setCharSpace(0);
}

function deliverToLines(p: DeliveryNotePage): string[] {
  const { order, client, site } = p;
  const siteLines = [
    site?.generator_facility || order.site_name,
    order.client_name,
    site?.address_line_1,
    site?.address_line_2,
    site ? [site.address_line_3, site.postal_code].filter(Boolean).join(', ') : '',
    site ? [site.site_code, site.province].filter(Boolean).join(', ') : '',
  ];
  const clientLines = [
    order.client_name,
    client?.contact_person,
    client?.address_line_1,
    client?.address_line_2,
    [client?.address_line_3, client?.postal_code].filter(Boolean).join(', '),
    client?.phone,
  ];
  return ((order.site_name || site) ? siteLines : clientLines).filter((l): l is string => !!l && l.trim() !== '');
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

function tableHeader(doc: JsPDFType, ty: number, showDelivered: boolean) {
  doc.setFillColor(...C.fill);
  doc.roundedRect(ML, ty, CW, 8, 1.2, 1.2, 'F');
  const hb = ty + 5.3;
  txt(doc, 'CODE', ML + 2, hb, { size: 7.4, style: 'bold', color: C.g500, charSpace: 0.3 });
  txt(doc, 'ITEM', 42, hb, { size: 7.4, style: 'bold', color: C.g500, charSpace: 0.3 });
  txt(doc, 'DESCRIPTION', 92, hb, { size: 7.4, style: 'bold', color: C.g500, charSpace: 0.3 });
  txt(doc, 'UNIT', 138, hb, { size: 7.4, style: 'bold', color: C.g500, align: 'center', charSpace: 0.3 });
  txt(doc, 'QTY', 156, hb, { size: 7.4, style: 'bold', color: C.g500, align: 'center', charSpace: 0.3 });
  txt(doc, showDelivered ? 'DELIVERED' : 'RECEIVED', 180, hb, { size: 7.4, style: 'bold', color: C.g500, align: 'center', charSpace: 0.3 });
}

function drawNote(doc: JsPDFType, page: DeliveryNotePage, logo: Logo) {
  const { order, items, copyLabel, showDelivered = false } = page;

  // Letterhead
  const logoW = 46;
  if (logo) {
    doc.addImage(logo.data, 'PNG', ML, 15, logoW, logoW / logo.ar, 'brandlogo', 'FAST');
  } else {
    txt(doc, 'TECH4', ML, 24, { size: 22, style: 'bold', color: C.greenD });
    txt(doc, 'GREEN', ML + doc.getTextWidth('TECH4') + 0.5, 24, { size: 22, style: 'bold', color: C.greenB });
  }
  const logoBottom = logo ? 15 + logoW / logo.ar : 27;
  if (COMPANY.tagline) txt(doc, COMPANY.tagline.toUpperCase(), ML + 1, logoBottom + 4, { size: 6.2, color: C.g400, charSpace: 0.55 });

  txt(doc, 'DELIVERY NOTE', X_R, 22, { size: 15, style: 'bold', color: [17, 24, 39], align: 'right', charSpace: 0.4 });
  txt(doc, order.order_number, X_R, 28, { size: 10.5, color: C.g500, align: 'right' });
  txt(doc, copyLabel, X_R, 32.5, { size: 8, style: 'bold', color: C.greenB, align: 'right', charSpace: 0.5 });

  // Parties
  const py = 52;
  txt(doc, 'FROM', ML, py, { size: 7, style: 'bold', color: C.g400, charSpace: 0.5 });
  txt(doc, 'DELIVER TO', 110, py, { size: 7, style: 'bold', color: C.g400, charSpace: 0.5 });
  txt(doc, COMPANY.name, ML, py + 5.5, { size: 11, style: 'bold' });
  let fy = py + 5.5;
  COMPANY.addressLines.forEach(l => { fy += 4.4; txt(doc, l, ML, fy, { size: 9, color: C.g500 }); });
  if (COMPANY.contact) { fy += 4.4; txt(doc, COMPANY.contact, ML, fy, { size: 8.5, color: C.g500 }); }
  deliverToLines(page).forEach((l, i) =>
    txt(doc, l, 110, py + 5.5 + i * 4.4, { size: i === 0 ? 10.5 : 9, style: i === 0 ? 'bold' : 'normal', color: i === 0 ? C.ink : C.g500 }));

  // Order meta
  const my = 80;
  const metas: [string, string][] = [
    ['ORDER DATE', fmtDate(order.order_date)],
    ['SOURCE', order.source],
    ['CUSTOMER REF', order.customer_reference || '—'],
    showDelivered && order.confirmed_at ? ['CONFIRMED', fmtDate(order.confirmed_at)] : ['DELIVERY DATE', '—'],
  ];
  const colX = [ML, ML + 45, ML + 90, ML + 135];
  metas.forEach((m, i) => {
    txt(doc, m[0], colX[i], my, { size: 7, style: 'bold', color: C.g400, charSpace: 0.3 });
    txt(doc, m[1], colX[i], my + 5, { size: 9.5, style: 'bold' });
  });

  // Items
  let ty = 92;
  tableHeader(doc, ty, showDelivered);
  ty += 8;
  items.forEach(it => {
    const itemLines = doc.setFont('helvetica', 'bold').setFontSize(9.5).splitTextToSize(it.stock_item, 92 - 42 - 3);
    const descLines = doc.setFont('helvetica', 'normal').setFontSize(8.5).splitTextToSize(it.description || '—', 138 - 6 - 92);
    const rows = Math.max(itemLines.length, descLines.length, 1);
    const rh = rows * 4.0 + 5;
    if (ty + rh > 250) { doc.addPage(); ty = 20; tableHeader(doc, ty, showDelivered); ty += 8; }
    const baseY = ty + 5.2;
    const hasVar = showDelivered && it.qty_delivered !== null && it.qty_delivered !== it.qty_ordered;
    txt(doc, it.stock_code || '—', ML + 2, baseY, { size: 8.5, color: C.g500 });
    itemLines.forEach((l: string, i: number) => txt(doc, l, 42, baseY + i * 4.0, { size: 9.5, style: 'bold' }));
    descLines.forEach((l: string, i: number) => txt(doc, l, 92, baseY + i * 4.0, { size: 8.5, color: C.g500 }));
    txt(doc, it.unit_of_measure || '—', 138, baseY, { size: 9, color: C.g500, align: 'center' });
    txt(doc, String(it.qty_ordered), 156, baseY, { size: 9.5, style: 'bold', align: 'center' });
    if (showDelivered) txt(doc, it.qty_delivered == null ? '—' : String(it.qty_delivered), 180, baseY, { size: 9.5, style: hasVar ? 'bold' : 'normal', align: 'center' });
    doc.setDrawColor(...C.line); doc.setLineWidth(0.1); doc.line(ML, ty + rh - 1, X_R, ty + rh - 1);
    ty += rh;
  });

  // Total
  ty += 3;
  const totalOrdered = items.reduce((s, i) => s + i.qty_ordered, 0);
  const totalDelivered = items.reduce((s, i) => s + (i.qty_delivered ?? 0), 0);
  if (showDelivered) {
    txt(doc, 'DELIVERED', X_R - 64, ty + 5, { size: 8, style: 'bold', color: C.g400, align: 'right', charSpace: 0.4 });
    txt(doc, String(totalDelivered), X_R - 44, ty + 6, { size: 14, style: 'bold', color: [17, 24, 39], align: 'right' });
  }
  txt(doc, 'TOTAL UNITS', X_R - 20, ty + 5, { size: 8, style: 'bold', color: C.g400, align: 'right', charSpace: 0.4 });
  txt(doc, String(totalOrdered), X_R, ty + 6, { size: 14, style: 'bold', color: [17, 24, 39], align: 'right' });

  // POD status / confirmation note (finance)
  if (showDelivered) {
    let cy = ty + 18;
    if (order.confirmation_note) {
      txt(doc, 'CONFIRMATION NOTE', ML, cy, { size: 7, style: 'bold', color: C.g400, charSpace: 0.4 });
      const lines = doc.setFont('helvetica', 'normal').setFontSize(8.5).splitTextToSize(order.confirmation_note, CW);
      doc.setTextColor(...C.g500); doc.text(lines, ML, cy + 4.5); cy += 4.5 + lines.length * 4;
    }
    txt(doc, `Signed POD on file: ${order.signed_note_path ? 'Yes' : 'No'}`, ML, cy + 5, { size: 8.5, color: C.g500 });
  }

  // Signatures (dispatch)
  if (!showDelivered) {
    const sy = Math.max(ty + 26, 232);
    const cols: [number, string, string[]][] = [
      [ML, 'RECEIVED BY (CUSTOMER)', ['Name', 'Signature', 'Date']],
      [110, 'DELIVERED BY (DRIVER)', ['Name', 'Signature', 'Vehicle reg']],
    ];
    cols.forEach(([cx, head, fields]) => {
      txt(doc, head, cx, sy, { size: 7, style: 'bold', color: C.g400, charSpace: 0.4 });
      fields.forEach((f, i) => {
        const ly = sy + 12 + i * 13;
        txt(doc, f, cx, ly - 1.5, { size: 8.5, color: C.g400 });
        doc.setDrawColor(...C.line); doc.setLineWidth(0.2); doc.line(cx, ly, cx + 78, ly);
      });
    });
  }

  // Footer
  const fb = 282;
  doc.setFont('helvetica', 'normal').setFontSize(7.8).setTextColor(...C.g400);
  doc.text(doc.splitTextToSize('Goods received in good order and condition unless noted above. Any discrepancy must be recorded on this delivery note at the time of delivery.', CW), ML, fb);
  txt(doc, [COMPANY.name, COMPANY.contact, COMPANY.legal].filter(Boolean).join('   ·   '), ML, fb + 7, { size: 7, color: C.g400 });
  txt(doc, order.order_number, X_R, fb + 7, { size: 7, color: C.g400, align: 'right' });
}

async function buildDoc(pages: DeliveryNotePage[]): Promise<JsPDFType> {
  const { jsPDF } = await import('jspdf');
  const logo = await getLogo();
  const doc = new jsPDF('p', 'mm', 'a4');
  pages.forEach((p, i) => {
    if (i > 0) doc.addPage();
    drawNote(doc, p, logo);
  });
  return doc;
}

export async function downloadDeliveryNotes(pages: DeliveryNotePage[], filename: string): Promise<void> {
  const doc = await buildDoc(pages);
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export async function deliveryNotesToBlob(pages: DeliveryNotePage[]): Promise<Blob> {
  const doc = await buildDoc(pages);
  return doc.output('blob');
}
