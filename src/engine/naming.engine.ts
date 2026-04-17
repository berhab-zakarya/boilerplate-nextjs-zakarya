/**
 * NamingEngine
 *
 * Enforces strict naming conventions across ALL generators.
 * Every name variant used in generated code originates here.
 *
 * Given "featureName" input (e.g. "sales", "salesOrder", "sale-order")
 * it derives every casing variant required by the architecture.
 */

export interface NamingVariants {
    /** Original raw input */
    raw: string;
    /** camelCase — for variables, hooks: salesOrder */
    camel: string;
    /** PascalCase — for types, components: SalesOrder */
    pascal: string;
    /** kebab-case — for folders, file names: sales-order */
    kebab: string;
    /** snake_case — for env vars, constants: sales_order */
    snake: string;
    /** SCREAMING_SNAKE — for enum values, env keys: SALES_ORDER */
    screamingSnake: string;
    /** singular camel — best-effort: saleOrder (if ends with 's') */
    singularCamel: string;
    /** singular pascal: SaleOrder */
    singularPascal: string;
    /** plural camel: salesOrders */
    pluralCamel: string;
    /** plural pascal: SalesOrders */
    pluralPascal: string;
}

export class NamingEngine {
    derive(input: string): NamingVariants {
        const normalized = this.normalize(input);
        const words = this.splitToWords(normalized);

        const camel = this.toCamel(words);
        const pascal = this.toPascal(words);
        const kebab = this.toKebab(words);
        const snake = this.toSnake(words);
        const screamingSnake = snake.toUpperCase();

        const singularWords = this.toSingularWords(words);
        const pluralWords = this.toPluralWords(words);

        return {
            raw: input,
            camel,
            pascal,
            kebab,
            snake,
            screamingSnake,
            singularCamel: this.toCamel(singularWords),
            singularPascal: this.toPascal(singularWords),
            pluralCamel: this.toCamel(pluralWords),
            pluralPascal: this.toPascal(pluralWords),
        };
    }

    // ─── Derived convention helpers ─────────────────────────────────────────────

    /** Hook name: useSalesQuery */
    hookName(variants: NamingVariants, suffix: 'Query' | 'Mutation' | 'Store' = 'Query'): string {
        return `use${variants.pascal}${suffix}`;
    }

    /** Query options fn: salesQueryOptions */
    queryOptionsName(variants: NamingVariants): string {
        return `${variants.camel}QueryOptions`;
    }

    /** Mutation fn: createSaleMutation */
    mutationName(variants: NamingVariants, verb: string): string {
        return `${verb}${variants.singularPascal}Mutation`;
    }

    /** Service class/object: salesService */
    serviceName(variants: NamingVariants): string {
        return `${variants.camel}Service`;
    }

    /** Query key factory: salesKeys */
    queryKeysName(variants: NamingVariants): string {
        return `${variants.camel}Keys`;
    }

    /** Type name: Sale */
    typeName(variants: NamingVariants): string {
        return variants.singularPascal;
    }

    /** List type name: SaleList */
    listTypeName(variants: NamingVariants): string {
        return `${variants.singularPascal}List`;
    }

    // ─── Internal helpers ────────────────────────────────────────────────────────

    private normalize(input: string): string {
        return input.trim().toLowerCase().replace(/[^a-z0-9\s_-]/g, '');
    }

    private splitToWords(normalized: string): string[] {
        // Handle: camelCase, PascalCase, kebab-case, snake_case, spaces
        return normalized
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[-_]+/g, ' ')
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w.toLowerCase());
    }

    private toCamel(words: string[]): string {
        return words
            .map((w, i) => (i === 0 ? w : this.capitalize(w)))
            .join('');
    }

    private toPascal(words: string[]): string {
        return words.map((w) => this.capitalize(w)).join('');
    }

    private toKebab(words: string[]): string {
        return words.join('-');
    }

    private toSnake(words: string[]): string {
        return words.join('_');
    }

    private capitalize(word: string): string {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    private toSingularWords(words: string[]): string[] {
        const last = words[words.length - 1];
        if (!last) return words;

        const singular = this.singularize(last);
        return [...words.slice(0, -1), singular];
    }

    private toPluralWords(words: string[]): string[] {
        const last = words[words.length - 1];
        if (!last) return words;

        const plural = this.pluralize(last);
        return [...words.slice(0, -1), plural];
    }

    /** Naive English singularizer — good enough for identifiers */
    private singularize(word: string): string {
        if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
        if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes')) return word.slice(0, -2);
        if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
        return word;
    }

    /** Naive English pluralizer */
    private pluralize(word: string): string {
        if (word.endsWith('s')) return word; // already plural
        if (word.endsWith('y') && !this.isVowel(word.charAt(word.length - 2))) {
            return word.slice(0, -1) + 'ies';
        }
        if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
            return word + 'es';
        }
        return word + 's';
    }

    private isVowel(char: string): boolean {
        return 'aeiou'.includes(char.toLowerCase());
    }
}

export const namingEngine = new NamingEngine();
