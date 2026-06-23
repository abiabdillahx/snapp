import type { GenericOAuthConfig } from "better-auth/plugins";

import { readJsonFileWithExample } from '$lib/server/config-files';

export const load = async ({ parent }) => {
	const oauthConfig = readJsonFileWithExample<GenericOAuthConfig[]>(
		'config/oauth.json',
		'config/oauth.example.json',
		[]
	);

	const data = await parent();
	const accountProviders = oauthConfig.map(({ providerId }) => providerId);

	return { ...data, accountProviders };
};
