export type EquipmentQrPdfItem = {
  id: string;
  title: string;
  size?: string;
  qrDataUrl: string;
};

export function buildEquipmentQrPdfHtml(items: EquipmentQrPdfItem[]): string {
  const cardsMarkup = items
    .map(
      item => `
        <div class="card">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="subtitle">${
            item.size ? `Velicina: ${escapeHtml(item.size)}` : 'Bez velicine'
          }</div>
          <img class="qr" src="${item.qrDataUrl}" alt="QR kod" />
        </div>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="sr">
      <head>
        <meta charset="UTF-8" />
        <title>PDF kodovi opreme</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, sans-serif;
            color: #111111;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          p {
            margin: 0 0 20px;
            font-size: 12px;
            color: #555555;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }

          .card {
            border: 1px solid #d0d5dd;
            border-radius: 12px;
            padding: 14px 12px 16px;
            min-height: 240px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            page-break-inside: avoid;
          }

          .title {
            font-size: 14px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 4px;
          }

          .subtitle {
            font-size: 12px;
            color: #555555;
            text-align: center;
            margin-bottom: 12px;
          }

          .qr {
            width: 150px;
            height: 150px;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <h1>PDF kodovi opreme</h1>
        <p>Pregled svih QR kodova lager stavki za stampu i distribuciju.</p>
        <div class="grid">
          ${cardsMarkup}
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
