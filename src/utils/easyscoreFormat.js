// Formato spartito "tab-sala" esportato da EasyScore Configurator.
// Specifica: formato-easyscore.md

export const TAB_SALA_KIND = 'tab-sala'

const MIN_LINE_W = 0.02
const MIN_LINE_H = 0.015
const MIN_NOTE_W = 0.02
const MIN_NOTE_H = 0.015
const MAX_NOTE_TEXT = 400
const DEFAULT_BEATS = 8
const MAX_BEATS = 128
const DEFAULT_BPM = 120
const MIN_BPM = 30
const MAX_BPM = 300
const MAX_PRECOUNT = 32

export const isEasyScoreFileName = (name = '') => name.toLowerCase().endsWith('.json')

export const isTabSalaDocument = (data) =>
  !!data && typeof data === 'object' && data.kind === TAB_SALA_KIND

const toNumber = (value) => {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeLine = (raw) => {
  if (!raw || typeof raw !== 'object') return null

  const x = toNumber(raw.x)
  const y = toNumber(raw.y)
  let w = toNumber(raw.w)
  let h = toNumber(raw.h)
  if (x === null || y === null || w === null || h === null) return null

  w = Math.min(w, 1)
  h = Math.min(h, 1)
  if (w < MIN_LINE_W || h < MIN_LINE_H) return null

  const beatsRaw = toNumber(raw.beats)
  const beats = beatsRaw === null ? DEFAULT_BEATS : clamp(Math.round(beatsRaw), 1, MAX_BEATS)

  const highlightRaw = toNumber(raw.highlight)
  const highlight = highlightRaw === null ? beats : clamp(Math.round(highlightRaw), 1, beats)

  // Il rettangolo resta dentro la pagina: x + w e y + h non superano 1
  return {
    x: clamp(x, 0, 1 - w),
    y: clamp(y, 0, 1 - h),
    w,
    h,
    beats,
    highlight
  }
}

const normalizeNote = (raw) => {
  if (!raw || typeof raw !== 'object') return null

  const x = toNumber(raw.x)
  const y = toNumber(raw.y)
  let w = toNumber(raw.w)
  let h = toNumber(raw.h)
  if (x === null || y === null || w === null || h === null) return null

  w = Math.min(w, 1)
  h = Math.min(h, 1)
  if (w < MIN_NOTE_W || h < MIN_NOTE_H) return null

  const text = typeof raw.text === 'string' ? raw.text.slice(0, MAX_NOTE_TEXT) : ''
  if (!text.trim()) return null

  return {
    x: clamp(x, 0, 1 - w),
    y: clamp(y, 0, 1 - h),
    w,
    h,
    text
  }
}

const decodePageImage = (page, pageNumber) => {
  if (typeof page.image !== 'string') {
    throw new Error(`pagina ${pageNumber}: immagine mancante`)
  }
  const base64 = page.image.replace(/\s+/g, '')
  try {
    if (!base64 || atob(base64).length === 0) throw new Error('vuota')
  } catch {
    throw new Error(`pagina ${pageNumber}: immagine Base64 non valida`)
  }
  const type = typeof page.type === 'string' && page.type.startsWith('image/')
    ? page.type
    : 'image/png'
  return `data:${type};base64,${base64}`
}

/**
 * Valida un documento tab-sala e lo converte nelle pagine usate dall'app.
 * Lancia un Error con un messaggio leggibile se il file va rifiutato.
 */
export const parseTabSala = (data) => {
  if (!isTabSalaDocument(data)) {
    throw new Error('non è un file EasyScore (kind diverso da "tab-sala")')
  }
  if (!Array.isArray(data.pages) || data.pages.length === 0) {
    throw new Error('nessuna pagina presente')
  }

  return data.pages.map((page, index) => {
    const pageNumber = index + 1
    if (!page || typeof page !== 'object') {
      throw new Error(`pagina ${pageNumber} non valida`)
    }
    if (!Array.isArray(page.lines)) {
      throw new Error(`pagina ${pageNumber}: "lines" mancante`)
    }
    return {
      name: typeof page.name === 'string' ? page.name : `Pagina ${pageNumber}`,
      url: decodePageImage(page, pageNumber),
      // L'ordine dei righi è quello di lettura: non va cambiato
      lines: page.lines.map(normalizeLine).filter(Boolean),
      // Gli appunti sono facoltativi e non entrano nella numerazione dei beat
      notes: Array.isArray(page.notes) ? page.notes.map(normalizeNote).filter(Boolean) : []
    }
  })
}

/** BPM del file (campo "bpm"), limitato all'intervallo del metronomo. Se manca: 120. */
export const readTabSalaBpm = (data) => {
  const bpm = toNumber(data?.bpm)
  return bpm === null || bpm <= 0 ? DEFAULT_BPM : clamp(Math.round(bpm), MIN_BPM, MAX_BPM)
}

/** Click di conteggio prima dell'evidenziazione (campo "precount"). Se manca: 0. */
export const readTabSalaPrecount = (data) => {
  const precount = toNumber(data?.precount)
  return precount === null || precount <= 0 ? 0 : clamp(Math.round(precount), 0, MAX_PRECOUNT)
}

const stripEasyScoreExtension = (fileName) =>
  fileName.replace(/\.easyscore\.json$/i, '').replace(/\.json$/i, '')

/** Crea uno spartito della scaletta a partire da un documento tab-sala. */
export const createTabSalaScore = (data, fileName, id) => {
  const pages = parseTabSala(data)
  return {
    id,
    name: stripEasyScoreExtension(fileName),
    kind: TAB_SALA_KIND,
    pages,
    // Prima pagina come anteprima/compatibilità con gli spartiti immagine
    base64: pages[0].url,
    url: pages[0].url,
    bpm: readTabSalaBpm(data),
    precount: readTabSalaPrecount(data),
    zoom: 100
  }
}

/**
 * Numerazione globale dei beat: parte da 1 e prosegue tra righi e pagine
 * nell'ordine dell'array.
 */
export const buildBeatMap = (pages = []) => {
  const lines = []
  let nextBeat = 1
  pages.forEach((page, pageIndex) => {
    page.lines.forEach((line, lineIndex) => {
      lines.push({ pageIndex, lineIndex, line, firstBeat: nextBeat })
      nextBeat += line.beats
    })
  })
  return { lines, totalBeats: nextBeat - 1 }
}

/** Fascia e cursore per il beat globale B, oppure null se B non è in nessun rigo. */
export const locateBeat = (beatMap, beat) => {
  if (!beatMap || beat < 1 || beat > beatMap.totalBeats) return null

  const entry = beatMap.lines.find(
    ({ line, firstBeat }) => beat >= firstBeat && beat < firstBeat + line.beats
  )
  if (!entry) return null

  const { line, firstBeat } = entry
  const count = line.beats
  const group = line.highlight
  const index = beat - firstBeat
  const origin = Math.floor(index / group) * group
  const groupWidth = Math.min(group, count - origin)
  const slice = (1 / count) * line.w

  return {
    pageIndex: entry.pageIndex,
    lineIndex: entry.lineIndex,
    line,
    band: { x: line.x + origin * slice, y: line.y, w: groupWidth * slice, h: line.h },
    cursor: { x: line.x + index * slice, y: line.y, h: line.h }
  }
}

/** Primo beat globale di un rigo, per posizionarsi toccandolo. */
export const firstBeatOfLine = (beatMap, pageIndex, lineIndex) =>
  beatMap?.lines.find(l => l.pageIndex === pageIndex && l.lineIndex === lineIndex)?.firstBeat ?? null
