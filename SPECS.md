# Fast Food Mobile Web Application Development

This prompt outlines the requirements for developing a mobile-first web application for a fast food buffet. The application must feature dynamic stock control integrated with the ordering system and secure online payment processing via MercadoPagoCheckout Pro API

# 1\. Core Objectives

The primary goals are to:

1. Provide a fast, intuitive, and mobile-responsive ordering experience.
2. Implement real-time, dynamic stock control to prevent overselling unavailable items.
3. Ensure a secure and seamless online payment  process via MercadoPago with an optional manual  cash payment option
4. Offer a simple administrative interface for menu and inventory management oriented to different roles (Stock manager, Cashier, Platform Admin)

# 2\. Target Audience

The application will primarily serve customers using mobile devices (predominantly smartphones) to place orders for pickup or delivery from a fast-food restaurant. The secondary users are the restaurant staff and management.

From a technical perspective, the system should consist of two separate frontend projects: one for customers and another for restaurant operations.

# 3\. Key Features and Requirements

The application will be divided into two main components: the Customer-Facing Application and the Administrative Backend.

## 3.1. Customer-Facing Application (Frontend)

| Feature | Description | Stock/Payment Integration Notes |
| :---- | :---- | :---- |
| **User Interface** | Fully responsive design, mobile-first approach. Minimal load times (PWA/SPA preferred). | N/A |
| **Menu Browsing** | Clear categories, high-quality images, detailed item descriptions, and customization options (e.g., add/remove toppings). | Items must display real-time availability (e.g., "Sold Out," "Limited Stock") or Gluten free denomination. |
| **Order Cart** | Easy-to-manage cart, visible subtotal, tax calculation, and area for promo code entry. | Cart items should re-verify stock before checkout initiation. |
| **User Authentication** | Optional guest checkout, or fast login/registration (social login preferred). | N/A |
| **Checkout Process** | Clear steps for delivery/pickup selection, time scheduling, and address input using QR codes | Delivery/pickup availability is dependent on operational status set in the Admin Backend. |
| **Online Payment** | Integration with MercadoPago Pro secure payment gateway. Must support credit/debit cards and wallet funds. | Payment success triggers order creation and stock deduction. Failure must revert stock changes. |
| **Order Tracking** | Real-time status updates (e.g., "Received," "Preparing," "Ready for Pickup/Out for Delivery"). | Dashboard oriented for order preparation staff in advance as well as pending operations to be collected by cash |

## 3.2. Dynamic Stock Control and Inventory System

The stock control system is critical for operational integrity.

* **Real-Time Updates:** Stock levels must be updated instantly upon order placement (pending deduction) and payment confirmation (final deduction).
* **Menu Integration:** The menu must automatically hide or visually gray out items (and modifiers) that have reached zero stock.
* **Buffer/Safety Stock:** Ability to set a low-stock threshold (e.g., 5 items remaining) to trigger notifications for stock manager admin role


## 3.3. Administrative Backend (Staff/Management)

| Module | Functionality |
| :---- | :---- |
| **Dashboard** | Overview of current orders (pending cash payment or  pickup) |
| **Menu Management** | CRUD operations (Create, Read, Update, Delete) for categories, items, prices, images, and modifiers. |
| **Inventory Management** | Input current stock levels Manual stock adjustments. |
| **Order Management** | Accept, reject, or update order statuses by the platform admin. |
|  |  |
| **User Management** | Manage staff accounts and permissions by platform admin |

# 4\. Technical Specifications

