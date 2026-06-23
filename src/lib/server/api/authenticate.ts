import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { getBetterAuth } from '$lib/auth/server';
import { m } from '$lib/paraglide/messages';
import { requireHost } from '$lib/remotes/config.remote';
import { slugify } from '$lib/utils';

export const authenticateAPI = async () => {
	const { request, url: u } = getRequestEvent();
	const host = requireHost(u, request.headers);
	const auth = await getBetterAuth(host);
	const key = request.headers.get('authorization')?.split('Bearer ')?.[1] || 'x-api-key';
	const hostId = slugify(host.origin);

	const authenticated = await auth.api.verifyApiKey({
		body: {
			key,
			permissions: {
				[hostId]: ['read']
			}
		}
	});

	if (authenticated.key === null)
		throw error(401, {
			message:
				authenticated.error?.code === 'RATE_LIMITED' ? m.rate_limited() : m.errors_unauthorized()
		});
	return { host, key: authenticated.key, organizationId: hostId };
};
