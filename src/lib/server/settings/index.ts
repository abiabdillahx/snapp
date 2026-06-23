import lodash from 'lodash';
import fs from 'node:fs';
import yaml from 'yaml';

import { CONSTANTS } from '../const';
import { ensureFileFromExample } from '../config-files';
import { parseSettings, type TSettings } from './schema';

const SETTINGS_PATH = 'config/settings.yaml';
const SETTINGS_EXAMPLE_PATH = 'config/settings.example.yaml';

const FALLBACK_RAW = `appname: Snapp
admin:
  - email: admin@example.org
    username: admin
hosts:
  - options:
      customRedirect: /dashboard
      disable:
        homepage: false
        twoFactor: true
    origin: http://localhost:5173
smtp:
  enabled: false
`;

class Settings {
	#lastAccess: number | undefined = undefined;
	#settings: TSettings = {} as TSettings;

	constructor() {
		this.sync();
	}

	get() {
		this.sync();
		return this.#settings;
	}

	set(payload: unknown) {
		try {
			this.#settings = parseSettings(lodash.merge({}, this.#settings, payload));
			fs.mkdirSync('config', { recursive: true });
			fs.writeFileSync(SETTINGS_PATH, yaml.stringify(this.#settings));
			this.#lastAccess = Date.now();
		} catch (error) {
			console.error('[settings]', 'Error while saving settings');
			if (CONSTANTS.DEBUG) console.error(error);
		}
	}

	sync = () => {
		try {
			ensureFileFromExample(SETTINGS_PATH, SETTINGS_EXAMPLE_PATH, FALLBACK_RAW);

			const stats = fs.statSync(SETTINGS_PATH);
			if (this.#lastAccess && stats.mtimeMs <= this.#lastAccess) return;

			const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
			this.#settings = parseSettings(yaml.parse(raw));
			this.#lastAccess = stats.mtimeMs;

			if (CONSTANTS.DEBUG) console.info('[settings]', 'Updated from file');
		} catch (error) {
			console.error('[settings]', 'Error while loading settings');
			if (CONSTANTS.DEBUG) console.error(error);
		}
	};
}

export const settings = new Settings();
