import fs from 'node:fs/promises'
import path from 'node:path'

export function readFile(file: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'src/app', file), 'utf-8')
}