| Component | Requirement |
| :---- | :---- |
| **Technology Stack** | Modern framework (Vue) for the frontend; scalable backend ( [Node.js](http://Node.js) / TS with nestjs). |
| **Database** | Only Redis will be the data backend |
| **API** | Secure RESTful API for communication between the frontend and backend. |
| **Deployment** | Simple by coolify |
| **Security** | Full HTTPS enforcement, strong input validation, and compliance with payment gateway security standards |

## **User Flow: Shopping, Cart, and Payment**

### **Session Context**

The user begins in an **unnominated session** (not logged in or identified), but the app must **persist the session state** locally to track all cart activity.  
Throughout the experience, the **cart subtotal** should always be **visible and updated in real time** as the user adds, removes, or adjusts quantities.

---

### **1\. Browsing Experience**

The user can browse items organized into **four primary categories**:

* **PARRILLA**

* **FERIA DEL PLATO**

* **BEBIDAS**

* **OTROS**

Additionally, there should be a **dynamic “Gluten-Free” category**, automatically populated from items with the `isGlutenFree` attribute.  
This category should be prominently displayed to make the experience accessible and inclusive for gluten-intolerant users.

---

### **2\. Cart Behavior and Stock Validation**

The cart is **fully dynamic**, reflecting user interactions in real time:

* When adding, increasing, or removing an item, the app must **validate stock availability** immediately.

* If an item becomes unavailable while it’s in the cart, display a **clear warning message** such as:

  “⚠️ This item went out of stock and won’t be billed.”

The cart view should show:

* Item list with quantities and prices
* Live subtotal
* Any stock-related notifications
* “Proceed to Checkout” button

---

### **3\. Pre-Payment Confirmation**

Before payment, the user sees a **confirmation screen** summarizing:

* The full item list with final availability verification
* A “Recheck Availability” action if any stock data changed
* The **final subtotal** and **total amount due**

If any item is no longer available, the user should be notified before continuing.

The confirmation screen then offers **two payment options**:

1. **Online Payment (Recommended)** – highlighted and visually prioritized
2. **Manual Payment** – available but less prominent

The UX should subtly encourage digital payment while keeping the manual option accessible.

---

### **4\. Payment and Order Creation**

If the user selects **Online Payment**, the app integrates with **MercadoPago Checkout Pro**, sending only:

* The **total amount**
* A **generic description**, such as `"Buffet Purchase"`

Upon successful payment, an **order QR code** is generated and displayed to the user.  
This QR code represents the completed order and will be used later for order fulfillment.

If the user selects **Manual Payment**, the order is still created but remains **pending** until confirmed by a **Cashier** role.

---

### **5\. Order Management in Session**

After checkout, the order becomes **sticky to the user’s session**:

* The order summary and QR code remain visible until it’s fulfilled.
* The user can toggle between viewing the **order details** and **QR code view** to show the fulfillment agent.
* The app should always display a **“Create New Order”** button.

If the user attempts to start a new order while the previous one is **not yet fulfilled**, show a strong warning:

“⚠️ Starting a new order will reset your cart. The unfulfilled order will be lost.”

Once the previous order is **fulfilled**, the warning disappears and the user can freely start a new order.

---

### **6\. Fulfillment**

The user presents their **QR code** to a fulfillment agent.  
The agent scans it and:

* If the order is **paid**, it is marked as **FULFILLED**.
* Partial fulfillment is **not allowed** — only complete fulfillment is valid.
* If the order is pending payment, the app should clearly indicate that status to both parties.

Once fulfilled, the session resets to allow a new shopping flow to begin cleanly.

—--------------------------------------------------------------------------------------

### **1\. Initial Setup (First Launch)**

When the application is launched for the first time, it assumes the platform is being initialized by an administrator — similar to WordPress’ first-time setup flow.  
The app will prompt the user to create the **root admin account**, requiring only:

* **Nickname**
* **Password**

This user will automatically be assigned the **ADMIN** role, which grants full access to all platform features and permissions.

---

### **2\. Admin Role**

The **Admin** can perform all platform operations.  
One exclusive capability is **creating new users** and **assigning roles**.

**User Creation Flow:**

1. The admin defines:

    * A **nickname** for the new user.

    * One or more **roles** to assign.

The platform generates a **unique session initiation URL**, for example:

`https://app.example.com/session/init?token=abc123`

2.
3. This URL is then encoded as a **QR code**, which can be scanned from another device.

    * The URL represents a **one-time session initiator** that links the device to the assigned role(s).

    * It is **valid for 60 seconds** and can be **used only once**.

4. When scanned, the new device automatically:

    * Opens the session initiation URL in the mobile browser or app.

    * Authenticates and registers itself under the assigned role(s).

5. Once used, the backend **invalidates** the URL and associated QR code.

This process enables fast, secure device onboarding without requiring manual credentials.

If a new QR is scanned on a device with an active session the new one will take it’s place.

---

### **3\. Stock Role**

The **STOCK** role manages the menu and item availability.  
Users with this role can create or update items with the following attributes:

| Field | Description |
| ----- | ----- |
| **Name** | Item name |
| **Stock** | Number of items available for sale |
| **Price** | Unit price |
| **Is Gluten-Free** | Boolean flag |
| **Category** | One of: `PARRILLA`, `FERIA DEL PLATO`, `BEBIDAS` |

The Stock role ensures real-time visibility of available items.

---

### **4\. Cashier Role**

The **CASHIER** role handles manual payment processing for orders that were not paid online.

**Cashier Flow:**

1. The cashier scans the **order QR code**.

2. Upon receiving payment, the cashier marks the order as:

    * **“CLEAR TO PICKUP”**, indicating full payment and readiness for fulfillment.

The cashier is the only role authorized to manually mark orders as **paid**.

---

### **5\. Order Fulfiller Role**

The **ORDER FULFILLER** is responsible for **preparing and completing paid orders**.  
They operate by scanning the **order QR code** presented by the customer.

**Fulfillment Flow:**

1. The fulfiller scans the customer’s **order QR code**.

2. The app checks the order status and reacts accordingly:

    * **If the order is “CLEAR TO PICKUP”:**

        * The app displays the list of items to prepare.

        * The fulfiller can mark the order as **FULFILLED** once all items are ready.

        * Partial fulfillment is **not allowed** — the order must be completed in full.

    * **If the order is already “FULFILLED”:**

        * The app clearly notifies:

          “This order has already been fulfilled.”

            * The fulfiller cannot modify it further.

    * **If the order is in any other state** (e.g., **PENDING PAYMENT**):

        * The app displays a clear message indicating the reason:

          “This order is pending payment. Please direct the customer to the cashier to complete payment.”

        * The fulfiller cannot proceed until the order’s payment status changes to “CLEAR TO PICKUP”.

This ensures fulfillers only act on valid, unpaid, or completed orders — preventing confusion and maintaining process integrity.  
The UI should emphasize **order state visibility**, using clear color-coded badges (e.g., gray for pending, green for clear, blue for fulfilled).

This status check should be the same for every role that scans orders QR

### **UX and Mobile-First Design Considerations**

* The app is **mobile-first**: optimized for small screens, fast interactions, and minimal input.

* **QR scanning** should use the **native camera API** or an in-app scanner for seamless device linking.

* Each role should have a **dedicated dashboard**, focusing on its primary actions (e.g., stock management, payment approval, fulfillment).

* The interface should clearly indicate **order and role states** through color-coded badges and intuitive icons.

* Onboarding should feel instant: scanning the QR opens the URL, authenticates, and transitions smoothly to the assigned role dashboard.

## **Technical Notes on Database and State Management**

### **1\. Storage Engine**

All data persistence will use **Redis** as the primary data store.  
Redis will be leveraged for its **speed, simplicity, and atomic list/set operations**, enabling fast order transitions and real-time dashboard updates.

---

### **2\. Data Model Definitions**

#### **Items**

Each item will be stored as a JSON object with a prefixed key in the following format:

`item#<id>`

**ID Rules:**

* `<id>` must be a **short, random alphanumeric string**, human-readable and easy to dictate verbally if scanning is unavailable.

* Example key: `item#A7F2C`

**Item JSON Structure Example:**

`{`  
`"id": "A7F2C",`  
`"name": "Empanada de Carne",`  
`"price": 3.5,`  
`"stock": 24,`  
`"isGlutenFree": false,`  
`"category": "FERIA DEL PLATO"`  
`}`

All item definitions are stored in Redis as individual JSON objects, retrievable by key.

---

#### **Orders**

Orders will also be stored as JSON objects with a similar prefixed key:

`order#<id>`

**ID Rules:**

* Short, random, alphanumeric, easily pronounceable.

* Example key: `order#B92X1`

* Each order must include a **manual fallback code entry option** in case QR scanning is unavailable.

**Order JSON Structure Example:**

`{`  
`"id": "B92X1",`  
`"items": [`  
`{ "itemId": "A7F2C", "quantity": 2 },`  
`{ "itemId": "C1B9D", "quantity": 1 }`  
`],`  
`"status": "pending_payment",`  
`"total": 10.5,`  
`"timestamp": 1731766800`  
`}`

---

### **3\. Order Lifecycle and Lists**

Orders are distributed across **three mutually exclusive Redis lists** to ensure clear state management and visibility:

| List | Purpose | Allowed Transitions |
| ----- | ----- | ----- |
| `orders:pending_payment` | Orders awaiting payment confirmation | → `orders:paid` (via manual action or payment processor acknowledgment) |
| `orders:paid` | Paid orders awaiting fulfillment | → `orders:fulfilled` (upon completion by fulfillment agent) |
| `orders:fulfilled` | Completed and delivered orders | Final state (archival or analytics only) |

**Rules:**

* No order exists outside these three lists.

* No order may exist in more than one list simultaneously.

* Online and manual payments are both represented in `orders:pending_payment`; the distinction is operational, not structural.

* Orders can transition from pending to paid either:

    * Automatically, via payment processor callback (`payment_ack`)

    * Or manually, via cashier confirmation

### **3.4. Global Platform Kill-Switch & Offline Mode – Clean Final Version**

(Non-aggressive, practical for daily school use)

#### **Purpose**

Provide an instant, reversible way for the ADMIN to temporarily pause or completely shut down customer ordering in case of:

* Kitchen overload
* Stock refill
* Fridge issue
* Health & safety problem
* End of service

Staff dashboards and all internal operations remain 100 % functional at all times.

#### **Redis storage (three simple keys)**

platform:status          → "online" | "soft-offline" | "hard-offline"   (default: "online")  
platform:offline\_message → Free-text message shown to customers (optional)  
platform:offline\_until   → Unix timestamp (optional – “we’ll be back at 13:15”)

#### **The three available modes and their exact effects**

| Mode | Customer experience | Staff experience | Typical use case |
| ----- | ----- | ----- | ----- |
| online | Full normal flow – browse, cart, checkout, pay | Normal operation | Regular service |
| soft-offline | • Can browse the menu and modify cart freely • Cart is preserved • When they press “Proceed to checkout” → friendly full-screen overlay:  “Lo sentimos, el buffet está en pausa momentánea. Volvemos en unos minutos.”  (Optional countdown or custom message) • Checkout button disabled until mode changes back to online | All dashboards fully functional Orange banner at top: “MODO PAUSA – Los clientes no pueden finalizar pedidos” | 95 % of daily pauses (kitchen catching up, quick refill, last rush before bell) |
| hard-offline | • Immediate redirect to static /offline page on any navigation • Current cart is cleared • Only the offline message is shown | All dashboards fully functional Red banner: “MODO OFFLINE COMPLETO – Sitio bloqueado para clientes” | Rare emergencies (power cut, health inspection, major system failure) |

#### **Real-time propagation**

When the ADMIN changes the status:

* The new value is written atomically to Redis
* A single Socket.io event platform:status is broadcast with the new status \+ message \+ optional until timestamp
* All customer devices react instantly (disable checkout or redirect)
* All staff devices update their banner instantly

#### **Admin control panel (clear, mistake-proof UI)**

One prominent section in the Admin dashboard with three large, colour-coded buttons and confirmation dialogs:

| Button | Colour | Action on confirm |
| ----- | ----- | ----- |
| Servicio normal | Green | platform:status \= online |
| Pausa temporal (recomendado) | Orange | platform:status \= soft-offline Optional message & reopen time |
| Offline completo (emergencia) | Red | platform:status \= hard-offline |

#### **Backend enforcement (one tiny middleware – belt-and-suspenders)**

// Only for customer-facing routes  
if (platformStatus \=== 'hard-offline' && \!currentUserIsStaff) {  
return redirect('/offline');  
}

#### **Why this version is perfect for a school buffet**

* Everyday pauses no longer delete anyone’s cart or kick students out → no frustrated parents.
* Kitchen can breathe and catch up while customers wait politely with their selection ready.
* You still have the nuclear “hard-offline” option when you truly need to shut everything down.
* Zero extra complexity, fully real-time, works with the Socket.io setup we already chose.

---

### **4\. Fulfillment and Category Tracking**

When an order moves to the **paid list**, it becomes visible to the **prep area dashboard**.  
This dashboard aggregates and displays:

* Items awaiting fulfillment

* Quantities grouped by **item**

* Real-time status updates as fulfillers mark items complete

This enables kitchen and service staff to track demand and prioritize dispatch operations efficiently.

---

### **5\. Dashboards Overview**

All dashboards will be accessible from a shared section called **“Dashboards”**, visible to **all authenticated roles**, regardless of permissions.  
Dashboards should update in real time, reflecting Redis state changes.

#### **a. Fulfillment Dashboard**

* Displays all **paid orders awaiting fulfillment**

* Organized by **category**

* Includes item quantities, order codes, and time since payment

* Intended for kitchen or prep staff

#### **b. Stock Monitoring Dashboard**

* Tracks items with **low or zero stock**

* Displays “Running Low” and “Out of Stock” lists

* Visible to all roles to promote shared operational awareness

#### **c. Global Operations Dashboard**

A high-level, global overview summarizing the entire operational state:

* **Orders waiting for payment**

* **Orders pending fulfillment**

* **Orders completed**

This dashboard gives admins and staff a unified real-time view of the buffet’s activity cycle.

---

### **6\. Key Design Considerations**

* **Redis keys** use predictable prefixes for fast querying and scanning (`item#`, `order#`, `orders:paid`, etc.).

* **Atomic transitions** ensure that orders cannot exist in multiple states simultaneously.

* **Manual fallback** is always available: users can enter order codes manually instead of scanning QR codes.

* **Real-time dashboards** are powered by Redis pub/sub or keyspace notifications for instant UI updates.

* **Data consistency** is maintained through explicit state transition commands (`moveOrderToPaid()`, `markOrderFulfilled()`).

### **8\. Real-Time Updates & Dashboard**

### **8.1. Design Goals**

* Staff dashboards refresh within 1–2 seconds of any change.  
  Customer menu instantly reflects sold-out items (no polling).  
  Maximum 20 concurrent devices (customers \+ staff).  
  Redis remains the single source of truth and the only persistent layer.  
  Zero custom real-time server code beyond a proven library.

#### **8.2. Real-Time Stack**

| Component | Choice | Reason |
| ----- | ----- | ----- |
| Transport | Socket.io (WebSocket \+ automatic long-polling fallback) | Mature, tiny footprint, built-in reconnection |
| Redis → clients bridge | Socket.io Redis adapter | Uses your existing Redis instance as message bus – no extra processes |
| Persistence & state | Existing Redis keys / lists / hashes | Unchanged from your original design |

#### **8.3. Logical Rooms (recommended – costs nothing)**

* kitchen  → preparation / fulfillment tablets
* cashier  → cashier screen(s)
* staff    all logged-in staff devices (stock monitoring, counters)
* customers all open customer browsers/tabs (for instant stock updates)

Devices simply join the room(s) they need on connection.

#### **8.4. What you actually have to do when data changes**

(one line per existing state transition you already perform)

| Event | Broadcast |
| ----- | ----- |
| New manual-payment order created | send to cashier room |
| Payment confirmed (online or cashier) | remove from cashier, add to kitchen, notify customers of stock change |
| Order fulfilled | remove from kitchen room |
| Stock manually adjusted or reaches zero | broadcast lightweight “stock changed” event to everyone |

#### **8.5. Customer menu stock updates**

Customer browsers open the same socket, join the customers room (or listen globally), and on the “stock changed” event simply reload the tiny menu from /api/menu (cached 2–3 s is fine) or update only the changed item(s). No polling required.

#### **8.7. Expected Real-World Performance on a cheap VPS**

| Metric | Result |
| ----- | ----- |
| Update latency | 50–400 ms (same LAN/contintent) |
| Concurrent connections | 200+ easily supported |
| Total RAM usage (Node \+ Socket.io \+ Redis) | 40–80 MB |
| Behaviour after restart | Clients auto-reconnect; optional one-time full refresh on reconnect |

### **Initial Setup & Staff Authentication**

### (No passwords · Timeless QR · One scan per device forever)

#### **1\. First-Ever Application Launch (happens only once)**

Application starts → no admin exists in Redis → redirects to one-time admin creation screen.

Fields:

* Nickname (e.g. “Dire”, “Admin”)

Action:

* Generates a permanent master admin key (random 128-bit token)

Stores in Redis:  
user:admin → hash { nickname: "Dire", roles: "ADMIN", token: "perm:abc123def456..." }

permanent\_token:abc123def456... → "admin"

* Immediately logs the current device in as ADMIN with a timeless session cookie
* This screen is disabled forever after first use

#### **2\. Staff User/Roles Creation (ADMIN only – 5 seconds per person/tablet)**

From Admin dashboard → “Nuevo acceso permanente”

Fields:

* Nickname (display name, e.g. “María Cocina”, “Cajera 1”, “Carlos Stock”)
* Roles (multi-select): STOCK / CASHIER / ORDER\_FULFILLER / ADMIN

Action on save:

* Generates a new permanent, never-expiring token (random 128–256 bit)

Stores two keys in Redis:  
user:maria-cocina → hash { nickname: "María Cocina", roles: "CASHIER,ORDER\_FULFILLER", token: "perm:xyz987..." }

permanent\_token:xyz987... → "maria-cocina"

Instantly displays a QR code that contains the URL:  
https://\<url\>/auth/perm?token=xyz987...

#### **3\. Device Onboarding (one scan in the lifetime of the device)**

Staff or admin points the tablet/phone at the QR code → browser opens the URL.

What happens:

* Backend checks permanent\_token:\<token\> exists and is valid
* Sets a timeless, HTTP-only, Secure, SameSite=Strict cookie:
    * session=perm:xyz987... (or stateless signed cookie with the user key)
    * No expiry date (or explicit 10-year expiry)
* Redirects instantly to the correct role-based dashboard
* From this moment forward, opening the app URL on that device always goes straight to the dashboard – even after reboot, cache clear, or years later

#### **4\. Revocation & Control (instant, one click)**

Admin panel → List of all users/devices:

* “Revocar acceso” → deletes both the user:\* hash and the permanent\_token:\* entry
* Device instantly loses access on next page load (and gets “Acceso revocado” screen)
* “Cambiar roles” → edit the user hash → all devices with that token instantly get new permissions

#### **5\. Redis storage summary (only these keys)**

user:admin          → hash { nickname: "Dire", roles: "ADMIN", token: "perm:abc123..." }

user:cajera-1       → hash { nickname: "Cajera 1", roles: "CASHIER", token: "perm:def456..." }

permanent\_token:abc123... → "admin"

permanent\_token:def456... → "cajera-1"

#### **6\. Daily experience (exactly what you wanted)**

* Fixed kitchen tablet → turn on → dashboard appears instantly every day forever
* Cashier tablet → same
* Stock phone → same
* No passwords to remember or type
* One QR per device for its entire life
* Full revocation control from admin panel

#### **7\. Security notes (more than enough for a school)**

* Tokens are cryptographically random, unguessable, never logged
* QR URLs can be restricted to local network if desired
* All traffic HTTPS
* Revocation is instant and permanent

### **9\. Deployment with Docker & Coolify – Technical Specs & Guidelines (No Full Files)**

#### **9.1 Core Principles (What you must respect)**

* One single docker-compose.yml at project root → Coolify detects it automatically.
* Only two running containers: redis \+ app (the NestJS backend that also serves both Vue apps as static files).
* The NestJS server must serve two different static folders depending on the hostname/path:
    * Root domain → customer PWA (/dist-customer)
    * /staff or separate subdomain → staff dashboard (/dist-staff)
* Never use nginx in the compose; let Coolify/Traefik (or your reverse proxy) handle routing & TLS.

#### **9.2 Dockerfile Guidelines (multi-stage, tiny runtime)**

Key rules:

* Use Node 22-alpine (2025 best practice).
* One builder stage → install \+ build backend \+ build both Vue apps with Vite.
* Runtime stage → only copy:
    * backend/dist
    * production node\_modules (backend only)
    * /public-customer ← Vue customer build
    * /public-staff ← Vue staff build
* Final image size target: \< 180 MB.
* Expose only port 3000\.
* CMD \= node dist/main (NestJS).

#### **9.3 docker-compose.yml – Minimal & Coolify-Perfect**

Must contain exactly these services:

services:

redis:

    image: redis:7-alpine

    volumes: \[redis-data:/data\]

    restart: unless-stopped

app:

    build: .

    depends\_on: \[redis\]

    restart: unless-stopped

    environment:

      \- NODE\_ENV=production

      \- REDIS\_URL=redis://redis:6379

      \- MERCADOPAGO\_ACCESS\_TOKEN=xxx

      \- BASE\_URL=${BASE\_URL}   \# Coolify injects your domain

    ports: \["3000:3000"\]

#### **9.4 Static File Serving in NestJS (example snippet)**

In main.ts or a dedicated bootstrap file:

async function bootstrap() {

const app \= await NestFactory.create(AppModule);

// Serve customer PWA on root

app.useStaticAssets(join(\_\_dirname, '..', 'public-customer'), {

    prefix: '/',

    index: 'index.html',

    setHeaders: (res) \=\> res.set('Service-Worker-Allowed', '/'),

});

// Serve staff dashboard on /staff path (or separate subdomain)

app.useStaticAssets(join(\_\_dirname, '..', 'public-staff'), {

    prefix: '/staff',

    index: 'index.html',

});

// Fallback SPA routing

app.use('/staff/\*', (req, res) \=\> {

    res.sendFile(join(\_\_dirname, '..', 'public-staff', 'index.html'));

});

await app.listen(3000);

}

#### **9.5 Coolify Deployment Checklist (copy-paste into your README)**

1. Push repo with docker-compose.yml \+ Dockerfile.
2. In Coolify → New Resource → Docker Compose → select repo.
3. Coolify auto-detects compose → click Deploy.
4. Add these environment variables in Coolify UI:
    * MERCADOPAGO\_ACCESS\_TOKEN (your MP token)
    * BASE\_URL \= [https://yourdomain.com](https://yourdomain.com/) (optional but recommended)
5. (Optional) Add custom domain \+ enable Automatic SSL.
6. First deploy takes \~2–4 min → done.

#### **9.6 Zero-Downtime Updates (Coolify does it automatically)**

* Coolify pulls new image → starts new container → healthcheck → switches traffic.
* Redis persists because of named volume redis-data.
* No manual intervention ever needed.