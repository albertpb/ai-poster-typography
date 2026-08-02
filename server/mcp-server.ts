import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import cors from 'cors'
import * as z from 'zod/v4'
import { DEFAULT_LAYOUT, FONT_OPTIONS, PRESETS, validateLayout, type ImageElement, type PosterLayout, type TextElement } from '../src/template.ts'

const HOST = '127.0.0.1'
const PORT = Number(process.env.TYPEFRAME_MCP_PORT ?? 7331)

const canvasSchema = z.object({
  width: z.number().int().min(128).max(20000).describe('Canvas width in pixels.'),
  height: z.number().int().min(128).max(20000).describe('Canvas height in pixels.'),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('Canvas background as a six-digit hex color.'),
})

const textElementSchema = z.object({
  id: z.string().min(1).max(80).optional().describe('Stable unique identifier. Generated when omitted.'),
  name: z.string().min(1).max(50).describe('Human-readable layer name, such as Title or Credits.'),
  text: z.string().min(1).max(500).describe('Exact text to render. Use newline characters for deliberate line breaks.'),
  x: z.number().min(0).max(1).describe('Normalized horizontal anchor coordinate from 0 (left) to 1 (right).'),
  y: z.number().min(0).max(1).describe('Normalized vertical top coordinate from 0 (top) to 1 (bottom).'),
  fontFamily: z.string().min(1).default(FONT_OPTIONS[2].value).describe('CSS font-family value. Prefer one returned by inspect_template_capabilities.'),
  fontSize: z.number().min(8).max(2000).describe('Font size in canvas pixels.'),
  fontWeight: z.number().int().min(100).max(900).multipleOf(100).default(700).describe('CSS font weight from 100 to 900.'),
  letterSpacing: z.number().min(-100).max(300).default(0).describe('Letter spacing in canvas pixels.'),
  lineHeight: z.number().min(0.5).max(3).default(1).describe('Line-height multiplier.'),
  align: z.enum(['left', 'center', 'right']).default('left').describe('Alignment relative to the x anchor.'),
  fill: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#111111').describe('Text color as a six-digit hex value.'),
  maskPadding: z.number().min(0).max(1000).default(40).describe('Protected-area padding around the estimated text bounds, in pixels.'),
})

const imageElementSchema = z.object({
  id: z.string().min(1).max(80).optional().describe('Stable unique identifier. Generated when omitted.'),
  name: z.string().min(1).max(50).describe('Guide name, such as Main character, Product, or Face area.'),
  x: z.number().min(0).max(1).describe('Normalized left coordinate from 0 to 1.'),
  y: z.number().min(0).max(1).describe('Normalized top coordinate from 0 to 1.'),
  width: z.number().min(0.01).max(1).describe('Normalized guide width. The sum of x and width must not exceed 1.'),
  height: z.number().min(0.01).max(1).describe('Normalized guide height. The sum of y and height must not exceed 1.'),
  fit: z.enum(['cover', 'contain']).default('contain').describe('How a locally uploaded reference image fits inside the guide.'),
  opacity: z.number().min(0.1).max(1).default(1).describe('Editor reference opacity.'),
})

const layoutSchema = z.object({
  canvas: canvasSchema,
  elements: z.array(textElementSchema).min(1).max(30).describe('Text layers in back-to-front render order.'),
  images: z.array(imageElementSchema).max(10).default([]).describe('Subject and image placement guides. Local image files are attached later in the editor.'),
})

const updateElementSchema = textElementSchema.partial().required({ id: true })
const updateImageSchema = imageElementSchema.partial().required({ id: true })

let currentLayout: PosterLayout = structuredClone(DEFAULT_LAYOUT)
let revision = 1

function normalizeLayout(input: z.output<typeof layoutSchema>): PosterLayout {
  const usedIds = new Set<string>()
  const elements = input.elements.map((element, index): TextElement => {
    const baseId = element.id?.trim() || `text-${index + 1}`
    let id = baseId
    let suffix = 2
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`
    usedIds.add(id)
    return { ...element, id }
  })
  const images = input.images.map((image, index): ImageElement => {
    const baseId = image.id?.trim() || `image-${index + 1}`
    let id = baseId
    let suffix = 2
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`
    usedIds.add(id)
    return { ...image, id }
  })
  return { canvas: input.canvas, elements, images }
}

function result(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] }
}

