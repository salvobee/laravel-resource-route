# Laravel Resource Route

A tiny TypeScript utility that resolves **Laravel resource route names** to paths, with optional nested prefixes and querystring handling.

It mirrors Laravel's conventional resource actions:

| Verb      | URI                      | Action   | Route Name        |
|-----------|--------------------------|----------|-------------------|
| GET       | /photos                  | index    | photos.index      |
| GET       | /photos/create           | create   | photos.create     |
| POST      | /photos                  | store    | photos.store      |
| GET       | /photos/{photo}          | show     | photos.show       |
| GET       | /photos/{photo}/edit     | edit     | photos.edit       |
| PUT/PATCH | /photos/{photo}          | update   | photos.update     |
| DELETE    | /photos/{photo}          | destroy  | photos.destroy    |

## Install

```bash
npm i @salvobee/laravel-resource-route
# or
yarn add @salvobee/laravel-resource-route
# or
pnpm add @salvobee/laravel-resource-route
```

## Quick start (TypeScript)
```typescript
import { createLaravelResourceResolver } from "@salvobee/laravel-resource-route";

const route = createLaravelResourceResolver("photos");

// "/photos"
route("photos.index");

// "/photos/create"
route("photos.create");

// "/photos/42"
route("photos.show", { photo: 42 });
// also works with fallback key "id":
route("photos.show", { id: 42 });

// "/photos/42/edit"
route("photos.edit", { photo: 42 });
```

### With nested prefixes

```typescript
const nested = createLaravelResourceResolver("photos", {
    prefix: "/users/{user}",
});
// "/users/7/photos/42"
nested("photos.show", { user: 7, photo: 42 });
```

Placeholders in the prefix (e.g., {user}) are replaced from params. Any extra params not used in the path will be appended as a querystring.

### Base URL & trailing slash

```typescript
const apiRoute = createLaravelResourceResolver("photos", {
  baseUrl: "https://api.example.com",
  trailingSlash: true,
});
// "https://api.example.com/photos/"
apiRoute("photos.index");
```

### HTTP method helper
```typescript
import { methodForAction } from "@salvobee/laravel-resource-route";

methodForAction("index");  // "GET"
methodForAction("store");  // "POST"
methodForAction("update"); // "PUT" (Laravel accepts PUT or PATCH)
```

## JavaScript usage (CJS)
```javascript
const {
  createLaravelResourceResolver,
  methodForAction,
} = require("@salvobee/laravel-resource-route");

const route = createLaravelResourceResolver("photos");
console.log(route("photos.show", { id: 99 })); // "/photos/99"
```

## Typing notes
* If you pass resourceParam, that exact key is required for ID-bound actions (show, edit, update, destroy); otherwise the resolver falls back to a minimal singularization of the resource name (e.g., "photos" -> "photo"), with id as a second fallback key.
* Arrays in extra params become key[]=v1&key[]=v2 in the querystring.

## License
MIT © Salvo Bee