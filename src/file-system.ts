import * as fs from 'fs';

const CHARCODE = 'utf-8';

export function checkDirectoryExistence(path: string) {
  return fs.existsSync(path)
}

export function createDirectoryIfNotExist(path: string) {
  if (fs.existsSync(path))
    return undefined

  return fs.mkdirSync(path)
}

export function readFile(path: string) {
  const content = fs.readFileSync(path, CHARCODE);

  return content
}

export function exportFile(path: string, data: any) {
  try {
    fs.writeFileSync(path, JSON.stringify(data))
  } catch (err) {
    console.log(err)
  }
}

export function exportBuffer(path: string, buf: any) {
  try {
    fs.writeFile(path, buf, () => {})
  } catch (err) {
    console.log(err)
  }
}

export default {
  checkDirectoryExistence,
  createDirectoryIfNotExist,
  readFile,
  exportFile,
  exportBuffer
}
