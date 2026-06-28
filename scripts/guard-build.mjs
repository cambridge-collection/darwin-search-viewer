import { readFileSync } from 'node:fs'

// Build-time safety: the baked-in api_url must be a real https host, never a local
// dev URL. Runs automatically before every `npm run build` (build is prod-only);
// `npm run dev` is unguarded, so local testing with the localhost const still works.
const path = 'src/implementationConfig.ts'
const src = readFileSync(path, 'utf8')

const match = src.match(/const\s+api_url\s*:\s*string\s*=\s*['"`]([^'"`]+)['"`]/)
if (!match) {
  console.error(`guard-build: couldn't find api_url in ${path}`)
  process.exit(1)
}

const url = match[1]
if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url)) {
  console.error(`\n✖ Refusing to build — api_url is a local dev URL: ${url}`)
  console.error(`  Set api_url to the production host in ${path} before building for distribution.\n`)
  process.exit(1)
}

if (!/^https:\/\//i.test(url)) {
  console.error(`\n✖ Refusing to build — api_url must use https:// — got: ${url}`)
  console.error(`  Check the protocol of api_url in ${path}.\n`)
  process.exit(1)
}

console.log(`guard-build: api_url OK (${url})`)
