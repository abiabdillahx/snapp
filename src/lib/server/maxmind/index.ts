import fs from 'node:fs';

import maxmind, { type CityResponse, type CountryResponse } from 'maxmind';

type Lookup = Awaited<ReturnType<typeof maxmind.open>>;

const CANDIDATE_PATHS = ['config/maxmind/geolite2-city.mmdb', 'maxmind/geolite2-city.mmdb'];

let lookup: Lookup | null = null;
let lookupPromise: Promise<Lookup | null> | null = null;

const openLookup = async () => {
	const path = CANDIDATE_PATHS.find((candidate) => fs.existsSync(candidate));
	if (!path) return null;

	try {
		return await maxmind.open(path);
	} catch {
		return null;
	}
};

async function getLookup() {
	if (lookup) return lookup;
	if (!lookupPromise) {
		lookupPromise = openLookup().then((db) => {
			lookup = db;
			return db;
		});
	}

	return lookupPromise;
}

async function getLocation(ip?: string) {
	if (!ip || ip.trim() === '') return null;

	const db = await getLookup();
	if (!db) return null;

	const data = db.get(ip);
	if (data === null) return null;

	const city = (data as CityResponse).city?.names.en;
	const region = (data as CityResponse).subdivisions?.map((subdiv) => subdiv.names.en).join(' / ');
	const country = (data as CountryResponse).country?.names.en;

	return { city, country, region };
}

export { getLocation };
