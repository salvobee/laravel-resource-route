// Laravel-style resource route resolver in TypeScript

export type Action =
    | "index"
    | "create"
    | "store"
    | "show"
    | "edit"
    | "update"
    | "destroy";

export interface ResolverOptions {
    /**
     * Optional nested prefix (e.g., "/users/{user}" or "/companies/{company}/teams/{team}").
     * Placeholders inside {} will be replaced using `params`.
     */
    prefix?: string;
    /**
     * Force the resource parameter name (e.g., "photo"). Default: a simple singularization of the resource name.
     */
    resourceParam?: string;
    /**
     * Adds a trailing slash to the URL if true.
     */
    trailingSlash?: boolean;
    /**
     * Optional base URL (e.g., "https://api.example.com").
     */
    baseUrl?: string;
}

export type RouteFn = (name: string, params?: Record<string, unknown>) => string;

/**
 * Create a resolver that emulates Laravel resource route names and paths.
 *
 * Supported actions and examples:
 * - photos.index   -> GET    /photos
 * - photos.create  -> GET    /photos/create
 * - photos.store   -> POST   /photos
 * - photos.show    -> GET    /photos/{photo}
 * - photos.edit    -> GET    /photos/{photo}/edit
 * - photos.update  -> PUT    /photos/{photo}
 * - photos.destroy -> DELETE /photos/{photo}
 */
export function createLaravelResourceResolver(
    resource: string,
    opts: ResolverOptions = {}
): RouteFn {
    const {
        prefix = "",
        resourceParam,
        trailingSlash = false,
        baseUrl = "",
    } = opts;

    const singular = resourceParam ?? toSingular(resource);

    return function route(name: string, params: Record<string, unknown> = {}): string {
        // Expect "<resource>.<action>"
        const [res, action] = name.split(".") as [string, Action];

        if (res !== resource) {
            throw new Error(`Route resolver: expected resource "${resource}", got "${res}".`);
        }
        if (!isValidAction(action)) {
            throw new Error(`Route resolver: unknown action "${action}".`);
        }

        // Build URL path
        const usedKeys = new Set<string>();
        const prefixPath = replaceTokens(prefix, params, usedKeys);
        const root = `/${trimSlashes(resource)}`;

        // Resource-relative pattern
        const rel = actionToPath(action, singular, params, usedKeys);

        // Join into final URL
        let url = joinUrl(baseUrl, prefixPath, root, rel);

        if (trailingSlash && !url.endsWith("/")) url += "/";

        // Append query string for unused params
        const qs = buildQueryString(params, usedKeys);
        if (qs) url += `?${qs}`;

        return url;
    };
}

/**
 * Returns the expected HTTP method for a resource action.
 * Note: For "update" Laravel accepts PUT or PATCH. We return "PUT" by default.
 */
export function methodForAction(
    action: Action
): "GET" | "POST" | "PUT" | "PATCH" | "DELETE" {
    switch (action) {
        case "index":
        case "create":
        case "show":
        case "edit":
            return "GET";
        case "store":
            return "POST";
        case "update":
            return "PUT";
        case "destroy":
            return "DELETE";
    }
}

/* ------------------------ Helpers ------------------------ */

function isValidAction(x: string): x is Action {
    return (
        x === "index" ||
        x === "create" ||
        x === "store" ||
        x === "show" ||
        x === "edit" ||
        x === "update" ||
        x === "destroy"
    );
}

function toSingular(plural: string): string {
    // Minimal singularization for common English plurals.
    if (plural.endsWith("ies")) return plural.slice(0, -3) + "y";
    if (plural.endsWith("ses")) return plural.slice(0, -2); // e.g., "classes" -> "class"
    if (plural.endsWith("s")) return plural.slice(0, -1);
    return plural;
}

function trimSlashes(s: string): string {
    return s.replace(/^\/+|\/+$/g, "");
}

function joinUrl(...parts: (string | undefined)[]) {
    const cleaned = parts
        .filter(Boolean)
        .map((p) => trimSlashes(String(p)));
    let path = cleaned.join("/");
    if (!path.startsWith("http") && !path.startsWith("/")) path = "/" + path;
    return path.replace(/\/{2,}/g, "/");
}

function replaceTokens(
    template: string,
    params: Record<string, unknown>,
    used: Set<string>
) {
    if (!template) return "";
    return trimSlashes(
        template.replace(/\{(\w+)\}/g, (_, key: string) => {
            if (!(key in params)) {
                throw new Error(`Missing route prefix param: "${key}"`);
            }
            used.add(key);
            return encodeURIComponent(String(params[key]));
        })
    );
}

function actionToPath(
    action: Action,
    singular: string,
    params: Record<string, unknown>,
    used: Set<string>
): string {
    const idNeeded: Action[] = ["show", "edit", "update", "destroy"];
    const needsId = idNeeded.includes(action);

    let idSegment = "";
    if (needsId) {
        // Prefer the resource placeholder key (e.g., {photo}) else fallback to "id".
        const candidateKeys = [singular, "id"];
        const key = candidateKeys.find((k) => k in params);
        if (!key) {
            throw new Error(
                `Missing resource id param: expected "${singular}" or "id" for action "${action}".`
            );
        }
        used.add(key);
        idSegment = `/${encodeURIComponent(String(params[key]))}`;
    }

    switch (action) {
        case "index":
            return ""; // /photos
        case "create":
            return "/create"; // /photos/create
        case "store":
            return ""; // /photos
        case "show":
            return `${idSegment}`; // /photos/{photo}
        case "edit":
            return `${idSegment}/edit`; // /photos/{photo}/edit
        case "update":
            return `${idSegment}`; // /photos/{photo}
        case "destroy":
            return `${idSegment}`; // /photos/{photo}
    }
}

function buildQueryString(
    params: Record<string, unknown>,
    used: Set<string>
): string {
    const entries = Object.entries(params).filter(
        ([k, v]) => !used.has(k) && v !== undefined && v !== null
    );
    if (!entries.length) return "";
    const usp = new URLSearchParams();
    for (const [k, v] of entries) {
        if (Array.isArray(v)) {
            v.forEach((item) => usp.append(`${k}[]`, String(item)));
        } else {
            usp.append(k, String(v));
        }
    }
    return usp.toString();
}
