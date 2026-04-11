const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "src", "lib", "api.ts");
let content = fs.readFileSync(filePath, "utf8");
const startMarker = "async function request<T>(path: string, options: RequestInit = {}): Promise<T> {";
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) { console.error("NOT FOUND"); process.exit(1); }
let endIdx = content.indexOf("\n}", startIdx + startMarker.length);
endIdx = endIdx + 2;
const before = content.substring(0, startIdx);
const after = content.substring(endIdx);
const BT = String.fromCharCode(96);
const newFn = `
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(${BT}API_URL${path}${BT}, {
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
}
`;
const newContent = before + newFn + after;
fs.writeFileSync(filePath, newContent, "utf8");
console.log("SUCCESS");