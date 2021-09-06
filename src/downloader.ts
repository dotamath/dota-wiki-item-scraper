import { Browser, Page } from 'puppeteer';
import { exportBuffer } from './file-system';

export class Downloader {
  private browser : Browser;
  protected page? : Page;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async newPage() {
    this.page = await this.browser.newPage();
  }

  protected async visitPage(url: string) {
    return await this.page.goto(url);
  }
}


export class ImageDownloader extends Downloader {
  constructor(browser: Browser) {
    super(browser);
  }

  async downloadImage(fileName: string, url: string) {
    const view = await this.visitPage(url)
      .catch(() => { return undefined })

    if (!view) {
      return undefined
    }
    
    const buf = await view.buffer()

    exportBuffer(fileName, buf)
  }
}
