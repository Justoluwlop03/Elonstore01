# NOVA API

1. Copy `.env.example` to `.env` and set a valid MongoDB connection string, Cloudinary credentials, and a new random JWT secret. The previous `public/.env` credentials must be rotated.
2. Run `npm install` followed by `npm run dev` from this directory.

The React app should call this API with `credentials: "include"` so its httpOnly session cookie is sent.

## Main endpoints

- `POST /api/auth/register` — JSON: `name`, `email`, `password`
- `POST /api/auth/register-admin` — JSON: `name`, `email`, `password`
- `POST /api/auth/login` — JSON: `email`, `password`
- `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me`
- `GET /api/products`, `GET /api/products/:slug`
- `POST /api/products` — admin only; `multipart/form-data` with `name`, `category`, `description`, `price`, `oldPrice`, `color`, `stock`, and one to five `images` files
- `PATCH /api/products/:slug` — admin only; `multipart/form-data` with product fields, optional new `images`, and `imagesToRemove` as a JSON array of Cloudinary public IDs
- `DELETE /api/products/:slug` — admin only; deactivates the product
- `POST /api/orders` — authenticated customers; JSON `{ items: [{ slug, quantity }], shipping: { email, country, firstName, lastName, address, city, postalCode } }`. Validates stock and decrements inventory atomically.
- `GET /api/orders/mine` — authenticated customer order history
- `GET /api/orders` — admin order dashboard data
- `PATCH /api/orders/:id/status` — admin only; update to `Processing`, `Shipped`, `Delivered`, or `Cancelled`

The private invite code is for initial administrator bootstrap only. Once an administrator exists, public `/admin/signup` registration is blocked. Existing administrators should create additional admin accounts from the dashboard Users page through `POST /api/auth/admins`.