function createTypeframeServer() {
  const server = new McpServer({ name: 'typeframe', version: '0.1.0' })

  server.registerTool('set_template', {
    title: 'Set complete poster template',
    description: 'Replaces the Typeframe canvas, text layers, and subject/image guides. Use this after deciding the complete hierarchy, typography, normalized positions, and protection zones.',
    inputSchema: layoutSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
  }, async (input) => {
    const nextLayout = normalizeLayout(input)
    const warnings = validateLayout(nextLayout)
    currentLayout = nextLayout
    revision += 1
    return result({ success: true, revision, warnings, layout: currentLayout })
  })

  server.registerTool('update_text_element', {
    title: 'Update one text layer',
    description: 'Updates selected properties of one existing text layer without replacing the rest of the template.',
    inputSchema: updateElementSchema,
    annotations: { idempotentHint: true },
  }, async ({ id, ...changes }) => {
    const index = currentLayout.elements.findIndex((element) => element.id === id)
    if (index < 0) return { isError: true, ...result({ success: false, error: `No text element found with id "${id}".` }) }
    const updated = { ...currentLayout.elements[index], ...changes, id }
    currentLayout = {
      ...currentLayout,
      elements: currentLayout.elements.map((element, elementIndex) => elementIndex === index ? updated : element),
    }
    revision += 1
    return result({ success: true, revision, warnings: validateLayout(currentLayout), element: updated })
  })

  server.registerTool('update_image_element', {
    title: 'Update one image guide',
    description: 'Updates the normalized position, size, name, fit, or opacity of an existing subject/image guide.',
    inputSchema: updateImageSchema,
    annotations: { idempotentHint: true },
  }, async ({ id, ...changes }) => {
    const index = currentLayout.images.findIndex((image) => image.id === id)
    if (index < 0) return { isError: true, ...result({ success: false, error: `No image guide found with id "${id}".` }) }
    const updated = { ...currentLayout.images[index], ...changes, id }
    currentLayout = {
      ...currentLayout,
      images: currentLayout.images.map((image, imageIndex) => imageIndex === index ? updated : image),
    }
    revision += 1
    return result({ success: true, revision, warnings: validateLayout(currentLayout), image: updated })
  })

  server.registerTool('get_template', {
    title: 'Get current poster template',
    description: 'Returns the complete current Typeframe layout, including canvas, text layers, image guides, and normalized coordinates.',
  }, async () => result({ revision, layout: currentLayout, warnings: validateLayout(currentLayout) }))

  server.registerTool('inspect_template_capabilities', {
    title: 'Inspect Typeframe capabilities',
    description: 'Lists supported fonts, paper presets, coordinate rules, and practical layout guidance before creating a template.',
  }, async () => result({
    coordinateSystem: 'All positions are normalized from 0 to 1. Text x is its alignment anchor and text y is its top. Image x/y are the top-left corner and image width/height are normalized dimensions.',
    fonts: FONT_OPTIONS,
    presets: Object.fromEntries(Object.entries(PRESETS).map(([name, canvas]) => [name, { width: canvas.width, height: canvas.height }])),
    guidance: [
      'Use center alignment with x=0.5 for centered titles.',
      'Keep important text anchors roughly between 0.05 and 0.95.',
      'Font sizes are canvas pixels and should scale with the selected canvas dimensions.',
      'Use maskPadding to reserve quiet space around each text block for image generation.',
      'Add image guides for subjects, faces, products, or other focal areas, then place text around their normalized bounds.',
      'Use explicit newlines when a headline should wrap at a deliberate point.',
    ],
  }))

  server.registerResource('current-template', 'typeframe://template/current', { mimeType: 'application/json' }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ revision, layout: currentLayout }, null, 2) }],
  }))

  return server
}

const app = createMcpExpressApp({ host: HOST })
app.use('/api', cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))

app.get('/api/layout', (_request, response) => {
  response.json({ revision, layout: currentLayout })
})

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', server: 'typeframe', revision })
})

app.post('/mcp', async (request, response) => {
  const server = createTypeframeServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  try {
    await server.connect(transport)
    await transport.handleRequest(request, response, request.body)
  } catch (error) {
    console.error('MCP request failed:', error)
    if (!response.headersSent) response.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null })
  } finally {
    await transport.close()
    await server.close()
  }
})

app.get('/mcp', (_request, response) => response.status(405).set('Allow', 'POST').send('Method Not Allowed'))
app.delete('/mcp', (_request, response) => response.status(405).set('Allow', 'POST').send('Method Not Allowed'))

app.listen(PORT, HOST, () => {
  console.error(`Typeframe MCP server: http://${HOST}:${PORT}/mcp`)
  console.error(`Typeframe layout bridge: http://${HOST}:${PORT}/api/layout`)
})

if (process.argv.includes('--stdio')) {
  const stdioServer = createTypeframeServer()
  await stdioServer.connect(new StdioServerTransport())
  console.error('Typeframe MCP stdio transport connected')
}
