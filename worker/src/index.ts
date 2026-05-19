export interface Env {
  DB: D1Database
  RESEND_API_KEY: string
  RECIPIENT_EMAILS: string
}

interface LowStockRow {
  brand: string
  material: string
  brand_color_name: string
  current_quantity: number
  reorder_threshold: number
}

interface SummaryRow {
  total_stock: number
  consumed_this_month: number
  received_this_month: number
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await sendDigest(env)
  },
}

async function sendDigest(env: Env): Promise<void> {
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const [lowStockResult, summaryResult] = await env.DB.batch([
    env.DB.prepare(`
      SELECT f.brand, f.material, f.brand_color_name,
        COALESCE(p.current_quantity, 0) AS current_quantity,
        f.reorder_threshold
      FROM filament_families f
      LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
      WHERE f.active = 1
        AND COALESCE(p.current_quantity, 0) <= f.reorder_threshold
      ORDER BY COALESCE(p.current_quantity, 0) ASC, f.brand ASC
    `),
    env.DB.prepare(`
      SELECT
        COALESCE(SUM(p.current_quantity), 0) AS total_stock,
        COALESCE((
          SELECT SUM(-quantity_delta) FROM inventory_movements
          WHERE movement_type = 'CONSUME_OPEN' AND created_at >= ?
        ), 0) AS consumed_this_month,
        COALESCE((
          SELECT SUM(quantity_delta) FROM inventory_movements
          WHERE movement_type = 'RECEIVE_STOCK'
            AND created_at >= ?
            AND (notes IS NULL OR notes != 'Importación inicial')
        ), 0) AS received_this_month
      FROM filament_families f
      LEFT JOIN inventory_projection p ON p.filament_family_id = f.id
      WHERE f.active = 1
    `).bind(startOfMonth, startOfMonth),
  ])

  const lowStock = lowStockResult.results as LowStockRow[]
  const summary = summaryResult.results[0] as SummaryRow

  const recipients = env.RECIPIENT_EMAILS
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  const monthLabel = now.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })

  const subject =
    lowStock.length > 0
      ? `[Inventario] ${lowStock.length} insumo${lowStock.length > 1 ? 's' : ''} con stock bajo — ${monthLabel}`
      : `[Inventario] Resumen ${monthLabel} — todo en orden`

  const html = buildEmail({ lowStock, summary, monthLabel })

  await Promise.all(
    recipients.map((to) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pignus Inventario <noreply@pignuslabs.com.ar>',
          to,
          subject,
          html,
        }),
      }).then((res) => {
        if (!res.ok) console.error(`Resend error for ${to}: ${res.status}`)
      }),
    ),
  )
}

function buildEmail({
  lowStock,
  summary,
  monthLabel,
}: {
  lowStock: LowStockRow[]
  summary: SummaryRow
  monthLabel: string
}): string {
  const lowStockRows = lowStock
    .map(
      (f) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e2d9;">${f.brand}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e2d9;">${f.material}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e2d9;">${f.brand_color_name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e2d9;text-align:right;color:${f.current_quantity === 0 ? '#b91c1c' : '#92400e'};font-weight:600;">
          ${f.current_quantity} kg
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e8e2d9;text-align:right;color:#6b7280;">
          mín ${f.reorder_threshold} kg
        </td>
      </tr>`,
    )
    .join('')

  const lowStockSection =
    lowStock.length === 0
      ? `<p style="color:#166534;font-size:15px;margin:0;">
           Todos los insumos están sobre su umbral de reposición.
         </p>`
      : `<table style="width:100%;border-collapse:collapse;font-size:14px;">
           <thead>
             <tr style="background:#f5f0e8;">
               <th style="padding:8px 12px;text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Marca</th>
               <th style="padding:8px 12px;text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Material</th>
               <th style="padding:8px 12px;text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Color</th>
               <th style="padding:8px 12px;text-align:right;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Stock</th>
               <th style="padding:8px 12px;text-align:right;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Umbral</th>
             </tr>
           </thead>
           <tbody>${lowStockRows}</tbody>
         </table>`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;color:#1c1814;">
  <table style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);" cellpadding="0" cellspacing="0" width="100%">

    <!-- Header -->
    <tr>
      <td style="background:#1c1814;padding:24px 32px;">
        <p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a89880;">Pignus Inventario</p>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:500;color:#f5f0e8;">Resumen ${monthLabel}</h1>
      </td>
    </tr>

    <!-- KPIs: Stock total | Consumo mes | Ingresos mes -->
    <tr>
      <td style="padding:24px 32px 0;border-bottom:1px solid #e8e2d9;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:20px;width:34%;">
              <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;">Stock total</p>
              <p style="margin:4px 0 0;font-size:28px;font-weight:500;color:#1c1814;">${summary.total_stock} <span style="font-size:14px;color:#9ca3af;">kg</span></p>
            </td>
            <td style="padding-bottom:20px;width:33%;">
              <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;">Consumo / mes</p>
              <p style="margin:4px 0 0;font-size:28px;font-weight:500;color:#1c1814;">${summary.consumed_this_month} <span style="font-size:14px;color:#9ca3af;">kg</span></p>
            </td>
            <td style="padding-bottom:20px;">
              <p style="margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;">Ingresos / mes</p>
              <p style="margin:4px 0 0;font-size:28px;font-weight:500;color:#1c1814;">${summary.received_this_month} <span style="font-size:14px;color:#9ca3af;">kg</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Low stock section -->
    <tr>
      <td style="padding:24px 32px;">
        <p style="margin:0 0 16px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;">
          ${lowStock.length > 0 ? `${lowStock.length} insumo${lowStock.length > 1 ? 's' : ''} con stock bajo` : 'Insumos con stock bajo'}
        </p>
        ${lowStockSection}
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:0 32px 32px;">
        <a href="https://inventario.pignuslabs.com.ar"
           style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-family:sans-serif;font-weight:600;">
          Abrir Inventario
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:16px 32px;background:#f5f0e8;border-top:1px solid #e8e2d9;">
        <p style="margin:0;font-size:11px;color:#9ca3af;font-family:sans-serif;">
          Enviado automáticamente el 1° de cada mes · <a href="https://inventario.pignuslabs.com.ar" style="color:#1d4ed8;">inventario.pignuslabs.com.ar</a>
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`
}
