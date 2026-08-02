export type Canvas = {
  width: number
  height: number
  background: string
}

export type TextAlign = 'left' | 'center' | 'right'

export type TextElement = {
  id: string
  name: string
  text: string
  x: number
  y: number
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  align: TextAlign
  fill: string
  maskPadding: number
}

export type ImageElement = {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  fit: 'cover' | 'contain'
  opacity: number
}

export type PosterLayout = {
  canvas: Canvas
  elements: TextElement[]
  images: ImageElement[]
}

export type RenderMode = 'preview' | 'overlay' | 'mask' | 'background'

export type PresetOption = {
  value: string
  label: string
}

export type PresetGroup = {
  label: string
  options: PresetOption[]
}

type ElementBounds = {
  x: number
  y: number
  width: number
  height: number
}

export const PRESETS: Record<string, Canvas> = {
  poster: { width: 1400, height: 2000, background: '#d9ff43' },
  portrait: { width: 1080, height: 1350, background: '#d9ff43' },
  square: { width: 1080, height: 1080, background: '#d9ff43' },
  story: { width: 1080, height: 1920, background: '#d9ff43' },
  a0: { width: 9933, height: 14043, background: '#d9ff43' },
  a1: { width: 7016, height: 9933, background: '#d9ff43' },
  a2: { width: 4961, height: 7016, background: '#d9ff43' },
  a3: { width: 3508, height: 4961, background: '#d9ff43' },
  a3_plus: { width: 3886, height: 5705, background: '#d9ff43'},
  a4: { width: 2480, height: 3508, background: '#d9ff43' },
  a5: { width: 1748, height: 2480, background: '#d9ff43' },
  a6: { width: 1240, height: 1748, background: '#d9ff43' },
  a7: { width: 874, height: 1240, background: '#d9ff43' },
  a8: { width: 614, height: 874, background: '#d9ff43' },
  a9: { width: 437, height: 614, background: '#d9ff43' },
  a10: { width: 307, height: 437, background: '#d9ff43' },
  b0: { width: 11811, height: 16701, background: '#d9ff43' },
  b1: { width: 8350, height: 11811, background: '#d9ff43' },
  b2: { width: 5906, height: 8350, background: '#d9ff43' },
  b3: { width: 4169, height: 5906, background: '#d9ff43' },
  b4: { width: 2953, height: 4169, background: '#d9ff43' },
  b5: { width: 2079, height: 2953, background: '#d9ff43' },
  b6: { width: 1476, height: 2079, background: '#d9ff43' },
  b7: { width: 1039, height: 1476, background: '#d9ff43' },
  b8: { width: 732, height: 1039, background: '#d9ff43' },
  b9: { width: 520, height: 732, background: '#d9ff43' },
  b10: { width: 366, height: 520, background: '#d9ff43' },
  letter: { width: 2550, height: 3300, background: '#d9ff43' },
  legal: { width: 2550, height: 4200, background: '#d9ff43' },
  tabloid: { width: 3300, height: 5100, background: '#d9ff43' },
  statement: { width: 1650, height: 2550, background: '#d9ff43' },
  executive: { width: 2175, height: 3150, background: '#d9ff43' },
  archA: { width: 2700, height: 3600, background: '#d9ff43' },
  archB: { width: 3600, height: 5400, background: '#d9ff43' },
  archC: { width: 5400, height: 7200, background: '#d9ff43' },
  archD: { width: 7200, height: 10800, background: '#d9ff43' },
  archE: { width: 10800, height: 14400, background: '#d9ff43' },
}

export const PRESET_GROUPS: PresetGroup[] = [
  {
    label: 'Digital',
    options: [
      { value: 'poster', label: 'Poster — 1400 × 2000 px' },
      { value: 'portrait', label: 'Social portrait — 1080 × 1350 px' },
      { value: 'square', label: 'Square — 1080 × 1080 px' },
      { value: 'story', label: 'Story — 1080 × 1920 px' },
    ],
  },
  {
    label: 'ISO A series · 300 DPI',
    options: ['a0', 'a1', 'a2', 'a3', 'a3_plus', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'].map((value) => ({
      value,
      label: `${value.toUpperCase()} — ${PRESETS[value].width} × ${PRESETS[value].height} px`,
    })),
  },
  {
    label: 'ISO B series · 300 DPI',
    options: ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'].map((value) => ({
      value,
      label: `${value.toUpperCase()} — ${PRESETS[value].width} × ${PRESETS[value].height} px`,
    })),
  },
  {
    label: 'North American · 300 DPI',
    options: [
      { value: 'letter', label: 'Letter — 8.5 × 11 in' },
      { value: 'legal', label: 'Legal — 8.5 × 14 in' },
      { value: 'tabloid', label: 'Tabloid — 11 × 17 in' },
      { value: 'statement', label: 'Statement — 5.5 × 8.5 in' },
      { value: 'executive', label: 'Executive — 7.25 × 10.5 in' },
    ],
  },
  {
    label: 'Architectural · 300 DPI',
    options: [
      { value: 'archA', label: 'ARCH A — 9 × 12 in' },
      { value: 'archB', label: 'ARCH B — 12 × 18 in' },
      { value: 'archC', label: 'ARCH C — 18 × 24 in' },
      { value: 'archD', label: 'ARCH D — 24 × 36 in' },
      { value: 'archE', label: 'ARCH E — 36 × 48 in' },
    ],
  },
]

