import * as yaml from 'yaml'

import { readFile } from './file-system';

const CONFIG_PATH = './config.yml';

const config = loadConfig();

interface Config {
  url: string,
  network: {
    period: {
      activation: number,
    },
    timeout: number
  },
  target: {
    category: Array<string>
  },
  output: {
    directory: string,
    filename: string,
    image: {
      active: boolean,
      directroy: string,
    }
  }
}

function loadConfig() : Config {
  const str = readFile(CONFIG_PATH);

  const config : Config = yaml.parse(str);

  return config
}

export default config
