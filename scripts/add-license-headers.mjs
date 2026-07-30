/**
 * Adds the SPDX licence header to every authored source file that lacks one.
 * Safe to re-run. Generated code and dependencies are skipped.
 *
 *   node scripts/add-license-headers.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const HOLDER = 'Alexandru Negoita'
const YEAR = '2026'
const SPDX = 'SPDX-License-Identifier: GPL-3.0-or-later'
const COPYRIGHT = `Copyright (C) ${YEAR} ${HOLDER}`

const ROOTS = ['app', 'components', 'hooks', 'lib', 'scripts']
const ROOT_FILES = ['next.config.ts', 'prisma.config.ts', 'postcss.config.mjs', 'eslint.config.mjs']
const SKIP = ['lib/generated', 'node_modules', '.next']
const EXTS = new Set(['.ts', '.tsx', '.mjs', '.css'])

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (SKIP.some((s) => full.startsWith(s))) continue
    if (entry.isDirectory()) yield* walk(full)
    else if (EXTS.has(path.extname(entry.name))) yield full
  }
}

const files = [...ROOTS.filter(fs.existsSync).flatMap((r) => [...walk(r)]), ...ROOT_FILES.filter(fs.existsSync)]

let added = 0
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  if (source.includes('SPDX-License-Identifier')) continue

  const header =
    path.extname(file) === '.css'
      ? `/* ${SPDX} */\n/* ${COPYRIGHT} */\n\n`
      : `// ${SPDX}\n// ${COPYRIGHT}\n\n`

  fs.writeFileSync(file, header + source)
  added++
}

console.log(`${added} file(s) updated, ${files.length - added} already had a header.`)
