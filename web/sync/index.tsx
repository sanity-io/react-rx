const fs = require('fs')
import {SyncExample} from './SyncExample'

export default {
  name: 'sync',
  component: SyncExample,
  title: 'Sync',
  type: 'mixed',
  source: fs.readFileSync(`${__dirname}/SyncExample.tsx`, 'utf-8'),
}
