import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'restaurant.db');
export const db = new DatabaseSync(dbPath);

// Initialize tables for Part 2
export function initDatabase() {
  // Foreign keys enabled
  db.exec('PRAGMA foreign_keys = ON;');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'restaurant_owner',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Restaurants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      description TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create index on users email and restaurant owner_id
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);
  `);

  // Categories table for Part 3
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);

  // Food Items table for Part 3
  db.exec(`
    CREATE TABLE IF NOT EXISTS food_items (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      image_url TEXT DEFAULT '',
      is_available INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      min_prep_time INTEGER NOT NULL DEFAULT 15,
      max_prep_time INTEGER NOT NULL DEFAULT 25,
      batch_quantity INTEGER NOT NULL DEFAULT 4,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
  `);

  // Indexes for categories and food items
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON categories(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(restaurant_id, display_order);
    CREATE INDEX IF NOT EXISTS idx_food_items_restaurant_id ON food_items(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_food_items_category_id ON food_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_food_items_order ON food_items(category_id, display_order);
  `);

  // Restaurant Tables table for Part 4
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      table_number TEXT NOT NULL,
      display_label TEXT DEFAULT '',
      qr_code_token TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      UNIQUE(restaurant_id, table_number)
    );
  `);

  // Indexes for tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON restaurant_tables(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON restaurant_tables(qr_code_token);
  `);

  // Orders table for Part 5 (Customer Ordering)
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      restaurant_id TEXT NOT NULL,
      table_id TEXT NOT NULL,
      table_number_snapshot TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      customer_note TEXT DEFAULT '',
      subtotal REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      estimated_prep_min INTEGER DEFAULT 15,
      estimated_prep_max INTEGER DEFAULT 25,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE
    );
  `);

  // Order Items table for Part 5 (Items ordered with historical price snapshots)
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      food_item_id TEXT NOT NULL,
      food_name_snapshot TEXT NOT NULL,
      unit_price_snapshot REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE RESTRICT
    );
  `);

  // Indexes for orders and order items
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_orders_rest_status ON orders(restaurant_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_food ON order_items(food_item_id);
  `);

  // ==========================================
  // PART 7 MIGRATIONS & TABLES: STAFF & SERVICE REQUESTS
  // ==========================================

  // 1. Ensure users table has restaurant_id column
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some(col => col.name === 'restaurant_id')) {
    db.exec('ALTER TABLE users ADD COLUMN restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE;');
  }
  // Backfill restaurant_id for existing restaurant owners
  db.exec(`
    UPDATE users 
    SET restaurant_id = (SELECT id FROM restaurants WHERE owner_id = users.id)
    WHERE restaurant_id IS NULL AND role = 'restaurant_owner';
  `);

  // 2. Ensure restaurant_tables has operational_status column
  const tableCols = db.prepare("PRAGMA table_info(restaurant_tables)").all() as { name: string }[];
  if (!tableCols.some(col => col.name === 'operational_status')) {
    db.exec("ALTER TABLE restaurant_tables ADD COLUMN operational_status TEXT NOT NULL DEFAULT 'available';");
  }

  // 3. Ensure orders has attribution columns
  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderCols.some(col => col.name === 'updated_by_id')) {
    db.exec("ALTER TABLE orders ADD COLUMN updated_by_id TEXT;");
  }
  if (!orderCols.some(col => col.name === 'updated_by_name')) {
    db.exec("ALTER TABLE orders ADD COLUMN updated_by_name TEXT;");
  }

  // 4. Service Requests table for customer table calls & waiter assistance
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      table_id TEXT NOT NULL,
      table_number_snapshot TEXT NOT NULL,
      request_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      acknowledged_at TEXT,
      resolved_at TEXT,
      acknowledged_by_id TEXT,
      acknowledged_by_name TEXT,
      resolved_by_id TEXT,
      resolved_by_name TEXT,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE
    );
  `);

  // Indexes for service requests
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_service_requests_rest_status ON service_requests(restaurant_id, status);
    CREATE INDEX IF NOT EXISTS idx_service_requests_table ON service_requests(table_id);
    CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at);
  `);

  // ==========================================
  // FOOD PREPARATION TIME & BATCH QUANTITY MIGRATIONS
  // ==========================================
  const foodCols = db.prepare("PRAGMA table_info(food_items)").all() as { name: string }[];
  if (!foodCols.some(col => col.name === 'min_prep_time')) {
    db.exec("ALTER TABLE food_items ADD COLUMN min_prep_time INTEGER NOT NULL DEFAULT 15;");
  }
  if (!foodCols.some(col => col.name === 'max_prep_time')) {
    db.exec("ALTER TABLE food_items ADD COLUMN max_prep_time INTEGER NOT NULL DEFAULT 25;");
  }
  if (!foodCols.some(col => col.name === 'batch_quantity')) {
    db.exec("ALTER TABLE food_items ADD COLUMN batch_quantity INTEGER NOT NULL DEFAULT 4;");
  }

  // Update existing food items to have realistic defaults matching requested examples
  db.exec(`
    UPDATE food_items 
    SET min_prep_time = 20, max_prep_time = 30, batch_quantity = 4 
    WHERE LOWER(name) LIKE '%pizza%' AND (min_prep_time = 15 AND max_prep_time = 25);
    
    UPDATE food_items 
    SET min_prep_time = 10, max_prep_time = 15, batch_quantity = 4 
    WHERE LOWER(name) LIKE '%burger%' AND (min_prep_time = 15 AND max_prep_time = 25);

    UPDATE food_items 
    SET min_prep_time = 15, max_prep_time = 20, batch_quantity = 2 
    WHERE LOWER(name) LIKE '%pasta%' AND (min_prep_time = 15 AND max_prep_time = 25);
  `);

  // Orders estimated prep time columns
  const orderTableCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderTableCols.some(col => col.name === 'estimated_prep_min')) {
    db.exec("ALTER TABLE orders ADD COLUMN estimated_prep_min INTEGER DEFAULT 15;");
  }
  if (!orderTableCols.some(col => col.name === 'estimated_prep_max')) {
    db.exec("ALTER TABLE orders ADD COLUMN estimated_prep_max INTEGER DEFAULT 25;");
  }

  console.log('Database initialized successfully with Users, Restaurants, Categories, Food Items, Restaurant Tables, Orders, Order Items, and Service Requests.');
}
