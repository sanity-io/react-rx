import {readFileSync} from 'fs'

import {Example} from '../../pages/Examples/Examples'

export const SyncExample: Example = {
  id: 'sync-render',
  title: 'Sync rendering',
  source: readFileSync(`${__dirname}/Sync.example.tsx`, 'utf-8')
}
