import { error } from '@sveltejs/kit';
import { command, form, getRequestEvent } from '$app/server';
import { getBetterAuth } from '$lib/auth/server';
import { m } from '$lib/paraglide/messages';
import { CONSTANTS } from '$lib/server/const';
import { requireHost } from '$lib/remotes/config.remote';
import * as v from 'valibot';

import { requireUser } from './auth.remote';
const APIKeySchema = v.object({
	expiresIn: v.pipe(
		v.optional(v.string()),
		v.transform((i) => (i && parseInt(i)) || undefined)
	),
	name: v.pipe(v.string(), v.nonEmpty(m.errors_non_empty())),
	permissions: v.pipe(
		v.string(),
		v.transform((str) => JSON.parse(str) as { [key: string]: ['delete' | 'read' | 'write'] })
	),
	rate : v.pipe(v.optional(v.string()), v.transform(Number)),
	window: v.pipe(v.optional(v.string()), v.transform(Number))
});

export const createApiKey = form(APIKeySchema, async (payload) => {
	const user = await requireUser();
	const { request, url } = getRequestEvent();
	const host = requireHost(url, request.headers);
	const auth = await getBetterAuth(host);
	try {
		const apiKey = await auth.api.createApiKey({
			body: {
				expiresIn: payload.expiresIn,
				name: payload.name,
				permissions: payload.permissions,
				rateLimitEnabled:(payload.rate && payload.rate > 0 && payload.window &&payload.window   > 0) || false,
				rateLimitMax:payload.rate,
				rateLimitTimeWindow:payload.window,
				userId: user.id,
			},
		});
		return { apiKey };
	} catch (err) {
		if (CONSTANTS.DEBUG) console.error(err);
		throw error(400, { message: m.errors_generic() });
	}
});

export const deleteApiKeys = command(v.array(v.string()), async (ids) => {
	await requireUser();
	const { request, url } = getRequestEvent();
	const host = requireHost(url, request.headers);
	const auth = await getBetterAuth(host);
	try {
		await Promise.all(
			ids.map(
				async (keyId) => await auth.api.deleteApiKey({ body: { keyId }, headers: request.headers })
			)
		);
		return true;
	} catch (err) {
		if (CONSTANTS.DEBUG) console.error(err);
		throw error(400, { message: m.errors_generic() });
	}
});