export const FONT_OPTIONS = [
  { label: 'Arial Narrow', value: 'Arial Narrow, Arial, sans-serif' },
  { label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica Neue, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
]

export const DEFAULT_LAYOUT: PosterLayout = {
  canvas: PRESETS.poster,
  images: [],
  elements: [
    {
      id: 'title',
      name: 'Title',
      text: 'FUTURE\nFORMS',
      x: 0.5,
      y: 0.12,
      fontFamily: FONT_OPTIONS[1].value,
      fontSize: 310,
      fontWeight: 900,
      letterSpacing: -8,
      lineHeight: 0.82,
      align: 'center',
      fill: '#111111',
      maskPadding: 64,
    },
    {
      id: 'supporting-line',
      name: 'Supporting line',
      text: 'A STUDY IN SYNTHETIC IMAGINATION — VOL. 01',
      x: 0.065,
      y: 0.47,
      fontFamily: FONT_OPTIONS[2].value,
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: 4,
      lineHeight: 1,
      align: 'left',
      fill: '#111111',
      maskPadding: 28,
    },
  ],
}

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const splitLines = (text: string) => text.split(/\r?\n/).slice(0, 6)
const anchorFor = (align: TextAlign) => align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'

export function getTextBounds(element: TextElement, canvas: Canvas): ElementBounds {
  const lines = splitLines(element.text)
  const longestLine = lines.reduce((longest, line) => line.length > longest.length ? line : longest, '')
  const estimatedWidth = Math.max(element.fontSize * 0.5, longestLine.length * element.fontSize * 0.56 + Math.max(0, longestLine.length - 1) * element.letterSpacing)
  const width = Math.min(canvas.width, Math.max(1, estimatedWidth))
  const height = Math.max(1, lines.length * element.fontSize * element.lineHeight)
  const anchorX = element.x * canvas.width
  const x = element.align === 'center' ? anchorX - width / 2 : element.align === 'right' ? anchorX - width : anchorX
  return { x, y: element.y * canvas.height, width, height }
}

function maskBounds(element: TextElement, canvas: Canvas): ElementBounds {
  const bounds = getTextBounds(element, canvas)
  const left = Math.max(0, bounds.x - element.maskPadding)
  const top = Math.max(0, bounds.y - element.maskPadding)
  const right = Math.min(canvas.width, bounds.x + bounds.width + element.maskPadding)
  const bottom = Math.min(canvas.height, bounds.y + bounds.height + element.maskPadding)
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

export function validateLayout(layout: PosterLayout): string[] {
  const errors: string[] = []
  if (layout.canvas.width < 128 || layout.canvas.height < 128) errors.push('Canvas must be at least 128 px per side.')
  if (layout.elements.length === 0) errors.push('Add at least one text element.')
  layout.elements.forEach((element) => {
    if (!element.text.trim()) errors.push(`${element.name} cannot be empty.`)
    if (element.x < 0 || element.x > 1 || element.y < 0 || element.y > 1) errors.push(`${element.name} coordinates must be between 0 and 1.`)
    const bounds = getTextBounds(element, layout.canvas)
    if (bounds.x < 0 || bounds.x + bounds.width > layout.canvas.width || bounds.y + bounds.height > layout.canvas.height) errors.push(`${element.name} extends beyond the canvas.`)
  })
  layout.images.forEach((image) => {
    if (image.x < 0 || image.y < 0 || image.width <= 0 || image.height <= 0 || image.x + image.width > 1 || image.y + image.height > 1) errors.push(`${image.name} must fit inside normalized canvas bounds.`)
  })
  return errors
}

function buildTextMarkup(element: TextElement, canvas: Canvas) {
  const x = element.x * canvas.width
  const top = element.y * canvas.height
  const lineHeight = element.fontSize * element.lineHeight
  return splitLines(element.text).map((line, index) => (
    `<text data-element-id="${escapeXml(element.id)}" x="${x}" y="${top + element.fontSize * 0.78 + index * lineHeight}" text-anchor="${anchorFor(element.align)}" font-family="${escapeXml(element.fontFamily)}" font-size="${element.fontSize}" font-weight="${element.fontWeight}" letter-spacing="${element.letterSpacing}" fill="${element.fill}">${escapeXml(line)}</text>`
  )).join('')
}

export function buildPosterSvg(layout: PosterLayout, mode: RenderMode, guides = false): string {
  const { width, height, background } = layout.canvas
  const textMarkup = layout.elements.map((element) => buildTextMarkup(element, layout.canvas)).join('')
  const backdrop = `
    <rect width="${width}" height="${height}" fill="${background}"/>
    <circle cx="${width * 0.63}" cy="${height * 0.61}" r="${width * 0.34}" fill="#fe6947"/>
    <path d="M0 ${height * 0.78} L${width * 0.42} ${height * 0.56} L${width} ${height * 0.82} V${height} H0Z" fill="#181818"/>
    <path d="M${width * 0.54} ${height * 0.46} C${width * 0.68} ${height * 0.34}, ${width * 0.83} ${height * 0.48}, ${width * 0.77} ${height * 0.68} C${width * 0.73} ${height * 0.84}, ${width * 0.45} ${height * 0.84}, ${width * 0.42} ${height * 0.65} C${width * 0.4} ${height * 0.55}, ${width * 0.46} ${height * 0.51}, ${width * 0.54} ${height * 0.46}Z" fill="#786cff"/>
  `

  if (mode === 'background') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${backdrop}</svg>`
  }

  if (mode === 'mask') {
    const masks = layout.elements.map((element) => {
      const bounds = maskBounds(element, layout.canvas)
      return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="${Math.max(6, element.maskPadding / 3)}" fill="#fff"/>`
    }).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#000"/>${masks}</svg>`
  }

  const imageGuides = mode === 'preview' ? layout.images.map((image) => {
    const x = image.x * width
    const y = image.y * height
    const imageWidth = image.width * width
    const imageHeight = image.height * height
    return `<g data-image-id="${escapeXml(image.id)}" opacity="${image.opacity}"><rect x="${x}" y="${y}" width="${imageWidth}" height="${imageHeight}" fill="#c9c9c3" stroke="#111" stroke-width="3" stroke-dasharray="14 10"/><circle cx="${x + imageWidth * 0.5}" cy="${y + imageHeight * 0.3}" r="${Math.min(imageWidth, imageHeight) * 0.14}" fill="#777770"/><path d="M${x + imageWidth * 0.2} ${y + imageHeight * 0.88} Q${x + imageWidth * 0.5} ${y + imageHeight * 0.42} ${x + imageWidth * 0.8} ${y + imageHeight * 0.88}Z" fill="#777770"/><text x="${x + 14}" y="${y + 28}" font-family="monospace" font-size="18" fill="#111">${escapeXml(image.name.toUpperCase())}</text></g>`
  }).join('') : ''
  const guideMarkup = guides ? `
    <g fill="none" stroke="#111" stroke-width="2" opacity=".42" stroke-dasharray="12 12">
      <rect x="${width * 0.05}" y="${height * 0.035}" width="${width * 0.9}" height="${height * 0.93}"/>
      <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}"/>
      ${layout.elements.map((element) => {
        const bounds = maskBounds(element, layout.canvas)
        return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="${Math.max(6, element.maskPadding / 3)}"/>`
      }).join('')}
      ${layout.images.map((image) => `<rect x="${image.x * width}" y="${image.y * height}" width="${image.width * width}" height="${image.height * height}" stroke="#2767c5"/>`).join('')}
    </g>
    <text x="${width * 0.05}" y="${height * 0.985}" font-family="monospace" font-size="18" letter-spacing="3" fill="#111" opacity=".6">DRAG TEXT ANCHORS / NORMALIZED POSITIONING</text>
  ` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${mode === 'preview' ? backdrop : ''}${imageGuides}${textMarkup}${guideMarkup}</svg>`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadSvg(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename)
}

export function downloadJson(layout: PosterLayout, filename: string) {
  downloadBlob(new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' }), filename)
}

export async function downloadPng(svg: string, filename: string, width: number, height: number) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas rendering is not available in this browser.')
    context.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG export failed.')), 'image/png'))
    downloadBlob(blob, filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}
