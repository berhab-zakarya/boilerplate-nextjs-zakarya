/**
 * TemplateEngine
 *
 * Lightweight, zero-dependency template engine.
 * Interpolates {{VARIABLE}} placeholders with a context map.
 * Supports conditional blocks: {{#if VAR}} ... {{/if}}
 * Supports iteration: {{#each ITEMS}} ... {{/each}}
 */

export type TemplateContext = Record<string, string | string[] | boolean | number>;

export class TemplateEngine {
    /**
     * Render a template string with the given context.
     */
    render(template: string, context: TemplateContext): string {
        let result = template;

        // Process #if blocks
        result = this.processIfBlocks(result, context);

        // Process #each blocks
        result = this.processEachBlocks(result, context);

        // Process simple {{VAR}} interpolations
        result = this.interpolate(result, context);

        // Clean up any blank lines left by removed blocks (max 1 blank line)
        result = result.replace(/\n{3,}/g, '\n\n');

        return result;
    }

    /**
     * Render a template file path (replacing placeholders in the path itself).
     * e.g. "{{kebab}}.service.ts" → "sales-order.service.ts"
     */
    renderPath(templatePath: string, context: TemplateContext): string {
        return templatePath.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
            const val = context[key];
            return val !== undefined ? String(val) : `{{${key}}}`;
        });
    }

    // ─── Private ─────────────────────────────────────────────────────────────────

    private interpolate(template: string, context: TemplateContext): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
            const val = context[key];
            if (val === undefined) return match; // leave unknown vars unchanged
            return String(val);
        });
    }

    private processIfBlocks(template: string, context: TemplateContext): string {
        const ifRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

        return template.replace(ifRegex, (_, key: string, body: string) => {
            const val = context[key];
            const truthy =
                val === true ||
                val === 'true' ||
                (typeof val === 'number' && val !== 0) ||
                (typeof val === 'string' && val.length > 0 && val !== 'false');

            return truthy ? body : '';
        });
    }

    private processEachBlocks(template: string, context: TemplateContext): string {
        const eachRegex = /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

        return template.replace(eachRegex, (_, key: string, body: string) => {
            const items = context[key];

            if (!Array.isArray(items)) return '';

            return items
                .map((item) => body.replace(/\{\{item\}\}/g, item))
                .join('');
        });
    }
}

export const templateEngine = new TemplateEngine();
