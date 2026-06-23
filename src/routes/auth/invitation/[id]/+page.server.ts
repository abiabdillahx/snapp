import { error, redirect } from '@sveltejs/kit';
import { getBetterAuth } from '$lib/auth/server';
import { m } from '$lib/paraglide/messages';
import { requireHost } from '$lib/remotes/config.remote';

export const load = async ({ params: { id }, request, url }) => {
	const host = requireHost(url, request.headers);
	const auth = await getBetterAuth(host);

	try {
		await auth.api.acceptInvitation({
			body: {
				invitationId: id
			},
			headers: request.headers
		});
	} catch (caught) {
		console.error(caught);
		throw error(400, { message: m.errors_generic() });
	}

	throw redirect(307, '/dashboard');
};
