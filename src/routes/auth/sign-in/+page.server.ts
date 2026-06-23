import type { GenericOAuthConfig } from 'better-auth/plugins';

import { getHost } from '$lib/remotes/config.remote';
import { readJsonFileWithExample } from '$lib/server/config-files';

export const load = async () => {
	const oauthConfig = readJsonFileWithExample<GenericOAuthConfig[]>(
		'config/oauth.json',
		'config/oauth.example.json',
		[]
	);

	const host = await getHost();
	const accountProviders = oauthConfig.map(({ providerId }) => providerId);

	return { accountProviders, host };
};
