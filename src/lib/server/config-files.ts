import fs from 'node:fs';
import path from 'node:path';

export const ensureFileFromExample = (targetPath: string, examplePath: string, fallback = '') => {
	if (fs.existsSync(targetPath)) return;

	fs.mkdirSync(path.dirname(targetPath), { recursive: true });

	if (fs.existsSync(examplePath)) {
		fs.copyFileSync(examplePath, targetPath);
		return;
	}

	fs.writeFileSync(targetPath, fallback);
};

export const readJsonFileWithExample = <T>(targetPath: string, examplePath: string, fallback: T) => {
	ensureFileFromExample(targetPath, examplePath, JSON.stringify(fallback, null, 2));
	return JSON.parse(fs.readFileSync(targetPath, 'utf8')) as T;
};
