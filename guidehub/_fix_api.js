const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'lib', 'api.ts');
let content = fs.readFileSync(filePath, 'utf8');
const oldFn = `async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `API error: ${res.status}`)
  }

  return res.json()
}`;
const newFn = `async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(` ${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `API error: ${res.status}`)
    }
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Network error. Check your connection and try again.')
    }
    throw err
  }
}`;
if (!content.includes(oldFn)) {
  console.error('ERROR: Could not find old function');
  process.exit(1);
}
content = content.replace(oldFn, newFn);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS');