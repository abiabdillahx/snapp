import { error, redirect } from '@sveltejs/kit';
import { getBetterAuth } from '$lib/auth/server.js';
import { m } from '$lib/paraglide/messages.js';
import { EnforcedPaginationSchema } from '$lib/schemas/pagination.schema';
import { CONSTANTS } from '$lib/server/const';
import { db } from '$lib/server/db/index.js';
import { metric, session, tag, url, urlToTag } from '$lib/server/db/schema';
import { requireHost } from '$lib/remotes/config.remote';
import { count, desc, eq, sql } from 'drizzle-orm';
import * as v from 'valibot';

export const load = async ({ depends, locals: { user }, params: { id }, request, url: u }) => {
	depends('users:load');
	if (!user) throw redirect(307, '/auth/sign-in');
	if (user.role === 'user') throw redirect(307, '/auth/dashboard');

	const host = requireHost(u, request.headers);
	const auth = await getBetterAuth(host);
	const pagination = v.parse(EnforcedPaginationSchema, {
		...Object.fromEntries(u.searchParams.entries()),
		table: 'url'
	});

	try {
		const member = (await auth.api.getUser({
			headers: request.headers,
			query: {
				id
			}
		})) as User;
		const tags = db
			.select({
				count: sql<number>`
		(SELECT COUNT(*) FROM ${urlToTag} WHERE ${urlToTag.tagId} = ${tag.id})
	  `,
				id: tag.id,
				tag: tag.tag
			})
			.from(tag)
			.orderBy(desc(sql`count`));

		const [urlCount] = await db
			.select({ count: count() })
			.from(url)
			.where(eq(url.userId, member.id));

		const [lastLogin] = await db
			.select({ createdAt: session.createdAt })
			.from(session)
			.where(eq(session.userId, member.id))
			.orderBy(desc(session.createdAt))
			.limit(1);

		const [metrics] = await db
			.select({ count: count() })
			.from(metric)
			.where(eq(metric.ownerId, member.id));

		const urls = db.query.url.findMany({
			limit: pagination.limit,
			offset: pagination.offset,
			orderBy: pagination.sort
				? {
						[pagination.sort]: pagination.desc ? 'desc' : 'asc'
					}
				: undefined,
			where: {
				AND: [
					{ userId: member.id },
					pagination.tags && pagination.tags?.length > 0
						? {
								tags: {
									tag: {
										in: pagination.tags
									}
								}
							}
						: undefined,
					pagination.query
						? {
								OR: [
									{ notes: { ilike: `%${pagination.query}%` } },
									{ originalUrl: { ilike: `%${pagination.query}%` } },
									{ shortcode: { ilike: `%${pagination.query}%` } }
								]
							}
						: undefined
				].filter((f) => !!f)
			},
			with: {
				tags: true
			}
		});

		return {
			columnVisibility: pagination.columns,
			lastLogin: lastLogin?.createdAt || null,
			limit: pagination.limit,
			member,
			metrics: metrics?.count || 0,
			tags: await tags,
			urlCount: urlCount?.count || 0,
			urls: await urls.then((rows) => rows.map((row) => ({ ...row, secret: row.secret !== null })))
		};
	} catch (caught) {
		if (CONSTANTS.DEBUG) console.error(caught);
		throw redirect(307, '/users');
	}
};
