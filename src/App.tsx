import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import './App.css'
import {
  DEFAULT_LAYOUT,
  FONT_OPTIONS,
  PRESET_GROUPS,
  PRESETS,
  buildPosterSvg,
  downloadJson,
  downloadPng,
  downloadSvg,
  getTextBounds,
  validateLayout,
  type ImageElement,
  type PosterLayout,
  type TextElement,
} from './template'

type NumberFieldProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

function NumberField({ label, value, min, max, step = 1, suffix, onChange }: NumberFieldProps) {
  return (
    <label className="field number-field">
      <span>{label}</span>
      <span className="number-input">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix && <small>{suffix}</small>}
      </span>
    </label>
  )
}

const clampCoordinate = (value: number) => Math.min(1, Math.max(0, Math.round(value * 1000) / 1000))

function App() {
  const [layout, setLayout] = useState<PosterLayout>(DEFAULT_LAYOUT)
  const [selectedId, setSelectedId] = useState(DEFAULT_LAYOUT.elements[0].id)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [showGuides, setShowGuides] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [mcpStatus, setMcpStatus] = useState<'connected' | 'offline'>('offline')
  const [referenceImage, setReferenceImage] = useState<{ name: string, url: string } | null>(null)
  const [referenceOpacity, setReferenceOpacity] = useState(1)
  const [referenceFit, setReferenceFit] = useState<'cover' | 'contain'>('cover')
  const [imageSources, setImageSources] = useState<Record<string, { name: string, url: string }>>({})
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null)
  const [resizingImageId, setResizingImageId] = useState<string | null>(null)
  const [resizingTextId, setResizingTextId] = useState<string | null>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const mcpRevision = useRef(0)
  const referenceUrl = useRef<string | null>(null)
  const imageUrls = useRef(new Set<string>())
  const imageDragOffset = useRef({ x: 0, y: 0 })
  const imageResizeStart = useRef({ clientX: 0, clientY: 0, width: 0, height: 0 })
  const textResizeStart = useRef({ clientX: 0, clientY: 0, width: 1, height: 1, fontSize: 8 })
  const selected = layout.elements.find((element) => element.id === selectedId) ?? layout.elements[0]
  const selectedImage = layout.images.find((image) => image.id === selectedImageId)
  const selectedTextBounds = selected ? getTextBounds(selected, layout.canvas) : null
  const errors = validateLayout(layout)

  useEffect(() => {
    let active = true
    let timer: number
    const bridgeUrl = import.meta.env.VITE_MCP_BRIDGE_URL ?? 'http://127.0.0.1:7331'

    const synchronize = async () => {
      try {
        const response = await fetch(`${bridgeUrl}/api/layout`)
        if (!response.ok) throw new Error(`MCP bridge returned ${response.status}`)
        const payload = await response.json() as { revision: number, layout: PosterLayout }
        if (!active) return
        setMcpStatus('connected')
        if (payload.revision > mcpRevision.current) {
          mcpRevision.current = payload.revision
          setLayout(payload.layout)
          setSelectedId((current) => payload.layout.elements.some((element) => element.id === current) ? current : payload.layout.elements[0].id)
        }
      } catch {
        if (active) setMcpStatus('offline')
      } finally {
        if (active) timer = window.setTimeout(synchronize, 1200)
      }
    }

    void synchronize()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => () => {
    if (referenceUrl.current) URL.revokeObjectURL(referenceUrl.current)
    imageUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const updateLayout = <K extends keyof PosterLayout>(key: K, value: PosterLayout[K]) => {
    setLayout((current) => ({ ...current, [key]: value }))
  }

  const updateElement = <K extends keyof TextElement>(id: string, key: K, value: TextElement[K]) => {
    setLayout((current) => ({
      ...current,
      elements: current.elements.map((element) => element.id === id ? { ...element, [key]: value } : element),
    }))
  }

  const updateImage = <K extends keyof ImageElement>(id: string, key: K, value: ImageElement[K]) => {
    setLayout((current) => ({
      ...current,
      images: current.images.map((image) => image.id === id ? { ...image, [key]: value } : image),
    }))
  }

  const addElement = () => {
    const id = `text-${Date.now()}`
    const element: TextElement = {
      id,
      name: `Text ${layout.elements.length + 1}`,
      text: 'NEW TEXT',
      x: 0.5,
      y: 0.55,
      fontFamily: FONT_OPTIONS[2].value,
      fontSize: 96,
      fontWeight: 700,
      letterSpacing: 0,
      lineHeight: 1,
      align: 'center',
      fill: '#111111',
      maskPadding: 40,
    }
    updateLayout('elements', [...layout.elements, element])
    setSelectedId(id)
  }

  const removeSelected = () => {
    if (!selected || layout.elements.length === 1) return
    const remaining = layout.elements.filter((element) => element.id !== selected.id)
    updateLayout('elements', remaining)
    setSelectedId(remaining[0].id)
  }

  const addImage = () => {
    const id = `image-${Date.now()}`
    const image: ImageElement = {
      id,
      name: `Subject ${layout.images.length + 1}`,
      x: 0.38,
      y: 0.32,
      width: 0.5,
      height: 0.6,
      fit: 'contain',
      opacity: 1,
    }
    updateLayout('images', [...layout.images, image])
    setSelectedImageId(id)
  }

  const removeSelectedImage = () => {
    if (!selectedImage) return
    const source = imageSources[selectedImage.id]
    if (source) {
      URL.revokeObjectURL(source.url)
      imageUrls.current.delete(source.url)
      setImageSources((current) => {
        const next = { ...current }
        delete next[selectedImage.id]
        return next
      })
    }
    updateLayout('images', layout.images.filter((image) => image.id !== selectedImage.id))
    setSelectedImageId(null)
  }

  const loadImageSource = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedImage) return
    const previous = imageSources[selectedImage.id]
    if (previous) {
      URL.revokeObjectURL(previous.url)
      imageUrls.current.delete(previous.url)
    }
    const url = URL.createObjectURL(file)
    imageUrls.current.add(url)
    setImageSources((current) => ({ ...current, [selectedImage.id]: { name: file.name, url } }))
    event.target.value = ''
  }

  const clearImageSource = () => {
    if (!selectedImage) return
    const source = imageSources[selectedImage.id]
    if (!source) return
    URL.revokeObjectURL(source.url)
    imageUrls.current.delete(source.url)
    setImageSources((current) => {
      const next = { ...current }
      delete next[selectedImage.id]
      return next
    })
  }

  const exportPng = async (mode: 'preview' | 'overlay' | 'mask') => {
    setExporting(mode)
    try {
      await downloadPng(buildPosterSvg(layout, mode, mode === 'preview' && showGuides), `typeframe-${mode}.png`, layout.canvas.width, layout.canvas.height)
    } finally {
      setExporting(null)
    }
  }

  const applyPreset = (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS[event.target.value]
    if (preset) updateLayout('canvas', { ...preset, background: layout.canvas.background })
  }

  const setOrientation = (orientation: 'portrait' | 'landscape') => {
    const { width, height } = layout.canvas
    const shouldSwap = orientation === 'portrait' ? width > height : height > width
    if (shouldSwap) updateLayout('canvas', { ...layout.canvas, width: height, height: width })
  }

  const loadReferenceImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (referenceUrl.current) URL.revokeObjectURL(referenceUrl.current)
    const url = URL.createObjectURL(file)
    referenceUrl.current = url
    setReferenceImage({ name: file.name, url })
    event.target.value = ''
  }

  const clearReferenceImage = () => {
    if (referenceUrl.current) URL.revokeObjectURL(referenceUrl.current)
    referenceUrl.current = null
    setReferenceImage(null)
  }

  const positionElement = (id: string, clientX: number, clientY: number) => {
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return
    updateElement(id, 'x', clampCoordinate((clientX - rect.left) / rect.width))
    updateElement(id, 'y', clampCoordinate((clientY - rect.top) / rect.height))
  }

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedId(id)
    setDraggingId(id)
    positionElement(id, event.clientX, event.clientY)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (draggingId === id) positionElement(id, event.clientX, event.clientY)
  }

  const startImageDrag = (event: ReactPointerEvent<HTMLDivElement>, image: ImageElement) => {
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return
    event.currentTarget.setPointerCapture(event.pointerId)
    imageDragOffset.current = {
      x: (event.clientX - rect.left) / rect.width - image.x,
      y: (event.clientY - rect.top) / rect.height - image.y,
    }
    setSelectedImageId(image.id)
    setDraggingImageId(image.id)
  }

  const moveImageDrag = (event: ReactPointerEvent<HTMLDivElement>, image: ImageElement) => {
    if (draggingImageId !== image.id) return
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(1 - image.width, Math.max(0, (event.clientX - rect.left) / rect.width - imageDragOffset.current.x))
    const y = Math.min(1 - image.height, Math.max(0, (event.clientY - rect.top) / rect.height - imageDragOffset.current.y))
    setLayout((current) => ({
      ...current,
      images: current.images.map((item) => item.id === image.id ? { ...item, x: clampCoordinate(x), y: clampCoordinate(y) } : item),
    }))
  }

  const startImageResize = (event: ReactPointerEvent<HTMLButtonElement>, image: ImageElement) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    imageResizeStart.current = { clientX: event.clientX, clientY: event.clientY, width: image.width, height: image.height }
    setSelectedImageId(image.id)
    setResizingImageId(image.id)
  }

  const moveImageResize = (event: ReactPointerEvent<HTMLButtonElement>, image: ImageElement) => {
    if (resizingImageId !== image.id) return
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return
    let width = imageResizeStart.current.width + (event.clientX - imageResizeStart.current.clientX) / rect.width
    let height = imageResizeStart.current.height + (event.clientY - imageResizeStart.current.clientY) / rect.height
    if (event.shiftKey) {
      const widthScale = width / imageResizeStart.current.width
      const heightScale = height / imageResizeStart.current.height
      const scale = Math.abs(widthScale - 1) > Math.abs(heightScale - 1) ? widthScale : heightScale
      width = imageResizeStart.current.width * scale
      height = imageResizeStart.current.height * scale
    }
    width = Math.min(1 - image.x, Math.max(0.03, width))
    height = Math.min(1 - image.y, Math.max(0.03, height))
    setLayout((current) => ({
      ...current,
      images: current.images.map((item) => item.id === image.id ? { ...item, width: clampCoordinate(width), height: clampCoordinate(height) } : item),
    }))
  }

  const startTextResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selected || !selectedTextBounds) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = posterRef.current?.getBoundingClientRect()
    if (!rect) return
    textResizeStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: Math.max(1, selectedTextBounds.width / layout.canvas.width * rect.width),
      height: Math.max(1, selectedTextBounds.height / layout.canvas.height * rect.height),
      fontSize: selected.fontSize,
    }
    setResizingTextId(selected.id)
  }

  const moveTextResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selected || resizingTextId !== selected.id) return
    const horizontalScale = (event.clientX - textResizeStart.current.clientX) / textResizeStart.current.width
    const verticalScale = (event.clientY - textResizeStart.current.clientY) / textResizeStart.current.height
    const delta = Math.abs(horizontalScale) > Math.abs(verticalScale) ? horizontalScale : verticalScale
    const fontSize = Math.min(2000, Math.max(8, Math.round(textResizeStart.current.fontSize * (1 + delta))))
    updateElement(selected.id, 'fontSize', fontSize)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Typeframe home"><span className="brand-mark">TF</span><span>TYPEFRAME</span></a>
        <div className="project-meta"><span className={`status-dot ${mcpStatus}`} />MCP {mcpStatus}<span className="divider" />{layout.canvas.width} × {layout.canvas.height}</div>
        <button className="primary-action" onClick={() => exportPng('preview')} disabled={Boolean(exporting)}>{exporting === 'preview' ? 'Rendering…' : 'Export preview'}</button>
      </header>

      <section className="workspace">
        <aside className="controls">
          <div className="panel-heading"><div><p className="eyebrow">Template controls</p><h1>Poster system</h1></div><span className="version">01</span></div>

          <div className="control-section">
            <h2>Canvas</h2>
            <label className="field"><span>Format</span><select onChange={applyPreset} defaultValue="poster">{PRESET_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>)}</select></label>
            <div className="orientation-switch" aria-label="Page orientation">
              <button className={layout.canvas.height >= layout.canvas.width ? 'active' : ''} onClick={() => setOrientation('portrait')}>Portrait</button>
              <button className={layout.canvas.width > layout.canvas.height ? 'active' : ''} onClick={() => setOrientation('landscape')}>Landscape</button>
            </div>
            <div className="field-pair">
              <NumberField label="Width" value={layout.canvas.width} min={128} max={20000} onChange={(width) => updateLayout('canvas', { ...layout.canvas, width })} />
              <NumberField label="Height" value={layout.canvas.height} min={128} max={20000} onChange={(height) => updateLayout('canvas', { ...layout.canvas, height })} />
            </div>
            <label className="field color-field"><span>Ground</span><span><input type="color" value={layout.canvas.background} onChange={(event) => updateLayout('canvas', { ...layout.canvas, background: event.target.value })} /><code>{layout.canvas.background.toUpperCase()}</code></span></label>
            <div className="reference-control">
              <div className="reference-heading"><span>Reference image</span><small>Editor only</small></div>
              {referenceImage ? (
                <div className="reference-file"><span title={referenceImage.name}>{referenceImage.name}</span><button onClick={clearReferenceImage}>Remove</button></div>
              ) : (
                <label className="reference-upload">Choose image<input type="file" accept="image/*" onChange={loadReferenceImage} /></label>
              )}
              {referenceImage && <>
                <label className="reference-range"><span>Opacity</span><input type="range" min="0.1" max="1" step="0.05" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} /><small>{Math.round(referenceOpacity * 100)}%</small></label>
                <div className="orientation-switch reference-fit" aria-label="Reference image fit">
                  <button className={referenceFit === 'cover' ? 'active' : ''} onClick={() => setReferenceFit('cover')}>Fill</button>
                  <button className={referenceFit === 'contain' ? 'active' : ''} onClick={() => setReferenceFit('contain')}>Fit</button>
                </div>
              </>}
            </div>
          </div>

          <div className="control-section element-section">
            <div className="section-title"><h2>Text elements</h2><button className="add-element" onClick={addElement}>+ Add</button></div>
            <div className="element-list">
              {layout.elements.map((element, index) => (
                <button key={element.id} className={`element-item ${element.id === selected?.id ? 'selected' : ''}`} onClick={() => setSelectedId(element.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{element.name}</strong>
                  <small>{element.x.toFixed(3)}, {element.y.toFixed(3)}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="control-section element-section image-section">
            <div className="section-title"><h2>Image guides</h2><button className="add-element image-add" onClick={addImage}>+ Add</button></div>
            {layout.images.length === 0 ? <p className="empty-layers">Add a subject or character placement guide.</p> : <div className="element-list">
              {layout.images.map((image, index) => (
                <button key={image.id} className={`element-item image-item ${image.id === selectedImage?.id ? 'selected' : ''}`} onClick={() => setSelectedImageId(image.id)}>
                  <span>I{String(index + 1).padStart(2, '0')}</span>
                  <strong>{image.name}</strong>
                  <small>{image.x.toFixed(3)}, {image.y.toFixed(3)}</small>
                </button>
              ))}
            </div>}
          </div>

          {selectedImage && <div className="control-section image-controls">
            <div className="section-title"><h2>Selected image</h2><button className="remove-element" onClick={removeSelectedImage}>Remove</button></div>
            <label className="field"><span>Guide name</span><input type="text" value={selectedImage.name} maxLength={30} onChange={(event) => updateImage(selectedImage.id, 'name', event.target.value)} /></label>
            <div className="image-source-control">
              {imageSources[selectedImage.id] ? <div className="reference-file"><span title={imageSources[selectedImage.id].name}>{imageSources[selectedImage.id].name}</span><button onClick={clearImageSource}>Clear</button></div> : <label className="reference-upload">Attach local image<input type="file" accept="image/*" onChange={loadImageSource} /></label>}
              <small>The file stays local and is not included in MCP or production exports.</small>
            </div>
            <div className="field-pair coordinate-fields">
              <NumberField label="X position" value={selectedImage.x} min={0} max={1} step={0.001} onChange={(value) => updateImage(selectedImage.id, 'x', clampCoordinate(Math.min(value, 1 - selectedImage.width)))} />
              <NumberField label="Y position" value={selectedImage.y} min={0} max={1} step={0.001} onChange={(value) => updateImage(selectedImage.id, 'y', clampCoordinate(Math.min(value, 1 - selectedImage.height)))} />
            </div>
            <div className="field-pair">
              <NumberField label="Width" value={selectedImage.width} min={0.01} max={1 - selectedImage.x} step={0.01} onChange={(value) => updateImage(selectedImage.id, 'width', clampCoordinate(Math.min(value, 1 - selectedImage.x)))} />
              <NumberField label="Height" value={selectedImage.height} min={0.01} max={1 - selectedImage.y} step={0.01} onChange={(value) => updateImage(selectedImage.id, 'height', clampCoordinate(Math.min(value, 1 - selectedImage.y)))} />
            </div>
            <label className="field"><span>Image fit</span><select value={selectedImage.fit} onChange={(event) => updateImage(selectedImage.id, 'fit', event.target.value as ImageElement['fit'])}><option value="contain">Contain</option><option value="cover">Cover</option></select></label>
            <NumberField label="Opacity" value={selectedImage.opacity} min={0.1} max={1} step={0.05} onChange={(value) => updateImage(selectedImage.id, 'opacity', value)} />
            <p className="coordinate-hint">Drag the image box directly on the artboard.</p>
          </div>}

          {selected && <div className="control-section">
            <div className="section-title"><h2>Selected text</h2><button className="remove-element" onClick={removeSelected} disabled={layout.elements.length === 1}>Remove</button></div>
            <label className="field"><span>Layer name</span><input type="text" value={selected.name} maxLength={30} onChange={(event) => updateElement(selected.id, 'name', event.target.value)} /></label>
            <label className="field stacked"><span>Content</span><textarea value={selected.text} rows={2} maxLength={120} onChange={(event) => updateElement(selected.id, 'text', event.target.value)} /></label>
            <div className="field-pair coordinate-fields">
              <NumberField label="X position" value={selected.x} min={0} max={1} step={0.001} onChange={(value) => updateElement(selected.id, 'x', clampCoordinate(value))} />
              <NumberField label="Y position" value={selected.y} min={0} max={1} step={0.001} onChange={(value) => updateElement(selected.id, 'y', clampCoordinate(value))} />
            </div>
            <p className="coordinate-hint">Normalized coordinates · drag the numbered anchor on canvas</p>
            <label className="field"><span>Alignment</span><select value={selected.align} onChange={(event) => updateElement(selected.id, 'align', event.target.value as TextElement['align'])}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label className="field"><span>Typeface</span><select value={selected.fontFamily} onChange={(event) => updateElement(selected.id, 'fontFamily', event.target.value)}>{FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</select></label>
            <div className="field-pair">
              <NumberField label="Size" value={selected.fontSize} min={8} max={900} onChange={(value) => updateElement(selected.id, 'fontSize', value)} />
              <NumberField label="Weight" value={selected.fontWeight} min={100} max={900} step={100} onChange={(value) => updateElement(selected.id, 'fontWeight', value)} />
            </div>
            <div className="field-pair">
              <NumberField label="Tracking" value={selected.letterSpacing} min={-40} max={100} onChange={(value) => updateElement(selected.id, 'letterSpacing', value)} />
              <NumberField label="Line height" value={selected.lineHeight} min={0.5} max={2} step={0.05} onChange={(value) => updateElement(selected.id, 'lineHeight', value)} />
            </div>
            <label className="field color-field"><span>Text</span><span><input type="color" value={selected.fill} onChange={(event) => updateElement(selected.id, 'fill', event.target.value)} /><code>{selected.fill.toUpperCase()}</code></span></label>
            <NumberField label="Mask padding" value={selected.maskPadding} min={0} max={400} suffix="px" onChange={(value) => updateElement(selected.id, 'maskPadding', value)} />
            <label className="toggle-field"><span><strong>Layout guides</strong><small>Preview only</small></span><input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} /></label>
          </div>}
        </aside>

        <section className="stage" aria-label="Poster preview">
          <div className="stage-label"><span>ARTBOARD / 01</span><span>{layout.elements.length} TEXT / {layout.images.length} IMAGE</span></div>
          <div ref={posterRef} className="poster-frame" style={{ aspectRatio: `${layout.canvas.width} / ${layout.canvas.height}`, background: layout.canvas.background }}>
            {referenceImage && <img className="reference-image" src={referenceImage.url} alt="Local poster reference" style={{ objectFit: referenceFit, opacity: referenceOpacity }} />}
            {!referenceImage && <div className="poster-background" dangerouslySetInnerHTML={{ __html: buildPosterSvg(layout, 'background') }} />}
            <div className="image-guide-layer">
              {layout.images.map((image, index) => {
                const source = imageSources[image.id]
                return <div
                  key={image.id}
                  className={`image-guide ${selectedImage?.id === image.id ? 'selected' : ''} ${draggingImageId === image.id ? 'dragging' : ''}`}
                  style={{ left: `${image.x * 100}%`, top: `${image.y * 100}%`, width: `${image.width * 100}%`, height: `${image.height * 100}%` }}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(event) => startImageDrag(event, image)}
                  onPointerMove={(event) => moveImageDrag(event, image)}
                  onPointerUp={() => setDraggingImageId(null)}
                  onPointerCancel={() => setDraggingImageId(null)}
                >
                  <span className="image-guide-content" style={{ opacity: image.opacity }}>
                    {source ? <img src={source.url} alt="" style={{ objectFit: image.fit }} /> : <span className="subject-placeholder"><i /><b /></span>}
                  </span>
                  <span className="image-guide-label">I{index + 1} · {image.name}</span>
                  <button
                    className="resize-handle image-resize-handle"
                    aria-label={`Resize ${image.name}`}
                    title="Resize image guide; hold Shift to preserve proportions"
                    onPointerDown={(event) => startImageResize(event, image)}
                    onPointerMove={(event) => moveImageResize(event, image)}
                    onPointerUp={() => setResizingImageId(null)}
                    onPointerCancel={() => setResizingImageId(null)}
                  />
                </div>
              })}
            </div>
            <div className="poster-svg" dangerouslySetInnerHTML={{ __html: buildPosterSvg(layout, 'overlay', showGuides) }} />
            <div className="drag-layer">
              {layout.elements.map((element, index) => (
                <button
                  key={element.id}
                  className={`drag-anchor ${selected?.id === element.id ? 'selected' : ''} ${draggingId === element.id ? 'dragging' : ''}`}
                  style={{ left: `${element.x * 100}%`, top: `${element.y * 100}%` }}
                  aria-label={`Move ${element.name}`}
                  title={`Drag ${element.name}`}
                  onPointerDown={(event) => startDrag(event, element.id)}
                  onPointerMove={(event) => moveDrag(event, element.id)}
                  onPointerUp={() => setDraggingId(null)}
                  onPointerCancel={() => setDraggingId(null)}
                >{index + 1}</button>
              ))}
              {selected && selectedTextBounds && <div
                className={`text-resize-box ${resizingTextId === selected.id ? 'resizing' : ''}`}
                style={{
                  left: `${selectedTextBounds.x / layout.canvas.width * 100}%`,
                  top: `${selectedTextBounds.y / layout.canvas.height * 100}%`,
                  width: `${selectedTextBounds.width / layout.canvas.width * 100}%`,
                  height: `${selectedTextBounds.height / layout.canvas.height * 100}%`,
                }}
              >
                <span className="text-size-label">{selected.fontSize}px</span>
                <button
                  className="resize-handle text-resize-handle"
                  aria-label={`Resize ${selected.name}`}
                  title="Drag to scale text"
                  onPointerDown={startTextResize}
                  onPointerMove={moveTextResize}
                  onPointerUp={() => setResizingTextId(null)}
                  onPointerCancel={() => setResizingTextId(null)}
                />
              </div>}
            </div>
          </div>
          {errors.length > 0 && <div className="validation" role="status"><strong>Layout check</strong>{errors.map((error) => <span key={error}>{error}</span>)}</div>}
        </section>

        <aside className="exports">
          <div className="panel-heading compact"><div><p className="eyebrow">Output stack</p><h2>Production files</h2></div><span className="output-count">05</span></div>
          <p className="export-intro">Text layers and image-guide bounds are preserved; local image files remain reference-only.</p>
          <button className="export-card" onClick={() => exportPng('overlay')} disabled={Boolean(exporting)}><span className="file-icon transparent-grid">Aa</span><span><strong>Typography overlay</strong><small>Transparent PNG</small></span><b>↓</b></button>
          <button className="export-card" onClick={() => exportPng('mask')} disabled={Boolean(exporting)}><span className="file-icon mask-icon" /><span><strong>Protected-area mask</strong><small>Black / white PNG</small></span><b>↓</b></button>
          <button className="export-card" onClick={() => downloadSvg(buildPosterSvg(layout, 'overlay'), 'typeframe-template.svg')}><span className="file-icon svg-icon">&lt;/&gt;</span><span><strong>Vector template</strong><small>Editable SVG</small></span><b>↓</b></button>
          <button className="export-card" onClick={() => downloadJson(layout, 'typeframe-layout.json')}><span className="file-icon json-icon">{'{ }'}</span><span><strong>Layout document</strong><small>Structured JSON</small></span><b>↓</b></button>
          <button className="export-card" onClick={() => exportPng('preview')} disabled={Boolean(exporting)}><span className="file-icon preview-icon" /><span><strong>Composition guide</strong><small>Preview PNG</small></span><b>↓</b></button>
          <div className="pipeline-note"><span>Next</span><p>Use the protected mask in Krea or ComfyUI, then place the typography overlay above the generated artwork.</p></div>
        </aside>
      </section>
    </main>
  )
}

export default App
