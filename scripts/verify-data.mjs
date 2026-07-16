import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const d = JSON.parse(readFileSync(resolve(root, 'data', 'Veverke.chatwizard.json'), 'utf-8'))
const l = d[d.length - 1]
console.log('Total points:', d.length)
console.log('First ts:', d[0].ts, '| Installs:', d[0].marketplace.installs, '| OVSX:', d[0].openVsx.downloads)
console.log('Last ts:', l.ts, '| Installs:', l.marketplace.installs, '| OVSX:', l.openVsx.downloads, '| Rating:', l.marketplace.averageRating)