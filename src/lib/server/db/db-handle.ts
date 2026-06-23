import { type Handle, redirect } from '@sveltejs/kit';

import { _checkDB } from '../../../hooks.server';

const dbHandle: Handle = async ({ event, resolve }) => {
	try {
		if (await _checkDB()) {
			if (event.url.pathname === '/db-offline') throw redirect(307, '/dashboard');
			return resolve(event);
		}

		if (event.url.pathname === '/db-offline') return resolve(event);
	} catch (err) {
		console.error(err);
	}

	throw redirect(307, '/db-offline');
};

export default dbHandle;
