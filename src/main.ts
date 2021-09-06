import * as puppeteer from 'puppeteer';

import { createDirectoryIfNotExist, exportFile } from './file-system';
import config from './skhema';
import { DotaItemWikiCrawler } from './crawler';
import { ImageDownloader } from './downloader';

const OUTPUT_DIRECTORY = config.output.directory;
const IMAGE_DIRECTORY = config.output.image.directroy;
const FILENAME = config.output.filename;

async function prepareBrowser(): Promise<puppeteer.Browser> {
  console.log("Initializing Browser ...")
  const browser = await puppeteer.launch({
    headless: true,
  });
  console.log("Done")

  return browser
}

async function getAllItemsList(browser: puppeteer.Browser): Promise<DotaItemWikiCrawler> {
  console.log("Access to dota wiki ...")
  const crawler = new DotaItemWikiCrawler(browser, config.url);
  await crawler.visitPage()
  console.log("Done")

  console.log("Get item list from dota wiki ...")
  await crawler.getAllItemList()
  console.log("Done")

  return crawler
}

async function getData(crawler: DotaItemWikiCrawler) {
  console.log("Save all data ...")
  for (const category of config.target.category) {
    await crawler.getItemDetailUnderCategory(category)
  }
  
  const data = crawler.getData(config.target.category)
  exportFile(`${OUTPUT_DIRECTORY}/${FILENAME}`, data)
  console.log("Done")
}

async function downloadImages(browser: puppeteer.Browser, crawler: DotaItemWikiCrawler) {
  console.log("Download all images ...")
  const downloader = new ImageDownloader(browser);
  const images = crawler.getAllImages();
  await downloader.newPage()

  for (const [id, url] of images) {
    await downloader.downloadImage(`${OUTPUT_DIRECTORY}/${IMAGE_DIRECTORY}/${id}.png`, url)
  }
  console.log("Done")
}

(async () => {
  createDirectoryIfNotExist(OUTPUT_DIRECTORY);
  createDirectoryIfNotExist(`${OUTPUT_DIRECTORY}/${IMAGE_DIRECTORY}`);

  const browser = await prepareBrowser();
  const crawler = await getAllItemsList(browser);

  await getData(crawler);

  if (config.output.image.active) {
    await downloadImages(browser, crawler);
  }

  await browser.close();
})();
