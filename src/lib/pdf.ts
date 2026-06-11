/*
  Client-side PDF download for the branded A4 print layouts (delivery notes,
  finance pack). jsPDF + html2canvas are dynamically imported so they stay out
  of the main bundle and only load when the user actually downloads.

  Each direct child of the source element is treated as one A4 page.
*/

const A4_W = 210;
const A4_H = 297;
const MARGIN_X = 12;
const MARGIN_Y = 15;
const RENDER_WIDTH_PX = 760; // off-screen render width; scaled to fit A4 content

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(res => {
            img.onload = () => res();
            img.onerror = () => res();
          })
    )
  );
}

/** Render the given page elements into a single multi-page PDF and download it. */
async function pagesToPdf(pages: HTMLElement[], filename: string) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const contentW = A4_W - MARGIN_X * 2;
  const maxH = A4_H - MARGIN_Y * 2;

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    const imgH = (canvas.height * contentW) / canvas.width;
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', MARGIN_X, MARGIN_Y, contentW, Math.min(imgH, maxH));
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Clone each direct child of `source` (a print container, typically
 * `hidden print:block`) into an off-screen visible wrapper, then download
 * them as one A4 page per child.
 */
export async function downloadElementPagesAsPdf(source: HTMLElement, filename: string) {
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${RENDER_WIDTH_PX}px`,
    background: '#ffffff',
    zIndex: '-1',
  } as CSSStyleDeclaration);

  const pages: HTMLElement[] = [];
  Array.from(source.children).forEach(child => {
    const clone = child.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.style.width = `${RENDER_WIDTH_PX}px`;
    clone.style.breakAfter = 'auto';
    clone.style.pageBreakAfter = 'auto';
    wrapper.appendChild(clone);
    pages.push(clone);
  });

  document.body.appendChild(wrapper);
  try {
    await new Promise<void>(res => requestAnimationFrame(() => res()));
    if (document.fonts?.ready) await document.fonts.ready;
    await waitForImages(wrapper);
    await pagesToPdf(pages, filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}
