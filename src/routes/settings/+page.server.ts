import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { user }, parent }) => {
	if (user?.role !== 'admin') throw redirect(307, '/dashboard');
	const data = await parent();
	return { ...data };
};
