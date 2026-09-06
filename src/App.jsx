import { useCallback, useEffect, useRef, useState } from "react";
import {
    BrowserRouter,
    Link,
    Route,
    Routes,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
import {
    ArrowRight,
    BarChart3,
    CheckCircle2,
    ChevronDown,
    Clock3,
    DollarSign,
    Eye,
    EyeOff,
    Menu,
    Minus,
    Package,
    Plus,
    ShoppingBag,
    Star,
    Upload,
    UserRound,
    X,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./App.css";
import "./admin.css";
import "./loader.css";
import { api, toStoreProduct } from "./api";

gsap.registerPlugin(ScrollTrigger);
function Header({ count, onCart, user }) {
    const [open, setOpen] = useState(false);
    return (
        <header className="nav">
            <Link to="/" className="logo">
                Elon Store
            </Link>
            <nav className={open ? "nav-links open" : "nav-links"}>
                <Link to="/shop">Shop</Link>
                <Link to="/shop">
                    Categories <ChevronDown size={14} />
                </Link>
                <Link to="/about">Our story</Link>
                <Link to="/profile">Profile</Link>
                {user?.role === "admin" && <Link to="/admin">Admin</Link>}
            </nav>
            <div className="nav-actions">
                <button onClick={onCart} className="bag" aria-label="Cart">
                    <ShoppingBag size={18} />
                    <b>{count}</b>
                </button>
                <button
                    className="mobile-menu"
                    onClick={() => setOpen(!open)}
                    aria-label="Menu"
                >
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
        </header>
    );
}
function AppLoader() {
    return (
        <main className="app-loader" aria-label="Loading Elon Store">
            <div className="loader-mark">Elon Store</div>
            <div className="loader-track"><i /></div>
            <p>Preparing your space...</p>
        </main>
    );
}
function ProductVisual({ product, className = "" }) {
    return product.image ? (
        <img className={className} src={product.image} alt={product.name} />
    ) : (
        <div className={`product-placeholder ${className}`} aria-label={`${product.name} image pending`}>
            <span>{product.category}</span>
            <strong>{product.name}</strong>
            <small>Image pending</small>
        </div>
    );
}
function ProductCard({ product, onAdd }) {
    return (
        <article className="product-card">
            <Link to={`/product/${product.id}`} className="product-image">
                <ProductVisual product={product} />
                {product.oldPrice && <span className="sale">Sale</span>}
                <button className="quick" onClick={(e) => e.preventDefault()}>
                    Quick view <ArrowRight size={14} />
                </button>
            </Link>
            <div className="product-meta">
                <div>
                    <p className="eyebrow">{product.category}</p>
                    <Link to={`/product/${product.id}`} className="product-name">
                        {product.name}
                    </Link>
                </div>
                <div className="rating">
                    <Star size={12} fill="currentColor" /> {product.rating}
                </div>
            </div>
            <div className="price-row">
                <span>₦{product.price}</span>
                {product.oldPrice && <del>₦{product.oldPrice}</del>}
                <button
                    className="add-mini"
                    onClick={() => onAdd(product)}
                    aria-label={`Add ${product.name} to cart`}
                >
                    <Plus size={16} />
                </button>
            </div>
        </article>
    );
}
function groupCartItems(items) {
    return [...items.reduce((groups, item) => {
        const current = groups.get(item.id);
        if (current) current.quantity += 1;
        else groups.set(item.id, { product: item, quantity: 1 });
        return groups;
    }, new Map()).values()];
}
function CartDrawer({ items, open, onClose, onAdd, onRemove, notice }) {
    const cartItems = groupCartItems(items);
    const drawerContent = items.length ? (
        cartItems.map(({ product: p, quantity }) => (
            <div className="drawer-item" key={p.id}>
                <ProductVisual product={p} />
                <div>
                    <strong>{p.name}</strong>
                    <small>{p.color || "Standard"}</small>
                    <div className="cart-quantity">
                        <button onClick={() => onRemove(p.id)} aria-label={`Decrease ${p.name} quantity`}><Minus size={12} /></button>
                        <span>Qty {quantity}</span>
                        <button onClick={() => onAdd(p)} disabled={p.stock !== undefined && quantity >= p.stock} aria-label={`Increase ${p.name} quantity`}><Plus size={12} /></button>
                    </div>
                    <span>₦{p.price * quantity}</span>
                </div>
                <button onClick={() => onRemove(p.id, quantity)} aria-label={`Remove ${p.name}`}>
                    <X size={14} />
                </button>
            </div>
        ))
    ) : (
        <div className="empty">
            <ShoppingBag size={34} />
            <p>Your bag is waiting.</p>
            <Link to="/shop" onClick={onClose}>
                Continue shopping <ArrowRight size={15} />
            </Link>
        </div>
    );
    return (
        <div className="cart-layer">
            <div className={open ? "scrim visible" : "scrim"} onClick={onClose} />
            <aside className={open ? "cart-drawer open" : "cart-drawer"}>
                <div className="drawer-head">
                    <h3>
                        Your bag <span>{items.length}</span>
                    </h3>
                    <button onClick={onClose} aria-label="Close cart">
                        <X size={20} />
                    </button>
                </div>
                {notice && <p className="cart-notice" role="status">{notice}</p>}
                {drawerContent}
                {items.length > 0 && (
                    <div>
                        <div className="drawer-total">
                            <span>Subtotal</span>
                            <strong>
                                ₦{items.reduce((sum, item) => sum + item.price, 0)}
                            </strong>
                        </div>
                        <Link to="/checkout" onClick={onClose} className="button dark full">
                            Checkout <ArrowRight size={16} />
                        </Link>
                    </div>
                )}
            </aside>
        </div>
    );
}
function Layout({ children, items, setCartOpen, user }) {
    return (
        <>
            <Header count={items.length} onCart={() => setCartOpen(true)} user={user} />
            {children}
            <footer>
                <div className="footer-brand">
                    <div className="logo">
                        Elon Store
                    </div>
                    <p>Appliances for a life well lived.</p>
                </div>
                <div>
                    <p className="eyebrow">Explore</p>
                    <Link to="/shop">Shop all</Link>
                    <Link to="/about">Our story</Link>
                </div>
                <div>
                    <p className="eyebrow">Follow along</p>
                    <a href="#instagram">Instagram</a>
                    <a href="#pinterest">Pinterest</a>
                    <a href="#journal">Journal</a>
                </div>
                <div className="footer-note">
                    © 2024 Elon Store
                    <br />
                    Made with intention.
                </div>
            </footer>
        </>
    );
}
function Home({ add, products }) {
    const hero = useRef();
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".hero-copy > *", {
                y: 35,
                opacity: 0,
                duration: 1,
                stagger: 0.12,
                ease: "power3.out",
            });
            gsap.from(".hero-visual", {
                scale: 0.9,
                opacity: 0,
                duration: 1.3,
                ease: "power3.out",
            });
            gsap.utils
                .toArray(".reveal")
                .forEach((el) =>
                    gsap.from(el, {
                        y: 35,
                        opacity: 0,
                        duration: 0.8,
                        scrollTrigger: { trigger: el, start: "top 85%" },
                    }),
                );
        }, hero);
        return () => ctx.revert();
    }, []);
    return (
        <main ref={hero}>
            <section className="hero">
                <div className="hero-copy">
                    <p className="eyebrow">Elon Store / Appliances for everyday rituals</p>
                    <h1>
                        Everyday,
                        <br />
                        <em>elevated.</em>
                    </h1>
                    <p className="hero-sub">
                        Thoughtfully designed appliances for modern living.
                    </p>
                    <div className="hero-buttons">
                        <Link className="button dark" to="/shop">
                            Shop now <ArrowRight size={16} />
                        </Link>
                        <Link className="text-link" to="/shop">
                            Explore collection <ArrowRight size={15} />
                        </Link>
                    </div>
                    <div className="hero-index">
                        <span>01</span>
                        <i />
                        <span>04</span>
                    </div>
                </div>
                <div className="hero-visual">
                    <img
                        className="hero-electronics"
                        src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=90"
                        alt="Modern electronics and wireless headphones"
                    />
                    <div className="hero-scan" />
                    <div className="hero-caption">
                        <span>Featured technology</span>
                        <strong>Everyday / Form 01</strong>
                    </div>
                </div>
            </section>
            <section className="marquee">
                <span>Made for the moments between</span>
                <span>·</span>
                <span>Considered materials</span>
                <span>·</span>
                <span>Quietly iconic</span>
                <span>·</span>
            </section>
            <section className="section featured">
                <div className="section-head reveal">
                    <div>
                        <p className="eyebrow">The edit / 01</p>
                        <h2>Made for the moments between.</h2>
                    </div>
                    <Link to="/shop" className="text-link">
                        View all <ArrowRight size={15} />
                    </Link>
                </div>
                <div className="product-grid">
                    {products.slice(0, 4).map((p) => (
                        <ProductCard key={p.id} product={p} onAdd={add} />
                    ))}
                </div>
            </section>
            <section className="story-band">
                <div className="story-img" />
                <div className="story-copy reveal">
                    <p className="eyebrow">A quieter kind of luxury</p>
                    <h2>
                        Good design leaves
                        <br />
                        <em>room to live.</em>
                    </h2>
                    <p>
                        We believe the appliances around us should feel as good as they
                        look. Elon Store brings considered form, honest materials and lasting
                        utility to the everyday.
                    </p>
                    <Link to="/about" className="text-link">
                        Our story <ArrowRight size={15} />
                    </Link>
                </div>
            </section>
            <section className="section arrivals">
                <div className="section-head reveal">
                    <div>
                        <p className="eyebrow">The edit / 02</p>
                        <h2>New arrivals</h2>
                    </div>
                    <Link to="/shop" className="text-link">
                        Shop new <ArrowRight size={15} />
                    </Link>
                </div>
                <div className="product-grid">
                    {products.slice(2, 6).map((p) => (
                        <ProductCard key={p.id} product={p} onAdd={add} />
                    ))}
                </div>
            </section>
            <section className="quote">
                <p>“</p>
                <blockquote>
                    We don't need more things.
                    <br />
                    We need better ones.
                </blockquote>
                <small>Elon Store journal / 001</small>
            </section>
        </main>
    );
}
function Shop({ add, products }) {
    return (
        <main className="page">
            <div className="page-intro">
                <p className="eyebrow">Elon Store / Collection</p>
                <h1>
                    The full
                    <br />
                    <em>collection.</em>
                </h1>
                <p>
                    Thoughtful appliances for cooking, cleaning and caring for the spaces
                    you call home.
                </p>
            </div>
            <div className="shop-toolbar">
                <span>{products.length} products</span>
                <button>
                    Sort by <strong>Featured</strong> <ChevronDown size={14} />
                </button>
            </div>
            <div className="product-grid shop-grid">
                {products.length ? products.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={add} />
                )) : <div className="catalog-empty"><Package size={24} /><p>No products have been added yet.</p><Link to="/admin" className="text-link">Open admin <ArrowRight size={15} /></Link></div>}
            </div>
        </main>
    );
}
function ProductPage({ add, products }) {
    const { id } = useParams();
    const p = products.find((x) => x.id === id);
    const [qty, setQty] = useState(1);
    if (!p) return <SimplePage title={<>Product<br /><em>not found.</em></>}><p>This catalog is empty. Add a product from the admin dashboard.</p><Link to="/admin" className="button dark">Open admin <ArrowRight size={16} /></Link></SimplePage>;
    return (
        <main className="page product-page">
            <div className="breadcrumbs">
                <Link to="/shop">Collection</Link> / {p.name}
            </div>
            <div className="product-detail">
                <div className="gallery">
                    <ProductVisual product={p} />
                    <ProductVisual product={products[(products.findIndex((product) => product.id === p.id) + 1) % products.length] || p} />
                </div>
                <div className="detail-copy">
                    <p className="eyebrow">
                        {p.category} / Elon Store {p.id}
                    </p>
                    <h1>{p.name}</h1>
                    <div className="detail-rating">
                        <Star size={14} fill="currentColor" /> {p.rating}{" "}
                        <span>48 reviews</span>
                    </div>
                    <div className="detail-price">
                        ₦{p.price} {p.oldPrice && <del>₦{p.oldPrice}</del>}
                    </div>
                    <p className="detail-description">
                        A considered study in proportion and material. Designed to bring a
                        sense of calm utility to the spaces we inhabit.
                    </p>
                    <div className="option">
                        <label>
                            Color <strong>{p.color}</strong>
                        </label>
                        <div className="swatch selected" />
                    </div>
                    <div className="buy-row">
                        <div className="quantity">
                            <button onClick={() => setQty(Math.max(1, qty - 1))}>
                                <Minus size={14} />
                            </button>
                            <span>{qty}</span>
                            <button onClick={() => setQty(Math.min(p.stock || 1, qty + 1))}>
                                <Plus size={14} />
                            </button>
                        </div>
                        <button className="button dark" onClick={() => add(p, qty)} disabled={!p.stock}>
                            Add to bag <ShoppingBag size={16} />
                        </button>
                    </div>
                    <details open>
                        <summary>
                            Product details <Plus size={15} />
                        </summary>
                        <p>
                            Solid materials, carefully finished. Ships free in 3–5 business
                            days. Designed in Copenhagen, made with trusted partners.
                        </p>
                    </details>
                    <details>
                        <summary>
                            Shipping & returns <Plus size={15} />
                        </summary>
                        <p>
                            Free shipping on orders over ₦150. Returns accepted within 30
                            days.
                        </p>
                    </details>
                </div>
            </div>
            <section className="section related">
                <div className="section-head">
                    <h2>You may also like</h2>
                </div>
                <div className="product-grid">
                    {products.slice(0, 4).map((x) => (
                        <ProductCard key={x.id} product={x} onAdd={add} />
                    ))}
                </div>
            </section>
        </main>
    );
}
function SimplePage({ title, children }) {
    return (
        <main className="page simple-page">
            <p className="eyebrow">Elon Store / Information</p>
            <h1>{title}</h1>
            {children}
        </main>
    );
}
function NotFound() {
    return (
        <SimplePage title={<>Page<br /><em>not found.</em></>}>
            <p>The page you are looking for does not exist.</p>
            <Link to="/" className="button dark">
                Back to home <ArrowRight size={16} />
            </Link>
        </SimplePage>
    );
}
function AuthPage({ mode = "login", onAuthenticated }) {
    const isSignup = mode === "signup";
    const isAdminSignup = mode === "admin-signup";
    const location = useLocation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const submit = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const email = form.get("email");
        const password = form.get("password");
        if (!email || !password || ((isSignup || isAdminSignup) && !form.get("name"))) {
            setError("Please complete all required fields.");
            return;
        }
        if (password.length < 8) {
            setError("Your password must be at least 8 characters.");
            return;
        }
        setError("");
        try {
            const response = await api(isAdminSignup ? "/auth/register-admin" : isSignup ? "/auth/register" : "/auth/login", {
                method: "POST",
                body: JSON.stringify(isAdminSignup || isSignup ? { name: form.get("name"), email, password, ...(isAdminSignup ? { inviteCode: form.get("inviteCode") } : {}) } : { email, password }),
            });
            onAuthenticated(response.user);
            setSubmitted(true);
            navigate(response.user.role === "admin" ? (location.state?.from || "/admin") : "/profile", { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        }
    };
    return (
        <main className="auth-page">
            <div className="auth-intro">
                <p className="eyebrow">Elon Store / Member access</p>
                <h1>{isSignup ? <>Make room<br /><em>for better.</em></> : <>Welcome<br /><em>back.</em></>}</h1>
                <p>{isAdminSignup ? "Create a protected Elon Store administrator account to manage the catalog and orders." : isSignup ? "Create an account to save your appliances, track orders and move through checkout faster." : "Sign in to access your saved appliances and order history."}</p>
            </div>
            <section className="auth-panel">
                {submitted ? <div className="auth-success"><CheckCircle2 size={30} /><p className="eyebrow">You're in</p><h2>{isAdminSignup ? "Your admin account is ready." : isSignup ? "Your Elon Store account is ready." : "Welcome back to Elon Store."}</h2><Link className="button dark" to={isAdminSignup ? "/admin" : "/profile"}>{isAdminSignup ? "Open admin" : "View your account"} <ArrowRight size={16} /></Link></div> : <form className="auth-form" onSubmit={submit}><div className="auth-form-heading"><p className="eyebrow">{isAdminSignup ? "Admin account" : isSignup ? "Create account" : "Sign in"}</p><h2>{isAdminSignup ? "Create administrator" : isSignup ? "Join Elon Store" : "Your account"}</h2></div>{(isSignup || isAdminSignup) && <label>Full name<input name="name" type="text" autoComplete="name" placeholder="Your name" /></label>}<label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label>{isAdminSignup && <label>Administrator invite code<input name="inviteCode" type="password" required autoComplete="off" placeholder="Invite code" /></label>}<label>Password<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup || isAdminSignup ? "new-password" : "current-password"} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>{isSignup && <label className="auth-check"><input type="checkbox" required /> I agree to the Elon Store terms and privacy policy.</label>}{error && <p className="auth-error">{error}</p>}<button className="button dark full" type="submit">{isAdminSignup ? "Create admin account" : isSignup ? "Create account" : "Sign in"} <ArrowRight size={16} /></button>{!isSignup && !isAdminSignup && <Link className="forgot-link" to="/admin/signup">Administrator signup</Link>}<p className="auth-switch">{isAdminSignup ? "Need a customer account?" : isSignup ? "Already a member?" : "New to Elon Store?"} <Link to={isAdminSignup || isSignup ? "/login" : "/signup"}>{isAdminSignup || isSignup ? "Sign in" : "Create an account"}</Link></p></form>}
            </section>
        </main>
    );
}
function Profile({ user, onUserUpdated, onLogout }) {
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [error, setError] = useState("");
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState("");
    useEffect(() => {
        let active = true;
        api("/orders/mine")
            .then((response) => { if (active) setOrders(Array.isArray(response.orders) ? response.orders : []); })
            .catch((requestError) => { if (active) setOrdersError(requestError.message); })
            .finally(() => { if (active) setOrdersLoading(false); });
        return () => { active = false; };
    }, []);
    const saveProfile = async (event) => {
        event.preventDefault();
        try {
            const response = await api("/auth/me", { method: "PATCH", body: JSON.stringify({ name, email }) });
            onUserUpdated(response.user);
            setEditing(false);
            setSaved(true);
            setError("");
            setTimeout(() => setSaved(false), 2500);
        } catch (requestError) { setError(requestError.message); }
    };
    const updatePreference = async (key, value) => {
        try {
            const response = await api("/auth/me", { method: "PATCH", body: JSON.stringify({ preferences: { [key]: value } }) });
            onUserUpdated(response.user);
        } catch (requestError) { setError(requestError.message); }
    };
    return (
        <main className="profile-page">
            <div className="profile-heading"><div><p className="eyebrow">Elon Store / Account</p><h1>Your <em>profile.</em></h1><p>Manage your details, preferences and Elon Store orders.</p></div><div className="profile-avatar"><UserRound size={25} /></div></div>
            <div className="profile-grid">
                <section className="profile-panel profile-details"><div className="profile-panel-head"><div><p className="eyebrow">Personal details</p><h2>Account information</h2></div><button className="profile-edit" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit"}</button></div>{editing ? <form className="profile-form" onSubmit={saveProfile}><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="button dark" type="submit">Save changes <CheckCircle2 size={15} /></button></form> : <div className="profile-values"><div><span>Full name</span><strong>{user.name}</strong></div><div><span>Email address</span><strong>{user.email}</strong></div><div><span>Member since</span><strong>{new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong></div></div>}{saved && <p className="profile-saved">Profile updated.</p>}</section>
                <section className="profile-panel profile-preferences"><p className="eyebrow">Preferences</p><h2>Make it yours.</h2><label className="profile-toggle"><span><strong>New arrival notes</strong><small>Get occasional updates from Elon Store.</small></span><input type="checkbox" checked={user.preferences.newArrivalNotes} onChange={(event) => updatePreference("newArrivalNotes", event.target.checked)} /><i /></label><label className="profile-toggle"><span><strong>Order updates</strong><small>Receive delivery notifications.</small></span><input type="checkbox" checked={user.preferences.orderUpdates} onChange={(event) => updatePreference("orderUpdates", event.target.checked)} /><i /></label></section>
            </div>
            <section className="profile-panel profile-orders"><div className="profile-panel-head"><div><p className="eyebrow">Order history</p><h2>Your recent orders</h2></div><Link to="/shop" className="text-link">Shop appliances <ArrowRight size={15} /></Link></div><div className="profile-order-list">{ordersLoading ? <p>Loading your orders...</p> : ordersError ? <p className="auth-error">{ordersError}</p> : orders.length ? orders.map((order) => <div key={order._id}><strong>{order.orderNumber}</strong><span>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</span><small>{new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small><b className={`profile-order-status ${order.status === "Delivered" ? "delivered" : ""}`}>{order.status}</b></div>) : <p>You have not placed any orders yet.</p>}</div></section>
            {error && <p className="auth-error">{error}</p>}<button onClick={onLogout} className="profile-signout">Sign out <ArrowRight size={14} /></button>
        </main>
    );
}
function PaymentVerification({ user, onPaid }) {
    const location = useLocation();
    const reference = new URLSearchParams(location.search).get("reference");
    const [state, setState] = useState({ loading: true, order: null, error: "" });
    useEffect(() => {
        if (!user || !reference) return;
        api("/orders/payment/verify", { method: "POST", body: JSON.stringify({ reference }) })
            .then((response) => { onPaid(); setState({ loading: false, order: response.order, error: "" }); })
            .catch((requestError) => setState({ loading: false, order: null, error: requestError.message }));
    }, [reference, onPaid, user]);
    if (!user) return <SimplePage title={<>Payment<br /><em>verification.</em></>}><p>Please sign in to verify your payment.</p><Link to="/login" className="button dark">Sign in <ArrowRight size={16} /></Link></SimplePage>;
    if (!reference) return <SimplePage title={<>Payment<br /><em>not completed.</em></>}><p>No Paystack payment reference was provided.</p><Link to="/checkout" className="button dark">Return to checkout <ArrowRight size={16} /></Link></SimplePage>;
    if (state.loading) return <SimplePage title={<>Verifying<br /><em>payment.</em></>}><p>Please wait while we confirm your Paystack payment.</p></SimplePage>;
    if (state.order) return <SimplePage title={<>Order<br /><em>confirmed.</em></>}><p>{state.order.orderNumber} has been paid and is being prepared for delivery.</p><Link to="/profile" className="button dark">View your orders <ArrowRight size={16} /></Link></SimplePage>;
    return <SimplePage title={<>Payment<br /><em>not completed.</em></>}><p>{state.error}</p><Link to="/checkout" className="button dark">Return to checkout <ArrowRight size={16} /></Link></SimplePage>;
}
function Checkout({ items, user }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const submitOrder = async (event) => {
        event.preventDefault();
        if (!items.length) return setError("Your bag is empty.");
        setSubmitting(true); setError("");
        const form = new FormData(event.currentTarget);
        try {
            const response = await api("/orders", { method: "POST", body: JSON.stringify({ items: groupCartItems(items).map(({ product, quantity }) => ({ slug: product.id, quantity })), shipping: Object.fromEntries(form.entries()) }) });
            window.location.assign(response.authorizationUrl);
        } catch (requestError) { setError(requestError.message); } finally { setSubmitting(false); }
    };
    if (!user) return <SimplePage title={<>Sign in<br /><em>to checkout.</em></>}><p>You need an account to place an order.</p><Link to="/login" state={{ from: "/checkout" }} className="button dark">Sign in <ArrowRight size={16} /></Link></SimplePage>;
    return (
        <main className="page checkout">
            <div className="checkout-head">
                <Link to="/" className="logo">
                    Elon Store
                </Link>
                <span>Secure checkout</span>
            </div>
            <div className="checkout-grid">
                <div>
                    <p className="eyebrow">01 / Delivery</p>
                    <h1>
                        Almost
                        <br />
                        <em>yours.</em>
                    </h1>
                    <form className="form-grid" onSubmit={submitOrder}>
                        <input name="email" type="email" defaultValue={user.email} required placeholder="Email address" />
                        <input name="phone" type="tel" required placeholder="Phone number" />
                        <input name="country" required placeholder="Country / Region" />
                        <input name="firstName" required placeholder="First name" />
                        <input name="lastName" required placeholder="Last name" />
                        <input name="address" className="wide" required placeholder="Address" />
                        <input name="city" required placeholder="City" />
                        <input name="postalCode" required placeholder="Postal code" />
                        {error && <p className="auth-error wide">{error}</p>}
                        <button className="button dark full wide" disabled={submitting || !items.length}>
                            Continue to payment <ArrowRight size={16} />
                        </button>
                    </form>
                </div>
                <div className="order-summary">
                    <p className="eyebrow">Your order</p>
                    {items.length ? (
                        groupCartItems(items).map(({ product: p, quantity }) => (
                            <div className="summary-item" key={p.id}>
                                <ProductVisual product={p} />
                                <span>
                                    {p.name}
                                    <small>Qty {quantity}</small>
                                </span>
                                <strong>₦{p.price * quantity}</strong>
                            </div>
                        ))
                    ) : (
                        <p>Your bag is empty.</p>
                    )}
                    <div className="summary-total">
                        <span>Total</span>
                        <strong>₦{items.reduce((s, p) => s + p.price, 0)}</strong>
                    </div>
                </div>
            </div>
        </main>
    );
}
function SalesChart({ orders }) {
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        return { date, total: 0 };
    });
    orders.forEach((order) => {
        const orderDate = new Date(order.createdAt); orderDate.setHours(0, 0, 0, 0);
        const day = days.find((entry) => entry.date.getTime() === orderDate.getTime());
        if (day) day.total += order.total;
    });
    const max = Math.max(...days.map((day) => day.total), 1);
    const points = days.map((day, index) => ({ ...day, x: (index / (days.length - 1)) * 100, y: 92 - (day.total / max) * 78 }));
    const line = points.map((point) => `${point.x},${point.y}`).join(" ");
    const area = `0,100 ${line} 100,100`;
    if (!orders.length) return <div className="admin-empty-chart"><BarChart3 size={24} /><p>Sales data will appear here after your first paid order.</p></div>;
    return <div className="sales-chart" aria-label="Sales over the last seven days"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"><defs><linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#b8cbb0" stopOpacity=".8" /><stop offset="1" stopColor="#b8cbb0" stopOpacity=".08" /></linearGradient></defs><polygon className="sales-area" points={area} fill="url(#sales-fill)" /><polyline className="sales-line" points={line} fill="none" pathLength="1" />{points.map((point, index) => <circle className="sales-dot" key={point.x} cx={point.x} cy={point.y} r="1.8" style={{ "--delay": `${index * 100}ms` }} />)}</svg><div className="sales-labels">{days.map((day) => <span key={day.date.toISOString()}>{day.date.toLocaleDateString(undefined, { weekday: "short" })}</span>)}</div></div>;
}
function Admin({ products, categories, onCategoryCreated, onCategoryUpdated, onCategoryDeleted, onProductCreated, onProductUpdated, user }) {
    const [productName, setProductName] = useState("");
    const [productPrice, setProductPrice] = useState("");
    const [productOldPrice, setProductOldPrice] = useState("");
    const [productCategory, setProductCategory] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [addingCategory, setAddingCategory] = useState(false);
    const [categoryModal, setCategoryModal] = useState(null);
    const [categoryDraft, setCategoryDraft] = useState("");
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryError, setCategoryError] = useState("");
    const [productDescription, setProductDescription] = useState("");
    const [productColor, setProductColor] = useState("");
    const [productStock, setProductStock] = useState("0");
    const [productImage, setProductImage] = useState("");
    const [productImageName, setProductImageName] = useState("");
    const [productFiles, setProductFiles] = useState([]);
    const [uploadError, setUploadError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState("");
    const completedOrders = orders.filter((order) => order.payment?.status === "success");
    const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = completedOrders.length ? Math.round(totalSales / completedOrders.length) : 0;
    useEffect(() => {
        if (!user || user.role !== "admin") return;
        api("/orders").then((response) => setOrders(response.orders)).catch((requestError) => setOrdersError(requestError.message)).finally(() => setOrdersLoading(false));
    }, [user]);
    const addProduct = async (event) => {
        event.preventDefault();
        if (!productName || !productPrice || !productFiles.length) { setUploadError("Enter a name and price, then select at least one image."); return; }
        setUploading(true); setUploadError("");
        try {
            const body = new FormData();
            body.append("name", productName);
            body.append("category", productCategory);
            body.append("price", productPrice);
            body.append("oldPrice", productOldPrice);
            body.append("description", productDescription);
            body.append("color", productColor);
            body.append("stock", productStock);
            productFiles.forEach((file) => body.append("images", file));
            const response = await api("/products", { method: "POST", body });
            const product = toStoreProduct(response.product);
            onProductCreated(product);
            setProductName(""); setProductPrice(""); setProductOldPrice(""); setProductDescription(""); setProductColor(""); setProductStock("0"); setProductImage(""); setProductImageName(""); setProductFiles([]);
        } catch (requestError) { setUploadError(requestError.message); } finally { setUploading(false); }
    };
    const addCategory = async (event) => {
        event.preventDefault();
        if (!categoryName.trim()) return;
        setAddingCategory(true); setUploadError("");
        try {
            const response = await api("/categories", { method: "POST", body: JSON.stringify({ name: categoryName }) });
            onCategoryCreated(response.category);
            setProductCategory(response.category.name);
            setCategoryName("");
        } catch (requestError) { setUploadError(requestError.message); }
        finally { setAddingCategory(false); }
    };
    const editCategory = (category) => {
        setCategoryDraft(category.name); setCategoryError(""); setCategoryModal({ mode: "edit", category });
    };
    const performCategoryDelete = async (category) => {
        setCategorySaving(true); setCategoryError("");
        try { await api(`/categories/${category._id}`, { method: "DELETE" }); onCategoryDeleted(category._id); if (productCategory === category.name) setProductCategory(""); setCategoryModal(null); }
        catch (requestError) { setCategoryError(requestError.message); }
        finally { setCategorySaving(false); }
    };
    const deleteCategory = (category) => {
        setCategoryError(""); setCategoryModal({ mode: "delete", category });
    };
    const saveCategory = async (event) => {
        event.preventDefault();
        const name = categoryDraft.trim();
        if (!name) { setCategoryError("Enter a category name."); return; }
        if (name === categoryModal.category.name) { setCategoryModal(null); return; }
        setCategorySaving(true); setCategoryError("");
        try { const response = await api(`/categories/${categoryModal.category._id}`, { method: "PATCH", body: JSON.stringify({ name }) }); onCategoryUpdated(response.category); if (productCategory === categoryModal.category.name) setProductCategory(response.category.name); setCategoryModal(null); }
        catch (requestError) { setCategoryError(requestError.message); }
        finally { setCategorySaving(false); }
    };
    const selectProductImage = (event) => {
        const files = [...event.target.files].slice(0, 5);
        if (!files.length) return;
        setProductFiles(files);
        setProductImageName(files.map((file) => file.name).join(", "));
        const reader = new FileReader();
        reader.onload = () => setProductImage(reader.result);
        reader.readAsDataURL(files[0]);
    };
    const saveProduct = async (event) => {
        event.preventDefault();
        setUploadError("");
        setUploading(true);
        try {
            const form = new FormData(event.currentTarget);
            const imagesToRemove = form.getAll("imagesToRemove");
            const fields = Object.fromEntries(["name", "category", "description", "price", "oldPrice", "color", "stock"].map((field) => [field, form.get(field) || ""]));
            const body = productFiles.length || imagesToRemove.length ? new FormData() : JSON.stringify(fields);
            if (body instanceof FormData) {
                Object.entries(fields).forEach(([field, value]) => body.append(field, value));
                body.append("imagesToRemove", JSON.stringify(imagesToRemove));
                productFiles.forEach((file) => body.append("images", file));
            }
            const response = await api(`/products/${editingProduct.id}`, { method: "PATCH", body });
            onProductUpdated(toStoreProduct(response.product));
            setEditingProduct(null);
            setProductFiles([]); setProductImage(""); setProductImageName("");
        } catch (requestError) { setUploadError(requestError.message); }
        finally { setUploading(false); }
    };
    const deleteProduct = async (product) => {
        setDeleting(true); setUploadError("");
        try {
            await api(`/products/${product.id}`, { method: "DELETE" });
            onProductUpdated(product, true);
            setDeleteTarget(null);
        } catch (requestError) { setUploadError(requestError.message); }
        finally { setDeleting(false); }
    };
    const advanceOrder = async (order, index) => {
        const next = { Processing: "Shipped", Shipped: "Delivered", Delivered: "Delivered" };
        try {
            const response = await api(`/orders/${order._id}/status`, { method: "PATCH", body: JSON.stringify({ status: next[order.status] }) });
            setOrders((current) => current.map((currentOrder, orderIndex) => orderIndex === index ? response.order : currentOrder));
        } catch (requestError) { setOrdersError(requestError.message); }
    };
    if (!user) return <SimplePage title={<>Sign in<br /><em>to continue.</em></>}><p>Sign in with an administrator account to manage the catalog.</p><Link to="/login" state={{ from: "/admin" }} className="button dark">Sign in <ArrowRight size={16} /></Link></SimplePage>;
    if (user.role !== "admin") return <SimplePage title={<>Admin<br /><em>access required.</em></>}><p>Your account does not have permission to manage the catalog.</p><Link to="/" className="button dark">Return to store <ArrowRight size={16} /></Link></SimplePage>;
    return (
        <main className="admin-page">
            <div className="admin-topbar">
                <div><p className="eyebrow">Elon Store / Studio console</p><h1>Good morning, <em>admin.</em></h1></div>
                <div className="admin-topbar-links"><Link to="/admin/users" className="admin-store-link">Users</Link><Link to="/" className="admin-store-link">View storefront <ArrowRight size={15} /></Link></div>
            </div>
            <div className="admin-stats">
                <div className="admin-stat"><span className="stat-icon"><DollarSign size={17} /></span><p className="eyebrow">Net sales / 30 days</p><strong>₦{totalSales}</strong><small>{completedOrders.length ? "From persisted orders" : "No sales data yet"}</small></div>
                <div className="admin-stat"><span className="stat-icon"><ShoppingBag size={17} /></span><p className="eyebrow">Orders</p><strong>{completedOrders.length}</strong><small>{completedOrders.length ? "Persisted orders" : "No orders yet"}</small></div>
                <div className="admin-stat"><span className="stat-icon"><BarChart3 size={17} /></span><p className="eyebrow">Average order value</p><strong>₦{averageOrderValue}</strong><small>{completedOrders.length ? "Across active orders" : "No order data yet"}</small></div>
            </div>
            <div className="admin-main-grid">
                <section className="admin-panel sales-panel"><div className="admin-panel-head"><div><p className="eyebrow">Performance</p><h2>Sales overview</h2></div><span className="admin-filter">Last 7 days</span></div><SalesChart orders={completedOrders} /></section>
                <section className="admin-panel upload-panel"><div className="admin-panel-head"><div><p className="eyebrow">Catalog</p><h2>Add product</h2></div><Package size={19} /></div><form onSubmit={addCategory} className="category-form"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category name" /><button type="submit" disabled={addingCategory}>{addingCategory ? "Adding..." : "Add category"}</button></form><div className="category-list">{categories.map((category) => <span key={category._id}>{category.name}<button type="button" onClick={() => editCategory(category)}>Edit</button><button type="button" onClick={() => deleteCategory(category)}>Delete</button></span>)}</div><form onSubmit={addProduct} className="admin-form"><label>Product name<input value={productName} onChange={(event) => setProductName(event.target.value)} required placeholder="e.g. Halo Smart Fan" /></label><div className="admin-form-row"><label>Category<select value={productCategory} onChange={(event) => setProductCategory(event.target.value)} required><option value="" disabled>{categories.length ? "Select a category" : "Add a category first"}</option>{categories.map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</select></label><label>Price<input type="number" min="0" step="0.01" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} required placeholder="0.00" /></label></div><div className="admin-form-row"><label>Old price<input type="number" min="0" step="0.01" value={productOldPrice} onChange={(event) => setProductOldPrice(event.target.value)} placeholder="Optional" /></label><label>Stock<input type="number" min="0" step="1" value={productStock} onChange={(event) => setProductStock(event.target.value)} required /></label></div><div className="admin-form-row"><label>Color<input value={productColor} onChange={(event) => setProductColor(event.target.value)} placeholder="Optional" /></label><label>Description<input value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Optional" /></label></div><label className="image-upload">Product images<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={selectProductImage} /><span><Upload size={16} /> {productImageName || "Choose up to five images"}</span></label>{productImage && <img className="upload-preview" src={productImage} alt="First selected product image" />}{uploadError && <p className="auth-error">{uploadError}</p>}<button className="button dark full" type="submit" disabled={uploading || !productCategory}><Upload size={15} /> {uploading ? "Uploading..." : "Add to catalog"}</button></form></section>
                <section className="admin-panel inventory-panel"><div className="admin-panel-head"><div><p className="eyebrow">Inventory</p><h2>Manage products <span>{products.length}</span></h2></div><Link to="/shop" className="text-link">View store <ArrowRight size={15} /></Link></div><div className="inventory-grid">{products.map((product) => <div className="inventory-item" key={product.id}><ProductVisual product={product} /><div><strong>{product.name}</strong><small>{product.category} · ₦{product.price}</small></div><div className="inventory-actions"><button type="button" onClick={() => setEditingProduct(product)}>Edit</button><button type="button" onClick={() => setDeleteTarget(product)}>Delete</button></div></div>)}</div>{uploadError && <p className="auth-error">{uploadError}</p>}</section>
            </div>
            <section className="admin-panel orders-panel"><div className="admin-panel-head"><div><p className="eyebrow">Fulfillment</p><h2>Order flow</h2></div><span className="live-status"><i /> Live updates</span></div>{ordersError && <p className="auth-error">{ordersError}</p>}{ordersLoading ? <div className="admin-empty-orders"><p>Loading orders...</p></div> : orders.length ? <div className="order-table"><div className="order-row order-heading"><span>Order</span><span>Customer & delivery</span><span>Item</span><span>Total</span><span>Status</span><span /></div>{orders.map((order, index) => <div className="order-row" key={order._id}><strong>{order.orderNumber}</strong><span className="order-customer"><strong>{order.shipping.firstName} {order.shipping.lastName}</strong><small>{order.shipping.email} · {order.shipping.phone || "No phone"}</small><small>{order.shipping.address}, {order.shipping.city}, {order.shipping.country} {order.shipping.postalCode}</small></span><span>{order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</span><span>₦{order.total}</span><span className={`order-status ${order.status.toLowerCase()}`}>{order.status === "Delivered" ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{order.status}</span><button className="advance-order" onClick={() => advanceOrder(order, index)} disabled={order.status === "Delivered" || order.status === "Cancelled"}>Advance <ArrowRight size={13} /></button></div>)}</div> : <div className="admin-empty-orders"><ShoppingBag size={24} /><p>Orders will appear here when customers place them.</p></div>}</section>
            {editingProduct && <section className="admin-panel edit-product-panel"><div className="admin-panel-head"><div><p className="eyebrow">Catalog</p><h2>Edit product</h2></div><button className="icon-button" type="button" onClick={() => setEditingProduct(null)} aria-label="Close edit form"><X size={18} /></button></div><form onSubmit={saveProduct} className="admin-form"><label>Product name<input name="name" defaultValue={editingProduct.name} required /></label><div className="admin-form-row"><label>Category<select name="category" defaultValue={editingProduct.category}>{[...new Set([...categories.map((category) => category.name), editingProduct.category])].map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Price<input name="price" type="number" min="0" step="0.01" defaultValue={editingProduct.price} required /></label></div><div className="admin-form-row"><label>Old price<input name="oldPrice" type="number" min="0" step="0.01" defaultValue={editingProduct.oldPrice || ""} /></label><label>Stock<input name="stock" type="number" min="0" step="1" defaultValue={editingProduct.stock || 0} required /></label></div><label>Color<input name="color" defaultValue={editingProduct.color || ""} /></label><label>Description<input name="description" defaultValue={editingProduct.description || ""} /></label><fieldset><legend>Existing images</legend>{editingProduct.images?.map((image) => <label key={image.publicId}><input type="checkbox" name="imagesToRemove" value={image.publicId} /> Remove image</label>)}</fieldset><label className="image-upload">Add images<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={selectProductImage} /><span><Upload size={16} /> {productImageName || "Choose up to five images"}</span></label>{uploadError && <p className="auth-error">{uploadError}</p>}<button className="button dark" type="submit" disabled={uploading}>{uploading ? "Saving..." : "Save changes"} <CheckCircle2 size={15} /></button></form></section>}
            {categoryModal && <div className="delete-modal-layer" role="presentation" onClick={() => !categorySaving && setCategoryModal(null)}><section className="delete-modal category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title" onClick={(event) => event.stopPropagation()}><button className="delete-modal-close" type="button" onClick={() => setCategoryModal(null)} disabled={categorySaving} aria-label="Close category dialog"><X size={18} /></button>{categoryModal.mode === "edit" ? <form onSubmit={saveCategory}><p className="eyebrow">Manage category</p><h2 id="category-modal-title">Rename category</h2><label className="category-modal-label">Category name<input value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} autoFocus /></label>{categoryError && <p className="auth-error">{categoryError}</p>}<div className="delete-modal-actions"><button type="button" className="button light" onClick={() => setCategoryModal(null)} disabled={categorySaving}>Cancel</button><button type="submit" className="button dark" disabled={categorySaving}>{categorySaving ? "Saving..." : "Save category"}</button></div></form> : <><p className="eyebrow">Remove category</p><h2 id="category-modal-title">Delete {categoryModal.category.name}?</h2><p>This category will be removed from your catalog. Products using it may need to be reassigned.</p>{categoryError && <p className="auth-error">{categoryError}</p>}<div className="delete-modal-actions"><button type="button" className="button light" onClick={() => setCategoryModal(null)} disabled={categorySaving}>Cancel</button><button type="button" className="button danger" onClick={() => performCategoryDelete(categoryModal.category)} disabled={categorySaving}>{categorySaving ? "Deleting..." : "Delete category"}</button></div></>}</section></div>}
            {deleteTarget && <div className="delete-modal-layer" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}><section className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-product-title" onClick={(event) => event.stopPropagation()}><button className="delete-modal-close" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} aria-label="Close delete dialog"><X size={18} /></button><p className="eyebrow">Remove from catalog</p><h2 id="delete-product-title">Delete {deleteTarget.name}?</h2><p>This product will be removed from the storefront. This action cannot be undone.</p>{uploadError && <p className="auth-error">{uploadError}</p>}<div className="delete-modal-actions"><button type="button" className="button light" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button><button type="button" className="button danger" onClick={() => deleteProduct(deleteTarget)} disabled={deleting}>{deleting ? "Deleting..." : "Delete product"}</button></div></section></div>}
        </main>
    );
}
function AdminUsers({ user }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [creatingAdmin, setCreatingAdmin] = useState(false);
    const [createAdminError, setCreateAdminError] = useState("");
    const [createAdminSuccess, setCreateAdminSuccess] = useState("");
    useEffect(() => {
        if (user?.role !== "admin") return;
        api("/auth/users").then((response) => setUsers(response.users)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
    }, [user]);
    const removeUser = async (account) => {
        setDeletingId(account._id); setError("");
        try { await api(`/auth/users/${account._id}`, { method: "DELETE" }); setUsers((current) => current.filter((entry) => entry._id !== account._id)); setDeleteTarget(null); }
        catch (requestError) { setError(requestError.message); }
        finally { setDeletingId(""); }
    };
    const createAdmin = async (event) => {
        event.preventDefault();
        setCreateAdminError(""); setCreateAdminSuccess("");
        if (adminName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(adminEmail) || adminPassword.length < 8) {
            setCreateAdminError("Enter a name, valid email, and password of at least 8 characters.");
            return;
        }
        setCreatingAdmin(true);
        try {
            const response = await api("/auth/admins", { method: "POST", body: JSON.stringify({ name: adminName, email: adminEmail, password: adminPassword }) });
            setUsers((current) => [response.user, ...current]);
            setAdminName(""); setAdminEmail(""); setAdminPassword("");
            setCreateAdminSuccess("Administrator account created.");
        } catch (requestError) { setCreateAdminError(requestError.message); }
        finally { setCreatingAdmin(false); }
    };
    if (!user) return <SimplePage title={<>Sign in<br /><em>to continue.</em></>}><Link to="/login" className="button dark">Sign in <ArrowRight size={16} /></Link></SimplePage>;
    if (user.role !== "admin") return <SimplePage title={<>Admin<br /><em>access required.</em></>}><Link to="/" className="button dark">Return to store <ArrowRight size={16} /></Link></SimplePage>;
    return <main className="admin-page"><div className="admin-topbar"><div><p className="eyebrow">Fijabi Electronics / Studio console</p><h1>Customer <em>users.</em></h1></div><div className="admin-topbar-links"><Link to="/admin" className="admin-store-link">Dashboard</Link><Link to="/" className="admin-store-link">View storefront <ArrowRight size={15} /></Link></div></div><section className="admin-panel create-admin-panel"><div><p className="eyebrow">Administrator access</p><h2>Create an administrator</h2><p className="admin-panel-description">Add a trusted team member without sharing the private invite code.</p></div><form className="create-admin-form" onSubmit={createAdmin}><label>Full name<input value={adminName} onChange={(event) => setAdminName(event.target.value)} required placeholder="Team member name" /></label><label>Email address<input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required placeholder="admin@example.com" /></label><label>Temporary password<input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} required minLength="8" placeholder="At least 8 characters" /></label><button className="button dark" type="submit" disabled={creatingAdmin}>{creatingAdmin ? "Creating..." : "Create admin"} <ArrowRight size={16} /></button></form>{createAdminError && <p className="auth-error">{createAdminError}</p>}{createAdminSuccess && <p className="admin-success">{createAdminSuccess}</p>}</section><section className="admin-panel users-panel"><div className="admin-panel-head"><div><p className="eyebrow">Accounts</p><h2>All users <span>{users.length}</span></h2></div></div>{error && <p className="auth-error">{error}</p>}{loading ? <div className="admin-empty-orders"><p>Loading users...</p></div> : <div className="users-table"><div className="user-row user-heading"><span>Name</span><span>Email</span><span>Role</span><span>Joined</span><span /></div>{users.map((account) => <div className="user-row" key={account._id}><strong>{account.name}</strong><span>{account.email}</span><span className="user-role">{account.role}</span><span>{new Date(account.createdAt).toLocaleDateString()}</span><button className="user-delete" type="button" disabled={account._id === user.id || deletingId === account._id} onClick={() => setDeleteTarget(account)}>{account._id === user.id ? "Current account" : deletingId === account._id ? "Deleting..." : "Delete"}</button></div>)}</div>}</section>{deleteTarget && <div className="delete-modal-layer" role="presentation" onClick={() => !deletingId && setDeleteTarget(null)}><section className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-user-title" onClick={(event) => event.stopPropagation()}><button className="delete-modal-close" type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)} aria-label="Close delete user dialog"><X size={18} /></button><p className="eyebrow">Remove account</p><h2 id="delete-user-title">Delete {deleteTarget.name}?</h2><p>This account and its access will be removed permanently.</p>{error && <p className="auth-error">{error}</p>}<div className="delete-modal-actions"><button type="button" className="button light" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)}>Cancel</button><button type="button" className="button danger" onClick={() => removeUser(deleteTarget)} disabled={Boolean(deletingId)}>{deletingId ? "Deleting..." : "Delete account"}</button></div></section></div>}</main>;
}
function ContactPage() {
    const submitMessage = (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const subject = encodeURIComponent(form.get("subject"));
        const body = encodeURIComponent(`Name: ${form.get("name")}\nEmail: ${form.get("email")}\n\n${form.get("message")}`);
        window.location.href = `mailto:hello@fijabielectronics.com?subject=${subject}&body=${body}`;
    };
    return <main className="contact-page"><section className="contact-hero"><div><p className="eyebrow">Elon Store / Contact</p><h1>Let's talk<br /><em>slowly.</em></h1><p>Questions about an appliance, an order, or the right piece for your space? Our team is here to help.</p></div><a className="contact-email" href="mailto:hello@fijabielectronics.com"><span>Write directly</span><strong>hello@fijabielectronics.com</strong><ArrowRight size={18} /></a></section><section className="contact-content"><div className="contact-details"><p className="eyebrow">Customer care</p><h2>A thoughtful answer is never far away.</h2><p>We usually reply within one business day. For order questions, include your order number so we can help quickly.</p><div><span>Hours</span><strong>Monday - Friday, 9am - 5pm</strong></div><div><span>Location</span><strong>Lagos, Nigeria</strong></div></div><form className="contact-form" onSubmit={submitMessage}><p className="eyebrow">Send a note</p><label>Your name<input name="name" required placeholder="Your name" /></label><label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label>Subject<input name="subject" required placeholder="How can we help?" /></label><label>Message<textarea name="message" required rows="5" placeholder="Tell us a little more..." /></label><button className="button dark" type="submit">Open email <ArrowRight size={16} /></button></form></section></main>;
}
function App() {
    const [items, setItems] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [user, setUser] = useState(null);
    const [cartNotice, setCartNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const clearCart = useCallback(() => setItems([]), []);
    useEffect(() => {
        Promise.allSettled([api("/products"), api("/auth/me"), api("/categories")]).then(([productsResult, userResult, categoriesResult]) => {
            if (productsResult.status === "fulfilled" && Array.isArray(productsResult.value?.products)) {
                setProducts(productsResult.value.products.map(toStoreProduct));
            }
            if (userResult.status === "fulfilled" && userResult.value?.user) setUser(userResult.value.user);
            if (categoriesResult.status === "fulfilled" && Array.isArray(categoriesResult.value?.categories)) {
                setCategories(categoriesResult.value.categories);
            }
            setIsLoading(false);
        });
    }, []);
    const add = (p, quantity = 1) => {
        const currentQuantity = items.filter((item) => item.id === p.id).length;
        if (!p.stock) {
            setCartNotice(`${p.name} is out of stock.`);
            setCartOpen(true);
            return;
        }
        if (currentQuantity + quantity > p.stock) {
            setCartNotice(`Only ${p.stock} ${p.name} available.`);
            setCartOpen(true);
            return;
        }
        setCartNotice("");
        setItems((current) => {
            return [...current, ...Array.from({ length: quantity }, () => p)];
        });
        setCartOpen(true);
    };
    const logout = async () => {
        try { await api("/auth/logout", { method: "POST" }); } finally { setUser(null); }
    };
    return (
        <BrowserRouter>
            {isLoading && <AppLoader />}
            <Layout items={items} setCartOpen={setCartOpen} user={user}>
                <Routes>
                    <Route path="/" element={<Home add={add} products={products} />} />
                    <Route path="/shop" element={<Shop add={add} products={products} />} />
                    <Route path="/category/:category" element={<Shop add={add} products={products} />} />
                    <Route path="/product/:id" element={<ProductPage add={add} products={products} />} />
                    <Route
                        path="/cart"
                        element={
                            <SimplePage
                                title={
                                    <>
                                        Your
                                        <br />
                                        <em>bag.</em>
                                    </>
                                }
                            >
                                <p>{items.length} pieces selected.</p>
                                <Link to="/checkout" className="button dark">
                                    Checkout <ArrowRight size={16} />
                                </Link>
                            </SimplePage>
                        }
                    />
                    <Route path="/checkout" element={<Checkout items={items} user={user} />} />
                    <Route path="/payment/verify" element={<PaymentVerification user={user} onPaid={clearCart} />} />
                    <Route path="/admin" element={user?.role === "admin" ? <Admin products={products} categories={categories} user={user} onCategoryCreated={(category) => setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))} onCategoryUpdated={(category) => setCategories((current) => current.map((entry) => entry._id === category._id ? category : entry).sort((a, b) => a.name.localeCompare(b.name)))} onCategoryDeleted={(id) => setCategories((current) => current.filter((category) => category._id !== id))} onProductCreated={(product) => setProducts((current) => [...current, product])} onProductUpdated={(product, deleted = false) => setProducts((current) => deleted ? current.filter((item) => item.id !== product.id) : current.map((item) => item.id === product.id ? product : item))} /> : <NotFound />} />
                    <Route path="/admin/users" element={user?.role === "admin" ? <AdminUsers user={user} /> : <NotFound />} />
                    <Route path="/login" element={<AuthPage onAuthenticated={setUser} />} />
                    <Route path="/signup" element={<AuthPage mode="signup" onAuthenticated={setUser} />} />
                    <Route path="/admin/signup" element={<AuthPage mode="admin-signup" onAuthenticated={setUser} />} />
                    <Route path="/profile" element={user ? <Profile key={user.id} user={user} onUserUpdated={setUser} onLogout={logout} /> : <SimplePage title={<>Sign in<br /><em>to continue.</em></>}><Link to="/login" className="button dark">Sign in <ArrowRight size={16} /></Link></SimplePage>} />
                    <Route
                        path="/about"
                        element={
                            <SimplePage
                                title={
                                    <>
                                        Designed for
                                        <br />
                                        <em>living.</em>
                                    </>
                                }
                            >
                                <p>
                                    Elon Store is a contemporary lifestyle brand built around considered
                                    appliances and the quiet rituals that make a home.
                                </p>
                            </SimplePage>
                        }
                    />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Layout>
            <CartDrawer
                items={items}
                open={cartOpen}
                onAdd={add}
                notice={cartNotice}
                onClose={() => setCartOpen(false)}
                onRemove={(id, quantity = 1) => setItems((current) => {
                    let remaining = quantity;
                    return current.filter((item) => {
                        if (item.id !== id || remaining === 0) return true;
                        remaining -= 1;
                        return false;
                    });
                })}
            />
        </BrowserRouter>
    );
}
export default App;
