const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const GSI_SRC = 'https://accounts.google.com/gsi/client'
const GAPI_SRC = 'https://apis.google.com/js/api.js'
const SCORE_NAME = /\.(jpe?g|png|webp|json)$/i
const SCORE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/json'
])

const MIME_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/json': 'json'
}

export const DRIVE_SETUP_MESSAGE = [
  'Il bottone Drive non è ancora collegato a un progetto Google.',
  '',
  'Crea un file .env nella cartella del progetto:',
  'VITE_GOOGLE_CLIENT_ID=....apps.googleusercontent.com',
  'VITE_GOOGLE_API_KEY=...',
  'VITE_GOOGLE_APP_ID=... (numero del progetto, non il nome)',
  '',
  'Poi riavvia npm run dev.',
  'I passaggi nella Cloud Console sono nei commenti di .env.example.'
].join('\n')

export const googleDriveConfig = () => ({
  clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim(),
  apiKey: (import.meta.env.VITE_GOOGLE_API_KEY || '').trim(),
  appId: (import.meta.env.VITE_GOOGLE_APP_ID || '').trim()
})

export const isGoogleDriveConfigured = () => {
  const { clientId, apiKey, appId } = googleDriveConfig()
  return Boolean(clientId && apiKey && appId)
}

const loadScript = (src, isReady) => new Promise((resolve, reject) => {
  if (isReady()) {
    resolve()
    return
  }

  let script = document.querySelector(`script[src="${src}"]`)
  const finish = () => {
    if (isReady()) resolve()
    else reject(new Error(`Google non è disponibile dopo il caricamento di ${src}`))
  }

  if (script?.dataset.loaded === 'true') {
    finish()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.src = src
    script.async = true
    document.head.appendChild(script)
  }

  script.addEventListener('load', () => {
    script.dataset.loaded = 'true'
    finish()
  }, { once: true })
  script.addEventListener('error', () => {
    reject(new Error('Impossibile contattare Google. Controlla la connessione e riprova.'))
  }, { once: true })
})

let scriptsReady = null

export const preloadGoogleDrive = () => {
  if (!isGoogleDriveConfigured()) return Promise.resolve()
  if (!scriptsReady) {
    scriptsReady = Promise.all([
      loadScript(GSI_SRC, () => Boolean(window.google?.accounts?.oauth2)),
      loadScript(GAPI_SRC, () => Boolean(window.gapi?.load))
    ]).then(() => new Promise((resolve, reject) => {
      window.gapi.load('picker', {
        callback: resolve,
        onerror: () => reject(new Error('Impossibile aprire il selettore di Google Drive.'))
      })
    })).catch((error) => {
      scriptsReady = null
      throw error
    })
  }
  return scriptsReady
}

let tokenClient = null

const tokenClientFor = () => {
  const { clientId } = googleDriveConfig()
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: () => {}
    })
  }
  return tokenClient
}

const CANCELLED_TOKEN_ERRORS = new Set(['popup_closed_by_user', 'access_denied'])

/**
 * Va chiamato nel turno del click, a script già caricati:
 * la finestra di Google si apre solo se il gesto dell'utente è ancora valido.
 * Restituisce null se l'utente chiude l'accesso.
 */
export const requestDriveAccess = () => new Promise((resolve, reject) => {
  const client = tokenClientFor()
  client.callback = (response) => {
    if (response.error) {
      if (CANCELLED_TOKEN_ERRORS.has(response.error)) {
        resolve(null)
        return
      }
      if (response.error === 'popup_blocked_by_browser' || response.error === 'popup_blocked') {
        reject(new Error('Il browser ha bloccato la finestra di Google. Consenti i popup per questo sito e riprova.'))
        return
      }
      reject(new Error(`Accesso a Google non riuscito (${response.error}).`))
      return
    }
    resolve(response.access_token || null)
  }
  client.requestAccessToken({ prompt: '' })
})

