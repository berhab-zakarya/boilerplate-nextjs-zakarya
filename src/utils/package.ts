import path from 'path';
import fs from 'fs-extra';

export function readPackageVersion(): string {
    try {
        const pkgPath = path.join(__dirname, '../../package.json');
        const pkg = fs.readJsonSync(pkgPath) as { version?: string };
        return pkg.version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
}
