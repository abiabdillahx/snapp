import { error } from '@sveltejs/kit';
import { command, form, getRequestEvent, query } from '$app/server';
import { authCache } from '$lib/auth/server';
import { m } from '$lib/paraglide/messages';
import { HostSchema } from '$lib/schemas/host.schema';
import { db } from '$lib/server/db';
import { getSMTP } from '$lib/server/email';
import { settings } from '$lib/server/settings';
import { SettingSchema } from '$lib/server/settings/schema';
import { slugify, timeDiff } from '$lib/utils';
import lodash from 'lodash';
import fs from 'node:fs';
import os from 'node:os';
import * as v from 'valibot';
import yaml from 'yaml';

import { _uptime } from '../../hooks.server';
import { requireUser } from './auth.remote';

export const getRequestOrigin = (url: URL, headers?: Headers) => {
	const forwardedProto = headers?.get('x-forwarded-proto')?.split(',')[0]?.trim();
	const forwardedHost = headers?.get('x-forwarded-host')?.split(',')[0]?.trim();

	if (forwardedHost) {
		return `${forwardedProto || url.protocol.slice(0, -1)}://${forwardedHost}`;
	}

	return headers?.get('origin')?.trim() || url.origin;
};

export const getHostFromOrigin = (origin: string) => {
	const { hosts } = settings.get();
	return hosts.find((host) => host.origin === origin) || null;
};

export const requireHost = (url: URL, headers?: Headers) => {
	const host = getHostFromOrigin(getRequestOrigin(url, headers));
	if (!host) throw error(400, { message: m.errors_unrecognized_host() });
	return host;
};

export const getHost = query(async () => {
	const { request, url } = getRequestEvent();
	return requireHost(url, request.headers);
});

export const updateHostOptions = command(v.partial(HostSchema), async (schema) => {
	await requireUser();
	const { request, url } = getRequestEvent();
	const config = settings.get();
	const origin = getRequestOrigin(url, request.headers);
	const hostIdx = config.hosts.findIndex((host) => host.origin === origin);
	if (hostIdx === -1) throw error(400, { message: m.errors_unrecognized_host() });

	const host = lodash.merge({}, config.hosts[hostIdx], schema);
	config.hosts.splice(hostIdx, 1, host);
	settings.set(config);
	getHost().set(host);
	authCache.auth.delete(slugify(host.origin));
});

export const updateLimits = form(
	v.object({
		enabled: v.boolean(),
		limits: v.optional(
			v.object({
				maxSnappPerUser: v.number(),
				requestsPerDay: v.number(),
				requestsPerMinute: v.number()
			})
		)
	}),
	async ({ enabled, limits }) => {
		await requireUser();
		const { request, url } = getRequestEvent();
		const config = settings.get();
		const origin = getRequestOrigin(url, request.headers);
		const hostIdx = config.hosts.findIndex((host) => host.origin === origin);
		if (hostIdx === -1) throw error(400, { message: m.errors_unrecognized_host() });

		const host = lodash.merge({}, config.hosts[hostIdx], {
			options: {
				disable: {
					limits: !enabled
				},
				limits: {
					maxSnappPerUser: limits?.maxSnappPerUser,
					requestsPerDay: limits?.requestsPerDay,
					requestsPerMinute: limits?.requestsPerMinute
				}
			}
		});

		config.hosts.splice(hostIdx, 1, host);
		settings.set(config);
		getHost().set(host);
		authCache.auth.delete(slugify(host.origin));
	}
);

export const getSMTPInfo = query(async () => {
	await requireUser();
	const config = settings.get();
	return config.smtp;
});

export const verifySMTP = query(async () => {
	await requireUser();
	const smtp = await getSMTP();
	return !!smtp;
});

export const updateSMTPOptions = command(SettingSchema.entries.smtp, (smtp) => {
	const config = settings.get();
	settings.set({ ...config, smtp });
});

export const updateSMTPForm = form(SettingSchema.entries.smtp, async (smtp) => {
	const config = settings.get();
	settings.set({ ...config, smtp });
	getSMTPInfo().set(smtp);
});

export const getServerInfo = query(async () => {
	const _c = settings.get();
	const cgroup =
		(fs.existsSync('/proc/self/cgroup') && fs.readFileSync('/proc/self/cgroup', 'utf8')) || undefined;
	const match = cgroup?.match(/[0-9a-f]{64}/);
	const containerId = match ? match[0].slice(0, 12) : 'n/a';
	let runtime = 'unknown';
	if (fs.existsSync('/.dockerenv')) runtime = 'docker';
	else if (fs.existsSync('/run/.containerenv')) runtime = 'podman';

	return {
		appname: _c.appname,
		arch: os.arch(),
		containerId,
		cpus: os.cpus().length,
		hostname: os.hostname(),
		memory: { free: os.freemem(), total: os.totalmem() },
		platform: os.platform(),
		runtime,
		srv_uptime: timeDiff(new Date(Date.now() - os.uptime() * 1000)),
		uptime: timeDiff(new Date(_uptime))
	};
});

export const getHostById = query(v.nullish(v.string()), async (id) => {
	const { hosts } = settings.get();
	if (!id) return { host: null, raw: null };

	const organization = await db.query.organization.findFirst({
		where: { id }
	});
	if (!organization) return { host: null, raw: null };

	const host = hosts.find((h) => h.origin === JSON.parse(organization.metadata || '{}')?.origin);
	const raw = yaml.stringify(host);
	return { host, raw };
});

export const updateColumns = command(
	v.object({
		columns: v.record(v.string(), v.boolean()),
		cookie: v.string()
	}),
	({ columns, cookie }) => {
		const { cookies } = getRequestEvent();
		cookies.set(cookie, JSON.stringify(columns), { maxAge: 60 * 60 * 24 * 365, path: '/' });
	}
);

export const updateRows = command(
	v.object({
		cookie: v.string(),
		rows: v.pipe(
			v.string(),
			v.transform((i) => parseInt(i))
		)
	}),
	({ cookie, rows }) => {
		const { cookies } = getRequestEvent();
		cookies.set(cookie, JSON.stringify(rows), { maxAge: 60 * 60 * 24 * 365, path: '/' });
	}
);