const escapeDriveQuery = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const driveError = async (response, fallback) => {
  const data = await response.json().catch(() => ({}))
  return new Error(data.error?.message || fallback)
}

const listChildren = async (folderId, token) => {
  const files = []
  let pageToken = ''

  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      q: `'${escapeDriveQuery(folderId)}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true'
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) throw await driveError(response, `Impossibile leggere la cartella (${response.status}).`)

    const data = await response.json()
    files.push(...(data.files || []))
    pageToken = data.nextPageToken || ''
    if (!pageToken) break
  }

  return files
}

const isScoreFile = (file) => {
  if (SCORE_MIME.has(file.mimeType)) return true
  return SCORE_NAME.test(file.name || '')
}

const ensureName = (file) => {
  const name = file.name || 'spartito'
  if (SCORE_NAME.test(name)) return name
  const extension = MIME_EXTENSION[file.mimeType]
  return extension ? `${name}.${extension}` : name
}

const downloadDriveFile = async (file, token) => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!response.ok) throw await driveError(response, `download non riuscito (${response.status})`)
  const blob = await response.blob()
  return new File([blob], ensureName(file), {
    type: blob.type || file.mimeType || 'application/octet-stream'
  })
}

const mapPool = async (items, limit, fn) => {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

const collectDocs = async (docs, token) => {
  const seen = new Set()
  const files = []
  const rejected = []

  for (const doc of docs) {
    if (doc.mimeType === FOLDER_MIME) {
      const children = await listChildren(doc.id, token)
      for (const child of children) {
        if (child.mimeType === FOLDER_MIME || seen.has(child.id) || !isScoreFile(child)) continue
        seen.add(child.id)
        files.push(child)
      }
      continue
    }

    if (doc.mimeType === 'application/vnd.google-apps.shortcut') {
      rejected.push(`${doc.name}: seleziona il file originale, non il collegamento`)
      continue
    }

    if (seen.has(doc.id)) continue
    if (!isScoreFile(doc)) {
      rejected.push(`${doc.name}: formato non supportato`)
      continue
    }
    seen.add(doc.id)
    files.push(doc)
  }

  return { files, rejected }
}

const openPicker = (token) => new Promise((resolve) => {
  const { apiKey, appId } = googleDriveConfig()
  const google = window.google

  const scoresView = new google.picker.DocsView(google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false)
    .setMimeTypes('image/jpeg,image/png,image/webp,application/json,application/vnd.google-apps.folder')
    .setLabel('Spartiti')

  const folderView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setLabel('Cartella')

  const picker = new google.picker.PickerBuilder()
    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
    .setAppId(appId)
    .setDeveloperKey(apiKey)
    .setOAuthToken(token)
    .setOrigin(window.location.origin)
    .setLocale('it')
    .setTitle('Scegli spartiti o una cartella')
    .addView(scoresView)
    .addView(folderView)
    .setCallback((data) => {
      const action = data[google.picker.Response.ACTION]
      if (action === google.picker.Action.PICKED) {
        resolve(data[google.picker.Response.DOCUMENTS] || [])
      } else if (action === google.picker.Action.CANCEL) {
        resolve(null)
      }
    })
    .build()

  picker.setVisible(true)
})

/**
 * Apre il selettore di Drive e scarica i file scelti.
 * Una cartella porta dentro le immagini e i .json che contiene, senza le sottocartelle.
 * Restituisce null se l'utente chiude il selettore.
 */
export const loadScoreFilesFromDrive = async (token) => {
  const docs = await openPicker(token)
  if (!docs) return null

  const { files: docsToDownload, rejected } = await collectDocs(docs, token)
  const downloaded = await mapPool(docsToDownload, 4, async (doc) => {
    try {
      return { file: await downloadDriveFile(doc, token) }
    } catch (error) {
      return { error: `${doc.name}: ${error.message}` }
    }
  })

  return {
    files: downloaded.filter((item) => item.file).map((item) => item.file),
    rejected: [...rejected, ...downloaded.filter((item) => item.error).map((item) => item.error)]
  }
}
