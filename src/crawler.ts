import { Browser, Page } from 'puppeteer';

const ALL_CATEGORIES_SELECTOR = 'h3';

const INFOBOX_SELECTOR = '.infobox'
const MAIN_IMAGE_SELECTOR = '#itemmainimage a'
const TOTAL_COST_SELECTOR = '[style="width:50%; background-color:#DAA520;"]';
const STATS_CONTAINER_SELECTOR = 'table[style="text-align:left;"] > tbody';

const IMAGE_LAZYLOAD = '[src="data:image/gif;base64,R0lGODlhAQABAIABAAAAAP///yH5BAEAAAEALAAAAAABAAEAQAICTAEAOw%3D%3D"]'

export class Crawler {
  private browser : Browser;
  private baseUrl : string;
  protected page? : Page;

  constructor(browser: Browser, url: string) {
    this.browser = browser;
    this.baseUrl = url;
  }

  async visitPage() {
    this.page = await this.browser.newPage();

    await this.page.goto(this.baseUrl);
  }
}

interface Item {
  id: string,
  title: string,
  name: string,
  url?: string,
  cost?: number,
  detail?: ItemDetail
}

interface ItemDetail {
  image?: string,
  passive?: string,
  active?: string,
  bonus?: any,
  disassemble?: boolean,
  recipeIds?: Array<string>
  recipe?: Array<Item>
}

export class DotaItemWikiCrawler extends Crawler {
  private categoryMap: Map<string, Array<Item>>
  private itemMap: Map<string, Item>

  constructor(browser: Browser, url: string) {
    super(browser, url)

    this.categoryMap = new Map<string, Array<Item>>()
    this.itemMap = new Map<string, Item>()
  }

  async getAllItemList() {
    const categories = await this.page.$$(ALL_CATEGORIES_SELECTOR);

    for (const category of categories) {
      const [id, categoryName] = await category.evaluate((elem) => {
        const child = elem.firstElementChild;

        if (!child?.classList?.contains('mw-headline')) {
          return [undefined, undefined]
        }

        return [child.id, child.textContent.trim()]
      })

      if (!id) {
        continue
      }

      const items = await category.evaluate((elem) => {
        const itemList = elem.nextElementSibling;

        if (!itemList.classList?.contains('itemlist')) {
          return undefined
        }

        return Array.from(itemList.children).map(item => {
          const image = item.children[0] as HTMLAnchorElement;
          const title = item.children[1];

          const name = title.innerHTML

          return {
            id: image.href.split('/wiki/')[1],
            title: image.title,
            name: name,
            url: image.href
          }
        })
      });

      this.categoryMap.set(categoryName, items)

      if (!items) {
        continue
      }

      for (const item of items) {
        this.itemMap.set(item.title, item)
      }
    }
  }

  async getItemDetailUnderCategory(category: string) {
    const items = this.categoryMap.get(category);

    if (!items) {
      throw new Error(`The category specified is not apparent: ${category}`)
    }

    for (const item of items) {
      await this.page.goto(item.url)

      const infobox = (await this.page.$$(INFOBOX_SELECTOR))[0];
      const costbox = (await infobox.$$(TOTAL_COST_SELECTOR))[0];
      const statsBox = (await infobox.$$(STATS_CONTAINER_SELECTOR))[0];
      const imageBox = (await infobox.$$(MAIN_IMAGE_SELECTOR))[0];

      await this.page.waitForSelector(`${MAIN_IMAGE_SELECTOR} ${IMAGE_LAZYLOAD}`, { hidden: true });

      const image = await imageBox.evaluate((elem) => {
        const src = (elem.firstElementChild as HTMLImageElement).src

        return src
      });

      const cost = await costbox.evaluate((elem) => {
        const raw = elem.textContent;

        return parseInt(raw.split('Cost')[1]);
      });

      const stats = await statsBox.evaluate((elem) => {
        const statsList = Array.from(elem.children)

        const stats: ItemDetail = {}

        for (const stat of statsList) {
          const [th, td, _] = Array.from(stat.children);

          const title = th.textContent.replace('\n', '');
          const content = td;

          switch (title) {
            case 'Passive':
              stats.passive = content.textContent.replace('\n', '')
              break;

            case 'Active':
              stats.active = content.textContent.replace('\n', '')
              break;

            case 'Bonus [?]':
              const rawBonuses = content.innerHTML.split('<br>').map(v => v.replace(new RegExp('<.+?>', 'g'), '')).slice(0, -1);

              const bonuses = rawBonuses.map(v => {
                const [value, key] = v.split(' ');

                return { key, value }
              }).reduce((acc, v) => {
                acc[v.key] = parseInt(v.value)

                return acc
              }, {})

              stats.bonus = bonuses;
              break;

            case 'Disassemble?':
              stats.disassemble = content.textContent.replace('\n', '') == 'Yes'
              break;

            case 'Recipe':
              const recipes = Array.from(stat.nextElementSibling.firstElementChild.children) as Array<Element>

              for (const recipe of recipes) {
                if (recipe.tagName !== 'A') {
                  continue
                }

                const resources = recipe.nextElementSibling?.nextElementSibling?.firstElementChild

                if (!resources) {
                  continue
                }

                stats.recipeIds = Array.from(resources.children).map((elem: Element) => {
                  const a = elem.firstElementChild as HTMLAnchorElement;

                  return a.title
                })
              }
              break;

            default:
          }
        }

        return stats
      })

      item.detail = stats
      item.cost = cost

      stats.image = image
    }
  }

  getData(categories: Array<string>): any {
    const data = {};

    for (const category of categories) {
      const items = this.categoryMap.get(category);

      data[category] = items.map(item => {
        item.url = undefined;
        item.detail.image = undefined;
        item.detail.recipe = item.detail.recipeIds?.map((title) => {
          const item = this.itemMap.get(title)

          if (item) {
            return Object.assign({}, item, {
              detail: undefined
            })
          } else {
            return {
              id: 'Recipe',
              title: 'Recipe',
              name: title,
              cost: parseInt(title.replace('Recipe (', ''))
            }
          }
        });
        item.detail.recipeIds = undefined;

        return item
      })
    }

    return data
  }

  getAllImages(): Array<[string, string]> {
    return Array.from(this.itemMap.values()).map(item => {
      return [item.id, item.detail?.image]
    })
  }
}
