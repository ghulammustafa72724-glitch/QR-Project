import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
  AuthenticatedRequest,
  AuthenticatedUser,
} from './auth.js';
import {
  broadcastOrderCreated,
  broadcastOrderStatusChanged,
  broadcastServiceRequestCreated,
  broadcastServiceRequestUpdated,
  broadcastTableStatusChanged,
  broadcastStaffUpdated,
  disconnectStaffUser,
} from './realtime.js';

export const apiRouter = Router();

// Email format regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to get restaurant for any authenticated user (Owner, Waiter, Kitchen Staff)
function getUserRestaurant(user: AuthenticatedUser) {
  if (user.restaurant_id) {
    const stmt = db.prepare('SELECT id, name FROM restaurants WHERE id = ?');
    const rest = stmt.get(user.restaurant_id) as { id: string; name: string } | undefined;
    if (rest) return rest;
  }
  const stmt = db.prepare('SELECT id, name FROM restaurants WHERE owner_id = ?');
  return stmt.get(user.id) as { id: string; name: string } | undefined;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register a new restaurant owner & their restaurant
apiRouter.post('/auth/register', (req, res: Response): void => {
  try {
    const { name, email, password, confirmPassword, restaurantName } = req.body;

    // 1. Validation: Name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Name is required and must be at least 2 characters.' });
      return;
    }

    // 2. Validation: Email
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Validation: Password
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password is required and must be at least 6 characters long.' });
      return;
    }

    // 4. Validation: Confirm password
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    // 5. Validation: Restaurant Name
    if (!restaurantName || typeof restaurantName !== 'string' || restaurantName.trim().length < 2) {
      res.status(400).json({ error: 'Restaurant name is required and must be at least 2 characters.' });
      return;
    }

    // 6. Check for duplicate email
    const existingUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = existingUserStmt.get(normalizedEmail);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // 7. Create User & Restaurant
    const userId = randomUUID();
    const restaurantId = randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    // Insert user first with restaurant_id as null (to satisfy FK constraint)
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, restaurant_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'restaurant_owner', 'active', NULL, ?, ?)
    `);
    insertUser.run(userId, name.trim(), normalizedEmail, passwordHash, now, now);

    // Insert restaurant linked to this user
    const insertRestaurant = db.prepare(`
      INSERT INTO restaurants (id, name, owner_id, description, phone, email, address, logo_url, created_at, updated_at)
      VALUES (?, ?, ?, '', '', ?, '', '', ?, ?)
    `);
    insertRestaurant.run(
      restaurantId,
      restaurantName.trim(),
      userId,
      normalizedEmail,
      now,
      now
    );

    // Link user to restaurant
    db.prepare('UPDATE users SET restaurant_id = ? WHERE id = ?').run(restaurantId, userId);

    // Query back the newly created restaurant
    const getRestaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?');
    const createdRestaurant = getRestaurant.get(restaurantId);

    // 8. Generate JWT session token
    const token = generateToken({
      userId,
      email: normalizedEmail,
      role: 'restaurant_owner',
    });

    res.status(201).json({
      message: 'Account and restaurant registered successfully.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'restaurant_owner',
        status: 'active',
        restaurant_id: restaurantId,
      },
      restaurant: createdRestaurant,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to complete registration. Please try again later.' });
  }
});

// Login
apiRouter.post('/auth/login', (req, res: Response): void => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Query user
    const userStmt = db.prepare(`
      SELECT id, name, email, password_hash, role, status, restaurant_id, created_at
      FROM users
      WHERE email = ?
    `);
    const user = userStmt.get(normalizedEmail) as any;

    // Insecure credential check protection (generic error)
    if (!user || !comparePassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
      return;
    }

    // Query restaurant associated with user (owner or staff)
    const restaurant = getUserRestaurant(user);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        restaurant_id: user.restaurant_id || restaurant?.id,
        createdAt: user.created_at,
      },
      restaurant,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// Get current authenticated user & restaurant
apiRouter.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user!;
    const restaurant = getUserRestaurant(user);

    res.json({
      user,
      restaurant,
    });
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
});

// ==========================================
// RESTAURANT PROFILE ROUTES (PROTECTED)
// ==========================================

// Get restaurant profile for logged in owner
apiRouter.get('/restaurant', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurantStmt = db.prepare('SELECT * FROM restaurants WHERE owner_id = ?');
    const restaurant = restaurantStmt.get(req.user!.id);

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found for this account.' });
      return;
    }

    res.json({ restaurant });
  } catch (err) {
    console.error('Error fetching restaurant:', err);
    res.status(500).json({ error: 'Failed to load restaurant profile.' });
  }
});

// Update restaurant profile (strictly ownership protected)
apiRouter.put('/restaurant', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can update restaurant profile.' });
      return;
    }
    const { name, description, phone, email, address } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Restaurant name is required and must be at least 2 characters.' });
      return;
    }

    if (email && (!EMAIL_REGEX.test(email.trim()))) {
      res.status(400).json({ error: 'Provided restaurant contact email is invalid.' });
      return;
    }

    // Find restaurant owned by current user
    const findStmt = db.prepare('SELECT id FROM restaurants WHERE owner_id = ?');
    const existingRestaurant = findStmt.get(req.user!.id) as { id: string } | undefined;

    if (!existingRestaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE restaurants
      SET name = ?,
          description = ?,
          phone = ?,
          email = ?,
          address = ?,
          updated_at = ?
      WHERE id = ? AND owner_id = ?
    `);

    updateStmt.run(
      name.trim(),
      typeof description === 'string' ? description.trim() : '',
      typeof phone === 'string' ? phone.trim() : '',
      email ? email.trim().toLowerCase() : '',
      typeof address === 'string' ? address.trim() : '',
      now,
      existingRestaurant.id,
      req.user!.id
    );

    // Fetch updated restaurant
    const updatedStmt = db.prepare('SELECT * FROM restaurants WHERE id = ?');
    const updatedRestaurant = updatedStmt.get(existingRestaurant.id);

    res.json({
      message: 'Restaurant profile updated successfully.',
      restaurant: updatedRestaurant,
    });
  } catch (err) {
    console.error('Error updating restaurant:', err);
    res.status(500).json({ error: 'Failed to update restaurant profile.' });
  }
});

// ==========================================
// PART 3: CATEGORY MANAGEMENT ROUTES
// ==========================================

// Helper to get restaurant for authenticated owner
function getOwnerRestaurant(userId: string) {
  const stmt = db.prepare('SELECT id, name FROM restaurants WHERE owner_id = ?');
  return stmt.get(userId) as { id: string; name: string } | undefined;
}

// Get all categories for current owner's restaurant (with item counts)
apiRouter.get('/categories', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found for this account.' });
      return;
    }

    const stmt = db.prepare(`
      SELECT 
        c.id,
        c.restaurant_id,
        c.name,
        c.description,
        c.display_order,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(f.id) as food_count
      FROM categories c
      LEFT JOIN food_items f ON f.category_id = c.id AND f.restaurant_id = c.restaurant_id
      WHERE c.restaurant_id = ?
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.created_at ASC
    `);

    const categories = stmt.all(restaurant.id);
    res.json({ categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to load categories.' });
  }
});

// Create a new category
apiRouter.post('/categories', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can manage categories.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { name, description, is_active, display_order } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Category name is required and must be at least 2 characters.' });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({ error: 'Category name cannot exceed 100 characters.' });
      return;
    }

    if (description && typeof description === 'string' && description.trim().length > 500) {
      res.status(400).json({ error: 'Description cannot exceed 500 characters.' });
      return;
    }

    // Determine display order
    let orderNum = 0;
    if (typeof display_order === 'number' && display_order >= 0) {
      orderNum = Math.floor(display_order);
    } else {
      const maxStmt = db.prepare('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM categories WHERE restaurant_id = ?');
      const maxRow = maxStmt.get(restaurant.id) as { next_order: number };
      orderNum = maxRow?.next_order || 1;
    }

    const categoryId = randomUUID();
    const now = new Date().toISOString();
    const activeVal = is_active === false || is_active === 0 ? 0 : 1;

    const insertStmt = db.prepare(`
      INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      categoryId,
      restaurant.id,
      name.trim(),
      typeof description === 'string' ? description.trim() : '',
      orderNum,
      activeVal,
      now,
      now
    );

    const getStmt = db.prepare('SELECT *, 0 as food_count FROM categories WHERE id = ?');
    const createdCategory = getStmt.get(categoryId);

    res.status(201).json({
      message: 'Category created successfully.',
      category: createdCategory,
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// Update a category
apiRouter.put('/categories/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can manage categories.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;
    const { name, description, is_active, display_order } = req.body;

    // Verify category exists and belongs to this restaurant (Strict Ownership Isolation)
    const verifyStmt = db.prepare('SELECT id FROM categories WHERE id = ? AND restaurant_id = ?');
    const existing = verifyStmt.get(id, restaurant.id);
    if (!existing) {
      res.status(404).json({ error: 'Category not found or does not belong to your restaurant.' });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Category name is required and must be at least 2 characters.' });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({ error: 'Category name cannot exceed 100 characters.' });
      return;
    }

    const now = new Date().toISOString();
    const activeVal = is_active === false || is_active === 0 ? 0 : 1;
    const orderVal = typeof display_order === 'number' && display_order >= 0 ? Math.floor(display_order) : 0;

    const updateStmt = db.prepare(`
      UPDATE categories
      SET name = ?,
          description = ?,
          display_order = ?,
          is_active = ?,
          updated_at = ?
      WHERE id = ? AND restaurant_id = ?
    `);

    updateStmt.run(
      name.trim(),
      typeof description === 'string' ? description.trim() : '',
      orderVal,
      activeVal,
      now,
      id,
      restaurant.id
    );

    const getStmt = db.prepare(`
      SELECT c.*, COUNT(f.id) as food_count
      FROM categories c
      LEFT JOIN food_items f ON f.category_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `);
    const updatedCategory = getStmt.get(id);

    res.json({
      message: 'Category updated successfully.',
      category: updatedCategory,
    });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// Delete a category safely (Strict Safe Deletion: Prevents deleting categories containing food items)
apiRouter.delete('/categories/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can manage categories.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;

    // Verify ownership
    const verifyStmt = db.prepare('SELECT id, name FROM categories WHERE id = ? AND restaurant_id = ?');
    const existing = verifyStmt.get(id, restaurant.id) as { id: string; name: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Category not found or does not belong to your restaurant.' });
      return;
    }

    // Check if category contains food items
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM food_items WHERE category_id = ? AND restaurant_id = ?');
    const countRow = countStmt.get(id, restaurant.id) as { count: number };

    if (countRow && countRow.count > 0) {
      res.status(400).json({
        error: `Cannot delete category "${existing.name}" because it contains ${countRow.count} food item(s). Please move or delete the food items first.`,
      });
      return;
    }

    // Delete empty category safely
    const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ? AND restaurant_id = ?');
    deleteStmt.run(id, restaurant.id);

    res.json({
      message: 'Category deleted successfully.',
      deletedId: id,
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// Reorder categories
apiRouter.put('/categories/reorder/batch', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { orders } = req.body; // Array of { id: string, display_order: number }
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'Invalid orders payload.' });
      return;
    }

    const updateStmt = db.prepare('UPDATE categories SET display_order = ? WHERE id = ? AND restaurant_id = ?');
    for (const item of orders) {
      if (typeof item.id === 'string' && typeof item.display_order === 'number') {
        updateStmt.run(Math.floor(item.display_order), item.id, restaurant.id);
      }
    }

    res.json({ message: 'Category order updated successfully.' });
  } catch (err) {
    console.error('Error reordering categories:', err);
    res.status(500).json({ error: 'Failed to reorder categories.' });
  }
});

// ==========================================
// PART 3: FOOD ITEM MANAGEMENT ROUTES
// ==========================================

// Get all food items for owner's restaurant (optional filter ?category_id=...)
apiRouter.get('/food-items', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const categoryId = req.query.category_id as string | undefined;

    let query = `
      SELECT 
        f.id,
        f.restaurant_id,
        f.category_id,
        f.name,
        f.description,
        f.price,
        f.image_url,
        f.is_available,
        f.display_order,
        f.created_at,
        f.updated_at,
        c.name as category_name
      FROM food_items f
      JOIN categories c ON c.id = f.category_id
      WHERE f.restaurant_id = ?
    `;

    const params: any[] = [restaurant.id];

    if (categoryId) {
      query += ' AND f.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY f.display_order ASC, f.created_at ASC';

    const stmt = db.prepare(query);
    const foodItems = stmt.all(...params);

    res.json({ foodItems });
  } catch (err) {
    console.error('Error fetching food items:', err);
    res.status(500).json({ error: 'Failed to load food items.' });
  }
});

// Get single food item
apiRouter.get('/food-items/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT f.*, c.name as category_name
      FROM food_items f
      JOIN categories c ON c.id = f.category_id
      WHERE f.id = ? AND f.restaurant_id = ?
    `);

    const foodItem = stmt.get(id, restaurant.id);
    if (!foodItem) {
      res.status(404).json({ error: 'Food item not found.' });
      return;
    }

    res.json({ foodItem });
  } catch (err) {
    console.error('Error fetching food item:', err);
    res.status(500).json({ error: 'Failed to load food item.' });
  }
});

// Create food item
apiRouter.post('/food-items', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can create food items.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const {
      name,
      category_id,
      price,
      description,
      image_url,
      is_available,
      display_order,
      min_prep_time,
      max_prep_time,
      batch_quantity,
    } = req.body;

    // 1. Validate Name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Food name is required and must be at least 2 characters.' });
      return;
    }
    if (name.trim().length > 150) {
      res.status(400).json({ error: 'Food name cannot exceed 150 characters.' });
      return;
    }

    // 2. Validate Category: Must exist AND belong to the authenticated owner's restaurant!
    if (!category_id || typeof category_id !== 'string') {
      res.status(400).json({ error: 'Valid category selection is required.' });
      return;
    }

    const catStmt = db.prepare('SELECT id, name FROM categories WHERE id = ? AND restaurant_id = ?');
    const category = catStmt.get(category_id, restaurant.id) as { id: string; name: string } | undefined;
    if (!category) {
      res.status(400).json({ error: 'Selected category does not exist or does not belong to your restaurant.' });
      return;
    }

    // 3. Validate Price: Numeric, non-negative, reasonable precision
    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ error: 'Please enter a valid, non-negative price.' });
      return;
    }
    if (parsedPrice > 100000) {
      res.status(400).json({ error: 'Price exceeds maximum reasonable limit.' });
      return;
    }
    const safePrice = Math.round(parsedPrice * 100) / 100;

    // 4. Validate Description
    if (description && typeof description === 'string' && description.trim().length > 1000) {
      res.status(400).json({ error: 'Description cannot exceed 1000 characters.' });
      return;
    }

    // 5. Image URL
    let safeImageUrl = '';
    if (image_url && typeof image_url === 'string') {
      safeImageUrl = image_url.trim().slice(0, 500);
    }

    // 6. Display Order
    let orderNum = 0;
    if (typeof display_order === 'number' && display_order >= 0) {
      orderNum = Math.floor(display_order);
    } else {
      const maxStmt = db.prepare('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM food_items WHERE category_id = ?');
      const maxRow = maxStmt.get(category_id) as { next_order: number };
      orderNum = maxRow?.next_order || 1;
    }

    // 7. Validate Preparation Time & Batch Quantity
    let safeMinPrep = 15;
    if (min_prep_time !== undefined && min_prep_time !== null && min_prep_time !== '') {
      const parsedMin = parseInt(String(min_prep_time), 10);
      if (isNaN(parsedMin) || parsedMin < 1 || parsedMin > 240) {
        res.status(400).json({ error: 'Minimum preparation time must be between 1 and 240 minutes.' });
        return;
      }
      safeMinPrep = parsedMin;
    }

    let safeMaxPrep = Math.max(safeMinPrep, 25);
    if (max_prep_time !== undefined && max_prep_time !== null && max_prep_time !== '') {
      const parsedMax = parseInt(String(max_prep_time), 10);
      if (isNaN(parsedMax) || parsedMax < 1 || parsedMax > 240) {
        res.status(400).json({ error: 'Maximum preparation time must be between 1 and 240 minutes.' });
        return;
      }
      if (parsedMax < safeMinPrep) {
        res.status(400).json({ error: 'Maximum preparation time cannot be less than minimum preparation time.' });
        return;
      }
      safeMaxPrep = parsedMax;
    }

    let safeBatchQty = 4;
    if (batch_quantity !== undefined && batch_quantity !== null && batch_quantity !== '') {
      const parsedBatch = parseInt(String(batch_quantity), 10);
      if (isNaN(parsedBatch) || parsedBatch < 1 || parsedBatch > 100) {
        res.status(400).json({ error: 'Batch quantity must be a whole number between 1 and 100.' });
        return;
      }
      safeBatchQty = parsedBatch;
    }

    const foodItemId = randomUUID();
    const now = new Date().toISOString();
    const activeAvailable = is_available === false || is_available === 0 ? 0 : 1;

    const insertStmt = db.prepare(`
      INSERT INTO food_items (
        id, restaurant_id, category_id, name, description, price, image_url, is_available, display_order,
        min_prep_time, max_prep_time, batch_quantity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      foodItemId,
      restaurant.id,
      category_id,
      name.trim(),
      typeof description === 'string' ? description.trim() : '',
      safePrice,
      safeImageUrl,
      activeAvailable,
      orderNum,
      safeMinPrep,
      safeMaxPrep,
      safeBatchQty,
      now,
      now
    );

    const getStmt = db.prepare(`
      SELECT f.*, c.name as category_name
      FROM food_items f
      JOIN categories c ON c.id = f.category_id
      WHERE f.id = ?
    `);
    const createdFood = getStmt.get(foodItemId);

    res.status(201).json({
      message: 'Food item created successfully.',
      foodItem: createdFood,
    });
  } catch (err) {
    console.error('Error creating food item:', err);
    res.status(500).json({ error: 'Failed to create food item.' });
  }
});

// Update food item
apiRouter.put('/food-items/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can update food items.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;
    const {
      name,
      category_id,
      price,
      description,
      image_url,
      is_available,
      display_order,
      min_prep_time,
      max_prep_time,
      batch_quantity,
    } = req.body;

    // Verify existing item belongs to this restaurant
    const verifyStmt = db.prepare('SELECT * FROM food_items WHERE id = ? AND restaurant_id = ?');
    const existing = verifyStmt.get(id, restaurant.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Food item not found or does not belong to your restaurant.' });
      return;
    }

    // 1. Validate Name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Food name is required and must be at least 2 characters.' });
      return;
    }

    // 2. Validate Category if provided / changed
    if (!category_id || typeof category_id !== 'string') {
      res.status(400).json({ error: 'Category selection is required.' });
      return;
    }
    const catStmt = db.prepare('SELECT id FROM categories WHERE id = ? AND restaurant_id = ?');
    const category = catStmt.get(category_id, restaurant.id);
    if (!category) {
      res.status(400).json({ error: 'Selected category does not exist or does not belong to your restaurant.' });
      return;
    }

    // 3. Validate Price
    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ error: 'Please enter a valid, non-negative price.' });
      return;
    }
    const safePrice = Math.round(parsedPrice * 100) / 100;

    // 4. Validate Preparation Time & Batch Quantity
    let safeMinPrep = existing.min_prep_time || 15;
    if (min_prep_time !== undefined && min_prep_time !== null && min_prep_time !== '') {
      const parsedMin = parseInt(String(min_prep_time), 10);
      if (isNaN(parsedMin) || parsedMin < 1 || parsedMin > 240) {
        res.status(400).json({ error: 'Minimum preparation time must be between 1 and 240 minutes.' });
        return;
      }
      safeMinPrep = parsedMin;
    }

    let safeMaxPrep = Math.max(safeMinPrep, existing.max_prep_time || 25);
    if (max_prep_time !== undefined && max_prep_time !== null && max_prep_time !== '') {
      const parsedMax = parseInt(String(max_prep_time), 10);
      if (isNaN(parsedMax) || parsedMax < 1 || parsedMax > 240) {
        res.status(400).json({ error: 'Maximum preparation time must be between 1 and 240 minutes.' });
        return;
      }
      if (parsedMax < safeMinPrep) {
        res.status(400).json({ error: 'Maximum preparation time cannot be less than minimum preparation time.' });
        return;
      }
      safeMaxPrep = parsedMax;
    }

    let safeBatchQty = existing.batch_quantity || 4;
    if (batch_quantity !== undefined && batch_quantity !== null && batch_quantity !== '') {
      const parsedBatch = parseInt(String(batch_quantity), 10);
      if (isNaN(parsedBatch) || parsedBatch < 1 || parsedBatch > 100) {
        res.status(400).json({ error: 'Batch quantity must be a whole number between 1 and 100.' });
        return;
      }
      safeBatchQty = parsedBatch;
    }

    const now = new Date().toISOString();
    const activeAvailable = is_available === false || is_available === 0 ? 0 : 1;
    const orderVal = typeof display_order === 'number' && display_order >= 0 ? Math.floor(display_order) : 0;
    const safeImageUrl = typeof image_url === 'string' ? image_url.trim().slice(0, 500) : '';

    const updateStmt = db.prepare(`
      UPDATE food_items
      SET name = ?,
          category_id = ?,
          price = ?,
          description = ?,
          image_url = ?,
          is_available = ?,
          display_order = ?,
          min_prep_time = ?,
          max_prep_time = ?,
          batch_quantity = ?,
          updated_at = ?
      WHERE id = ? AND restaurant_id = ?
    `);

    updateStmt.run(
      name.trim(),
      category_id,
      safePrice,
      typeof description === 'string' ? description.trim() : '',
      safeImageUrl,
      activeAvailable,
      orderVal,
      safeMinPrep,
      safeMaxPrep,
      safeBatchQty,
      now,
      id,
      restaurant.id
    );

    const getStmt = db.prepare(`
      SELECT f.*, c.name as category_name
      FROM food_items f
      JOIN categories c ON c.id = f.category_id
      WHERE f.id = ?
    `);
    const updatedFood = getStmt.get(id);

    res.json({
      message: 'Food item updated successfully.',
      foodItem: updatedFood,
    });
  } catch (err) {
    console.error('Error updating food item:', err);
    res.status(500).json({ error: 'Failed to update food item.' });
  }
});

// Toggle food item availability
apiRouter.patch('/food-items/:id/availability', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can toggle availability.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;
    const { is_available } = req.body;

    const activeAvailable = is_available === false || is_available === 0 ? 0 : 1;
    const now = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE food_items
      SET is_available = ?,
          updated_at = ?
      WHERE id = ? AND restaurant_id = ?
    `);

    const result = updateStmt.run(activeAvailable, now, id, restaurant.id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Food item not found or does not belong to your restaurant.' });
      return;
    }

    res.json({
      message: `Food item marked as ${activeAvailable ? 'available' : 'unavailable'}.`,
      is_available: activeAvailable,
    });
  } catch (err) {
    console.error('Error toggling availability:', err);
    res.status(500).json({ error: 'Failed to update availability.' });
  }
});

// Delete food item
apiRouter.delete('/food-items/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can delete food items.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;

    const deleteStmt = db.prepare('DELETE FROM food_items WHERE id = ? AND restaurant_id = ?');
    const result = deleteStmt.run(id, restaurant.id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Food item not found or does not belong to your restaurant.' });
      return;
    }

    res.json({
      message: 'Food item deleted successfully.',
      deletedId: id,
    });
  } catch (err) {
    console.error('Error deleting food item:', err);
    res.status(500).json({ error: 'Failed to delete food item.' });
  }
});

// Reorder food items
apiRouter.put('/food-items/reorder/batch', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { orders } = req.body; // Array of { id: string, display_order: number }
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'Invalid orders payload.' });
      return;
    }

    const updateStmt = db.prepare('UPDATE food_items SET display_order = ? WHERE id = ? AND restaurant_id = ?');
    for (const item of orders) {
      if (typeof item.id === 'string' && typeof item.display_order === 'number') {
        updateStmt.run(Math.floor(item.display_order), item.id, restaurant.id);
      }
    }

    res.json({ message: 'Food item order updated successfully.' });
  } catch (err) {
    console.error('Error reordering food items:', err);
    res.status(500).json({ error: 'Failed to reorder food items.' });
  }
});

// ==========================================
// PART 4: RESTAURANT TABLE & QR ROUTES
// ==========================================

// Get all tables for owner's restaurant
apiRouter.get('/tables', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found for this account.' });
      return;
    }

    const stmt = db.prepare(`
      SELECT id, restaurant_id, table_number, display_label, qr_code_token, is_active, operational_status, created_at, updated_at
      FROM restaurant_tables
      WHERE restaurant_id = ?
      ORDER BY table_number ASC, created_at ASC
    `);

    const tables = stmt.all(restaurant.id);
    res.json({ tables, restaurantName: restaurant.name });
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Failed to load restaurant tables.' });
  }
});

// Get single table
apiRouter.get('/tables/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT id, restaurant_id, table_number, display_label, qr_code_token, is_active, operational_status, created_at, updated_at
      FROM restaurant_tables
      WHERE id = ? AND restaurant_id = ?
    `);

    const table = stmt.get(id, restaurant.id);
    if (!table) {
      res.status(404).json({ error: 'Table not found or does not belong to your restaurant.' });
      return;
    }

    res.json({ table, restaurantName: restaurant.name });
  } catch (err) {
    console.error('Error fetching table:', err);
    res.status(500).json({ error: 'Failed to load table details.' });
  }
});

// Create new table
apiRouter.post('/tables', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can create tables.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { table_number, display_label, is_active } = req.body;

    // 1. Validation: Table number/name
    if (!table_number || typeof table_number !== 'string' || table_number.trim().length === 0) {
      res.status(400).json({ error: 'Table number or name is required.' });
      return;
    }
    const cleanNumber = table_number.trim();
    if (cleanNumber.length > 50) {
      res.status(400).json({ error: 'Table number/name cannot exceed 50 characters.' });
      return;
    }

    // 2. Uniqueness check within the same restaurant
    const dupStmt = db.prepare('SELECT id FROM restaurant_tables WHERE restaurant_id = ? AND LOWER(table_number) = LOWER(?)');
    const duplicate = dupStmt.get(restaurant.id, cleanNumber);
    if (duplicate) {
      res.status(409).json({ error: `A table with the identifier "${cleanNumber}" already exists in your restaurant.` });
      return;
    }

    // 3. Display label
    const cleanLabel = typeof display_label === 'string' ? display_label.trim().slice(0, 100) : '';

    const tableId = randomUUID();
    const qrToken = randomUUID();
    const now = new Date().toISOString();
    const activeVal = is_active === false || is_active === 0 ? 0 : 1;

    const insertStmt = db.prepare(`
      INSERT INTO restaurant_tables (
        id, restaurant_id, table_number, display_label, qr_code_token, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      tableId,
      restaurant.id,
      cleanNumber,
      cleanLabel,
      qrToken,
      activeVal,
      now,
      now
    );

    const getStmt = db.prepare('SELECT * FROM restaurant_tables WHERE id = ?');
    const createdTable = getStmt.get(tableId);

    res.status(201).json({
      message: 'Table created successfully.',
      table: createdTable,
      restaurantName: restaurant.name,
    });
  } catch (err) {
    console.error('Error creating table:', err);
    res.status(500).json({ error: 'Failed to create restaurant table.' });
  }
});

// Update table
apiRouter.put('/tables/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can update tables.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;
    const { table_number, display_label, is_active } = req.body;

    // Verify existing table belongs to owner's restaurant
    const verifyStmt = db.prepare('SELECT id, qr_code_token FROM restaurant_tables WHERE id = ? AND restaurant_id = ?');
    const existing = verifyStmt.get(id, restaurant.id) as { id: string; qr_code_token: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Table not found or does not belong to your restaurant.' });
      return;
    }

    if (!table_number || typeof table_number !== 'string' || table_number.trim().length === 0) {
      res.status(400).json({ error: 'Table number or name is required.' });
      return;
    }
    const cleanNumber = table_number.trim();

    // Check duplicate table identifier in same restaurant
    const dupStmt = db.prepare('SELECT id FROM restaurant_tables WHERE restaurant_id = ? AND LOWER(table_number) = LOWER(?) AND id != ?');
    const duplicate = dupStmt.get(restaurant.id, cleanNumber, id);
    if (duplicate) {
      res.status(409).json({ error: `A table with the identifier "${cleanNumber}" already exists in your restaurant.` });
      return;
    }

    const cleanLabel = typeof display_label === 'string' ? display_label.trim().slice(0, 100) : '';
    const now = new Date().toISOString();
    const activeVal = is_active === false || is_active === 0 ? 0 : 1;

    // Note: QR code token is strictly preserved on normal edit to keep existing printed QRs stable!
    const updateStmt = db.prepare(`
      UPDATE restaurant_tables
      SET table_number = ?,
          display_label = ?,
          is_active = ?,
          updated_at = ?
      WHERE id = ? AND restaurant_id = ?
    `);

    updateStmt.run(
      cleanNumber,
      cleanLabel,
      activeVal,
      now,
      id,
      restaurant.id
    );

    const getStmt = db.prepare('SELECT * FROM restaurant_tables WHERE id = ?');
    const updatedTable = getStmt.get(id);

    res.json({
      message: 'Table updated successfully.',
      table: updatedTable,
    });
  } catch (err) {
    console.error('Error updating table:', err);
    res.status(500).json({ error: 'Failed to update table.' });
  }
});

// Toggle table active status
apiRouter.patch('/tables/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;
    const { is_active } = req.body;

    const activeVal = is_active === false || is_active === 0 ? 0 : 1;
    const now = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE restaurant_tables
      SET is_active = ?,
          updated_at = ?
      WHERE id = ? AND restaurant_id = ?
    `);

    const result = updateStmt.run(activeVal, now, id, restaurant.id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Table not found or does not belong to your restaurant.' });
      return;
    }

    res.json({
      message: `Table marked as ${activeVal ? 'active' : 'inactive'}.`,
      is_active: activeVal,
    });
  } catch (err) {
    console.error('Error updating table status:', err);
    res.status(500).json({ error: 'Failed to update table status.' });
  }
});

// Delete table safely
apiRouter.delete('/tables/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can delete tables.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;

    const deleteStmt = db.prepare('DELETE FROM restaurant_tables WHERE id = ? AND restaurant_id = ?');
    const result = deleteStmt.run(id, restaurant.id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Table not found or does not belong to your restaurant.' });
      return;
    }

    res.json({
      message: 'Table deleted successfully.',
      deletedId: id,
    });
  } catch (err) {
    console.error('Error deleting table:', err);
    res.status(500).json({ error: 'Failed to delete table.' });
  }
});

// Regenerate QR Code Token (with explicit security warning)
apiRouter.post('/tables/:id/regenerate-qr', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can regenerate QR codes.' });
      return;
    }
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { id } = req.params;

    // Verify ownership
    const verifyStmt = db.prepare('SELECT id, table_number FROM restaurant_tables WHERE id = ? AND restaurant_id = ?');
    const table = verifyStmt.get(id, restaurant.id) as { id: string; table_number: string } | undefined;
    if (!table) {
      res.status(404).json({ error: 'Table not found or does not belong to your restaurant.' });
      return;
    }

    const newToken = randomUUID();
    const now = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE restaurant_tables
      SET qr_code_token = ?,
          updated_at = ?
      WHERE id = ? AND restaurant_id = ?
    `);

    updateStmt.run(newToken, now, id, restaurant.id);

    const getStmt = db.prepare('SELECT * FROM restaurant_tables WHERE id = ?');
    const updatedTable = getStmt.get(id);

    res.json({
      message: `QR Code regenerated successfully for ${table.table_number}. Previous QR code is now invalidated.`,
      table: updatedTable,
    });
  } catch (err) {
    console.error('Error regenerating QR:', err);
    res.status(500).json({ error: 'Failed to regenerate QR code.' });
  }
});

// ==========================================
// PART 4 & 5: PUBLIC TABLE SCAN & CUSTOMER MENU ENDPOINTS
// ==========================================

// Helper to generate customer-friendly order references like ORD-260927-4829
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}${month}${day}-${randomSuffix}`;
}

// 1. Public Table Scan & Customer Digital Menu Loader
apiRouter.get('/public/r/:restaurantId/t/:tableId', (req, res: Response): void => {
  try {
    const { restaurantId, tableId } = req.params;

    // 1. Verify restaurant exists
    const restStmt = db.prepare('SELECT id, name, description, address, phone, logo_url FROM restaurants WHERE id = ?');
    const restaurant = restStmt.get(restaurantId) as any;
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found or no longer active.' });
      return;
    }

    // 2. Verify table exists and belongs to this restaurant
    const tableStmt = db.prepare(`
      SELECT id, restaurant_id, table_number, display_label, is_active, qr_code_token
      FROM restaurant_tables
      WHERE id = ? AND restaurant_id = ?
    `);
    const table = tableStmt.get(tableId, restaurantId) as any;
    if (!table) {
      res.status(404).json({ error: 'Table not found or does not belong to this restaurant.' });
      return;
    }

    // 3. Check active state
    if (table.is_active !== 1) {
      res.json({
        status: 'inactive',
        message: 'This table is currently unavailable.',
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
          logo_url: restaurant.logo_url,
        },
        table: {
          id: table.id,
          table_number: table.table_number,
          display_label: table.display_label,
          is_active: 0,
        },
        categories: [],
        food_items: [],
      });
      return;
    }

    // 4. Retrieve customer-visible categories for this restaurant
    const catStmt = db.prepare(`
      SELECT id, restaurant_id, name, description, display_order
      FROM categories
      WHERE restaurant_id = ? AND is_active = 1
      ORDER BY display_order ASC, name ASC
    `);
    const categories = catStmt.all(restaurantId);

    // 5. Retrieve customer-visible available food items for this restaurant
    const itemsStmt = db.prepare(`
      SELECT 
        fi.id,
        fi.restaurant_id,
        fi.category_id,
        fi.name,
        fi.description,
        fi.price,
        fi.image_url,
        fi.is_available,
        fi.display_order,
        fi.min_prep_time,
        fi.max_prep_time,
        fi.batch_quantity,
        c.name as category_name
      FROM food_items fi
      JOIN categories c ON fi.category_id = c.id
      WHERE fi.restaurant_id = ?
        AND c.is_active = 1
        AND fi.is_available = 1
      ORDER BY fi.display_order ASC, fi.name ASC
    `);
    const foodItems = itemsStmt.all(restaurantId);

    // 6. Return verified customer menu context
    res.json({
      status: 'active',
      message: 'Table verified and digital menu loaded.',
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        logo_url: restaurant.logo_url,
      },
      table: {
        id: table.id,
        table_number: table.table_number,
        display_label: table.display_label,
        is_active: 1,
        qr_code_token: table.qr_code_token,
      },
      categories,
      food_items: foodItems,
    });
  } catch (err) {
    console.error('Public table scan error:', err);
    res.status(500).json({ error: 'Unable to process table and menu information.' });
  }
});

// 2. Customer Order Placement (Atomic, Authoritative Server-Calculated Totals)
apiRouter.post('/public/r/:restaurantId/t/:tableId/orders', (req, res: Response): void => {
  try {
    const { restaurantId, tableId } = req.params;
    const { customer_name, customer_note, items } = req.body;

    // 1. Verify restaurant exists
    const restStmt = db.prepare('SELECT id, name FROM restaurants WHERE id = ?');
    const restaurant = restStmt.get(restaurantId) as any;
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    // 2. Verify table exists, belongs to restaurant, and is active
    const tableStmt = db.prepare(`
      SELECT id, table_number, is_active
      FROM restaurant_tables
      WHERE id = ? AND restaurant_id = ?
    `);
    const table = tableStmt.get(tableId, restaurantId) as any;
    if (!table) {
      res.status(404).json({ error: 'Table not found or does not belong to this restaurant.' });
      return;
    }
    if (table.is_active !== 1) {
      res.status(400).json({ error: 'This table is currently inactive. Orders cannot be accepted.' });
      return;
    }

    // 3. Validate items list
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty. Please add items before placing an order.' });
      return;
    }

    // 4. Validate customer_name and customer_note length
    let sanitizedCustomerName = '';
    if (customer_name && typeof customer_name === 'string') {
      sanitizedCustomerName = customer_name.trim().slice(0, 100);
    }

    let sanitizedCustomerNote = '';
    if (customer_note && typeof customer_note === 'string') {
      sanitizedCustomerNote = customer_note.trim().slice(0, 500);
    }

    // 5. Authoritatively validate each item and fetch current DB price
    interface ValidatedOrderItem {
      food_item_id: string;
      food_name: string;
      unit_price: number;
      quantity: number;
      line_total: number;
      min_prep_time: number;
      max_prep_time: number;
      batch_quantity: number;
    }

    const validatedItems: ValidatedOrderItem[] = [];
    let subtotal = 0;

    // Item verification query (checks food item belongs to restaurant, is available, and category is active)
    const itemStmt = db.prepare(`
      SELECT 
        fi.id, 
        fi.restaurant_id, 
        fi.name, 
        fi.price, 
        fi.is_available,
        fi.min_prep_time,
        fi.max_prep_time,
        fi.batch_quantity,
        c.is_active as category_active
      FROM food_items fi
      JOIN categories c ON fi.category_id = c.id
      WHERE fi.id = ? AND fi.restaurant_id = ?
    `);

    for (let i = 0; i < items.length; i++) {
      const entry = items[i];
      if (!entry || !entry.food_item_id || typeof entry.food_item_id !== 'string') {
        res.status(400).json({ error: `Invalid item format at item position ${i + 1}.` });
        return;
      }

      const qty = Number(entry.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        res.status(400).json({ error: `Invalid quantity for item. Quantity must be a whole number between 1 and 99.` });
        return;
      }

      const dbItem = itemStmt.get(entry.food_item_id, restaurantId) as any;
      if (!dbItem) {
        res.status(400).json({ error: 'One or more items in your cart do not belong to this restaurant or have been removed.' });
        return;
      }

      if (dbItem.is_available !== 1 || dbItem.category_active !== 1) {
        res.status(400).json({
          error: `"${dbItem.name}" is currently unavailable or out of stock. Please remove it from your cart to continue.`
        });
        return;
      }

      // Authoritative price directly from database
      const unitPrice = parseFloat(Number(dbItem.price).toFixed(2));
      const lineTotal = parseFloat((unitPrice * qty).toFixed(2));
      subtotal += lineTotal;

      validatedItems.push({
        food_item_id: dbItem.id,
        food_name: dbItem.name,
        unit_price: unitPrice,
        quantity: qty,
        line_total: lineTotal,
        min_prep_time: Number(dbItem.min_prep_time) || 15,
        max_prep_time: Number(dbItem.max_prep_time) || 25,
        batch_quantity: Number(dbItem.batch_quantity) || 4,
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const total = subtotal; // Part 5 does not introduce taxes, service fees, or payment gateways

    // Calculate order's estimated preparation time using batch quantity & simultaneous preparation
    let orderEstimatedMin = 0;
    let orderEstimatedMax = 0;

    for (const vItem of validatedItems) {
      const batchQty = Math.max(1, vItem.batch_quantity || 4);
      const batches = Math.ceil(vItem.quantity / batchQty);
      const itemMin = batches * (vItem.min_prep_time || 15);
      const itemMax = batches * (vItem.max_prep_time || 25);
      if (itemMin > orderEstimatedMin) orderEstimatedMin = itemMin;
      if (itemMax > orderEstimatedMax) orderEstimatedMax = itemMax;
    }

    if (orderEstimatedMin === 0) orderEstimatedMin = 15;
    if (orderEstimatedMax === 0) orderEstimatedMax = Math.max(orderEstimatedMin, 25);

    // 6. Generate IDs and timestamps
    const orderId = randomUUID();
    let orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    // Verify orderNumber uniqueness
    const checkOrderNum = db.prepare('SELECT id FROM orders WHERE order_number = ?');
    if (checkOrderNum.get(orderNumber)) {
      orderNumber = `${orderNumber}-${Math.floor(10 + Math.random() * 90)}`;
    }

    // 7. Atomic Transaction: Insert order and order items
    db.exec('BEGIN TRANSACTION;');

    try {
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          id,
          order_number,
          restaurant_id,
          table_id,
          table_number_snapshot,
          customer_name,
          customer_note,
          subtotal,
          total,
          status,
          estimated_prep_min,
          estimated_prep_max,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertOrder.run(
        orderId,
        orderNumber,
        restaurantId,
        tableId,
        table.table_number,
        sanitizedCustomerName,
        sanitizedCustomerNote,
        subtotal,
        total,
        'pending',
        orderEstimatedMin,
        orderEstimatedMax,
        now,
        now
      );

      const insertItem = db.prepare(`
        INSERT INTO order_items (
          id,
          order_id,
          food_item_id,
          food_name_snapshot,
          unit_price_snapshot,
          quantity,
          line_total,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vItem of validatedItems) {
        insertItem.run(
          randomUUID(),
          orderId,
          vItem.food_item_id,
          vItem.food_name,
          vItem.unit_price,
          vItem.quantity,
          vItem.line_total,
          now
        );
      }

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      console.error('Order creation transaction failed:', txErr);
      res.status(500).json({ error: 'Failed to create order. Please try again.' });
      return;
    }

    // Part 7: Update table operational status to 'occupied' if it was 'available'
    const tableUpdateStmt = db.prepare("UPDATE restaurant_tables SET operational_status = 'occupied', updated_at = ? WHERE id = ? AND operational_status = 'available'");
    const updateResult = tableUpdateStmt.run(now, tableId);
    if (updateResult.changes > 0) {
      broadcastTableStatusChanged(restaurantId, tableId, 'occupied', 'available');
    }

    // Part 7: Real-time broadcast for new order
    broadcastOrderCreated(restaurantId, {
      id: orderId,
      order_number: orderNumber,
      restaurant_id: restaurantId,
      restaurant_name: restaurant.name,
      table_id: tableId,
      table_number: table.table_number,
      table_number_snapshot: table.table_number,
      customer_name: sanitizedCustomerName,
      customer_note: sanitizedCustomerNote,
      subtotal,
      total,
      status: 'pending',
      estimated_prep_min: orderEstimatedMin,
      estimated_prep_max: orderEstimatedMax,
      created_at: now,
      items: validatedItems.map(vi => ({
        food_item_id: vi.food_item_id,
        food_name: vi.food_name,
        food_name_snapshot: vi.food_name,
        unit_price: vi.unit_price,
        quantity: vi.quantity,
        line_total: vi.line_total,
      })),
    });

    // 8. Return confirmation payload
    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: {
        id: orderId,
        order_number: orderNumber,
        restaurant_id: restaurantId,
        restaurant_name: restaurant.name,
        table_id: tableId,
        table_number: table.table_number,
        customer_name: sanitizedCustomerName,
        customer_note: sanitizedCustomerNote,
        subtotal: subtotal,
        total: total,
        status: 'pending',
        estimated_prep_min: orderEstimatedMin,
        estimated_prep_max: orderEstimatedMax,
        created_at: now,
        items: validatedItems.map(i => ({
          food_name: i.food_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_total: i.line_total,
        })),
      },
    });
  } catch (err) {
    console.error('Customer order placement error:', err);
    res.status(500).json({ error: 'An unexpected error occurred while placing your order.' });
  }
});

// 3. Customer Order Verification / Lookup (Scoped strictly to order + restaurant + table)
apiRouter.get('/public/orders/:orderId', (req, res: Response): void => {
  try {
    const { orderId } = req.params;
    const { restaurant_id, table_id } = req.query;

    if (!restaurant_id || !table_id) {
      res.status(403).json({ error: 'Access denied: Table and restaurant context required.' });
      return;
    }

    const restId = String(restaurant_id);
    const tblId = String(table_id);

    const orderStmt = db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.restaurant_id,
        o.table_id,
        o.table_number_snapshot,
        o.customer_name,
        o.customer_note,
        o.subtotal,
        o.total,
        o.status,
        o.estimated_prep_min,
        o.estimated_prep_max,
        o.created_at,
        r.name as restaurant_name
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.id = ? AND o.restaurant_id = ? AND o.table_id = ?
    `);

    const order = orderStmt.get(orderId, restId, tblId) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found or context does not match.' });
      return;
    }

    const itemsStmt = db.prepare(`
      SELECT 
        id,
        food_item_id,
        food_name_snapshot,
        unit_price_snapshot,
        quantity,
        line_total,
        created_at
      FROM order_items
      WHERE order_id = ?
      ORDER BY created_at ASC
    `);
    const items = itemsStmt.all(orderId);

    res.json({
      order: {
        ...order,
        items,
      },
    });
  } catch (err) {
    console.error('Order lookup error:', err);
    res.status(500).json({ error: 'Failed to retrieve order details.' });
  }
});

// 4. Retrieve active orders for a table (ensures customer timer continues when customer leaves & returns)
apiRouter.get('/public/r/:restaurantId/t/:tableId/orders/active', (req, res: Response): void => {
  try {
    const { restaurantId, tableId } = req.params;
    const stmt = db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.restaurant_id,
        o.table_id,
        o.table_number_snapshot,
        o.customer_name,
        o.customer_note,
        o.subtotal,
        o.total,
        o.status,
        o.estimated_prep_min,
        o.estimated_prep_max,
        o.created_at,
        r.name as restaurant_name
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.restaurant_id = ? AND o.table_id = ? AND o.status IN ('pending', 'accepted', 'preparing', 'ready')
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    const orders = stmt.all(restaurantId, tableId) as any[];
    const itemsStmt = db.prepare(`
      SELECT 
        id,
        food_item_id,
        food_name_snapshot,
        unit_price_snapshot,
        quantity,
        line_total,
        created_at
      FROM order_items
      WHERE order_id = ?
      ORDER BY created_at ASC
    `);
    const result = orders.map((ord) => ({
      ...ord,
      items: itemsStmt.all(ord.id),
    }));
    res.json({ orders: result });
  } catch (err) {
    console.error('Active table orders lookup error:', err);
    res.status(500).json({ error: 'Failed to retrieve active table orders.' });
  }
});

// ==========================================
// PART 6: RESTAURANT ORDER MANAGEMENT & KITCHEN DASHBOARD (PROTECTED)
// ==========================================

// Valid order statuses in the restaurant workflow
const VALID_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'served', 'cancelled', 'rejected'] as const;

// 1. Get all orders for the authenticated restaurant with filtering & search
apiRouter.get('/orders', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!['restaurant_owner', 'waiter', 'manager'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Permission denied. Only waiters and owners can view orders.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { status, table_id, search, limit = '100', offset = '0' } = req.query;

    // Base WHERE conditions
    const conditions: string[] = ['o.restaurant_id = ?'];
    const params: any[] = [restaurant.id];

    // Status filter
    if (status && typeof status === 'string' && status !== 'all') {
      const normalizedStatus = status.toLowerCase() === 'served' ? 'completed' : status.toLowerCase();
      if (normalizedStatus === 'active') {
        conditions.push("o.status IN ('pending', 'accepted', 'preparing', 'ready')");
      } else if (VALID_ORDER_STATUSES.includes(normalizedStatus as any)) {
        conditions.push('o.status = ?');
        params.push(normalizedStatus);
      }
    }

    // Table filter
    if (table_id && typeof table_id === 'string' && table_id.trim()) {
      conditions.push('o.table_id = ?');
      params.push(table_id.trim());
    }

    // Search query: order_number, customer_name, table_number_snapshot
    if (search && typeof search === 'string' && search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(o.order_number) LIKE ? OR 
        LOWER(o.customer_name) LIKE ? OR 
        LOWER(o.table_number_snapshot) LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.join(' AND ');
    const numLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const numOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

    // Query orders with table info joined
    const ordersQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.restaurant_id,
        o.table_id,
        o.table_number_snapshot,
        o.customer_name,
        o.customer_note,
        o.subtotal,
        o.total,
        o.status,
        o.estimated_prep_min,
        o.estimated_prep_max,
        o.created_at,
        o.updated_at,
        t.display_label as table_display_label,
        t.is_active as table_is_active
      FROM orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const ordersStmt = db.prepare(ordersQuery);
    const ordersList = ordersStmt.all(...params, numLimit, numOffset) as any[];

    // Fetch items for each order
    const itemsStmt = db.prepare(`
      SELECT 
        id,
        order_id,
        food_item_id,
        food_name_snapshot,
        food_name_snapshot as food_name,
        unit_price_snapshot,
        unit_price_snapshot as unit_price,
        quantity,
        line_total
      FROM order_items
      WHERE order_id = ?
      ORDER BY created_at ASC
    `);

    const hydratedOrders = ordersList.map(order => ({
      ...order,
      items: itemsStmt.all(order.id),
    }));

    // Calculate status counts for UI badge tabs
    const countsStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE restaurant_id = ? 
      GROUP BY status
    `);
    const countRows = countsStmt.all(restaurant.id) as { status: string; count: number }[];

    const statusCounts: Record<string, number> = {
      all: 0,
      pending: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      active: 0,
    };

    for (const row of countRows) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + row.count;
      statusCounts.all += row.count;
      if (['pending', 'accepted', 'preparing', 'ready'].includes(row.status)) {
        statusCounts.active += row.count;
      }
    }

    res.json({
      orders: hydratedOrders,
      statusCounts,
      totalCount: statusCounts.all,
      restaurantName: restaurant.name,
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to retrieve restaurant orders.' });
  }
});

// 2. Get order summary statistics for admin overview
apiRouter.get('/orders/stats/summary', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const countsStmt = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(total) as revenue
      FROM orders
      WHERE restaurant_id = ?
      GROUP BY status
    `);
    const countRows = countsStmt.all(restaurant.id) as { status: string; count: number; revenue: number }[];

    let totalOrders = 0;
    let totalRevenue = 0;
    const stats: Record<string, number> = {
      pending: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      active: 0,
    };

    for (const row of countRows) {
      stats[row.status] = row.count;
      totalOrders += row.count;
      if (row.status !== 'cancelled' && row.status !== 'rejected') {
        totalRevenue += (row.revenue || 0);
      }
      if (['pending', 'accepted', 'preparing', 'ready'].includes(row.status)) {
        stats.active += row.count;
      }
    }

    res.json({
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeOrders: stats.active,
      pendingOrders: stats.pending,
      acceptedOrders: stats.accepted,
      preparingOrders: stats.preparing,
      readyOrders: stats.ready,
      completedOrders: stats.completed,
      cancelledOrders: stats.cancelled,
      rejectedOrders: stats.rejected,
    });
  } catch (err) {
    console.error('Error fetching order stats:', err);
    res.status(500).json({ error: 'Failed to retrieve order statistics.' });
  }
});

// 3. Get single order details (Protected & Restaurant Isolated)
apiRouter.get('/orders/:orderId', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { orderId } = req.params;

    const orderStmt = db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.restaurant_id,
        o.table_id,
        o.table_number_snapshot,
        o.customer_name,
        o.customer_note,
        o.subtotal,
        o.total,
        o.status,
        o.created_at,
        o.updated_at,
        t.display_label as table_display_label,
        t.is_active as table_is_active
      FROM orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE o.id = ? AND o.restaurant_id = ?
    `);

    const order = orderStmt.get(orderId, restaurant.id) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found in your restaurant.' });
      return;
    }

    const itemsStmt = db.prepare(`
      SELECT 
        id,
        order_id,
        food_item_id,
        food_name_snapshot,
        food_name_snapshot as food_name,
        unit_price_snapshot,
        unit_price_snapshot as unit_price,
        quantity,
        line_total,
        created_at
      FROM order_items
      WHERE order_id = ?
      ORDER BY created_at ASC
    `);
    const items = itemsStmt.all(order.id);

    res.json({
      order: {
        ...order,
        restaurant_name: restaurant.name,
        items,
      },
    });
  } catch (err) {
    console.error('Error fetching single order:', err);
    res.status(500).json({ error: 'Failed to retrieve order.' });
  }
});

// 4. Update order status (Status progression workflow: pending -> preparing -> ready -> completed / cancelled)
apiRouter.patch('/orders/:orderId/status', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
      res.status(400).json({ error: 'Status is required.' });
      return;
    }

    let targetStatus = status.trim().toLowerCase();
    if (targetStatus === 'served') {
      targetStatus = 'completed';
    }

    if (!VALID_ORDER_STATUSES.includes(targetStatus as any)) {
      res.status(400).json({
        error: `Invalid status "${status}". Allowed values: pending, preparing, ready, completed, cancelled.`,
      });
      return;
    }

    // Check order existence and ownership
    const checkStmt = db.prepare('SELECT id, status, table_id FROM orders WHERE id = ? AND restaurant_id = ?');
    const existingOrder = checkStmt.get(orderId, restaurant.id) as { id: string; status: string; table_id: string } | undefined;

    if (!existingOrder) {
      res.status(404).json({ error: 'Order not found in your restaurant.' });
      return;
    }

    const userRole = req.user!.role;

    // Role-specific operational boundary enforcement
    if (userRole === 'kitchen_staff') {
      if (!['preparing', 'ready'].includes(targetStatus)) {
        res.status(403).json({
          error: 'Kitchen staff can only advance orders to "preparing" or "ready". Waiters or owners manage order acceptance and completion.',
        });
        return;
      }
    } else if (userRole === 'waiter') {
      if (!['accepted', 'rejected', 'completed', 'cancelled'].includes(targetStatus)) {
        res.status(403).json({
          error: 'Waiters can accept, reject, cancel, or complete orders.',
        });
        return;
      }
      if (targetStatus === 'completed' && existingOrder.status !== 'ready') {
        res.status(400).json({
          error: 'Waiters can only complete orders that have already been marked "ready" by the kitchen.',
        });
        return;
      }
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE orders 
      SET status = ?, updated_at = ?, updated_by_id = ?, updated_by_name = ?
      WHERE id = ? AND restaurant_id = ?
    `);
    updateStmt.run(targetStatus, now, req.user!.id, req.user!.name, orderId, restaurant.id);

    // Fetch refreshed order
    const getOrderStmt = db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.restaurant_id,
        o.table_id,
        o.table_number_snapshot,
        o.customer_name,
        o.customer_note,
        o.subtotal,
        o.total,
        o.status,
        o.updated_by_id,
        o.updated_by_name,
        o.created_at,
        o.updated_at,
        t.display_label as table_display_label
      FROM orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE o.id = ? AND o.restaurant_id = ?
    `);
    const updatedOrder = getOrderStmt.get(orderId, restaurant.id) as any;

    const itemsStmt = db.prepare(`
      SELECT 
        id,
        order_id,
        food_item_id,
        food_name_snapshot,
        food_name_snapshot as food_name,
        unit_price_snapshot,
        unit_price_snapshot as unit_price,
        quantity,
        line_total
      FROM order_items
      WHERE order_id = ?
      ORDER BY created_at ASC
    `);
    updatedOrder.items = itemsStmt.all(orderId);

    // Broadcast real-time order status change
    broadcastOrderStatusChanged(
      restaurant.id,
      updatedOrder,
      existingOrder.status,
      targetStatus,
      req.user!.name
    );

    // If order was completed, check if table now needs clearing
    if (targetStatus === 'completed') {
      const activeOrdersStmt = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE table_id = ? AND status IN ('pending', 'accepted', 'preparing', 'ready')
      `);
      const activeOrdersCount = (activeOrdersStmt.get(updatedOrder.table_id) as any).count;
      if (activeOrdersCount === 0) {
        db.prepare("UPDATE restaurant_tables SET operational_status = 'needs_clearing', updated_at = ? WHERE id = ?")
          .run(now, updatedOrder.table_id);
        broadcastTableStatusChanged(restaurant.id, updatedOrder.table_id, 'needs_clearing', 'occupied');
      }
    } else if (targetStatus === 'cancelled' || targetStatus === 'rejected') {
      // If order was rejected or cancelled, check if table has any remaining active orders
      const activeOrdersStmt = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE table_id = ? AND status IN ('pending', 'accepted', 'preparing', 'ready')
      `);
      const activeOrdersCount = (activeOrdersStmt.get(updatedOrder.table_id) as any).count;
      if (activeOrdersCount === 0) {
        db.prepare("UPDATE restaurant_tables SET operational_status = 'available', updated_at = ? WHERE id = ?")
          .run(now, updatedOrder.table_id);
        broadcastTableStatusChanged(restaurant.id, updatedOrder.table_id, 'available', 'occupied');
      }
    }

    res.json({
      message: `Order #${updatedOrder.order_number} status updated to ${targetStatus}.`,
      order: updatedOrder,
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// 5. Dedicated Kitchen Display System (KDS) Active Queue Endpoint
// Returns orders needing preparation that have been ACCEPTED: accepted, preparing, ready
// (Orders only show on kitchen display if accepted by staff)
// Sorted by created_at ASC (Oldest first for kitchen FIFO handling)
apiRouter.get('/kitchen/orders', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!['restaurant_owner', 'kitchen_staff', 'manager', 'waiter'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Permission denied. Kitchen access required.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant profile not found.' });
      return;
    }

    const { status } = req.query;

    let statusCondition = "o.status IN ('accepted', 'preparing', 'ready')";
    const params: any[] = [restaurant.id];

    if (status && typeof status === 'string' && status !== 'all') {
      const normalized = status.trim().toLowerCase();
      if (['accepted', 'preparing', 'ready'].includes(normalized)) {
        statusCondition = 'o.status = ?';
        params.push(normalized);
      }
    }

    const kdsStmt = db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.restaurant_id,
        o.table_id,
        o.table_number_snapshot,
        o.customer_name,
        o.customer_note,
        o.subtotal,
        o.total,
        o.status,
        o.estimated_prep_min,
        o.estimated_prep_max,
        o.updated_by_id,
        o.updated_by_name,
        o.created_at,
        o.updated_at,
        t.display_label as table_display_label
      FROM orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE o.restaurant_id = ? AND ${statusCondition}
      ORDER BY o.created_at ASC
    `);

    const orders = kdsStmt.all(...params) as any[];

    // Fetch items for each kitchen order
    const itemsStmt = db.prepare(`
      SELECT 
        id,
        order_id,
        food_item_id,
        food_name_snapshot,
        food_name_snapshot as food_name,
        unit_price_snapshot,
        unit_price_snapshot as unit_price,
        quantity,
        line_total
      FROM order_items
      WHERE order_id = ?
      ORDER BY created_at ASC
    `);

    const hydratedOrders = orders.map(order => ({
      ...order,
      items: itemsStmt.all(order.id),
    }));

    // Aggregate counts for kitchen stations
    const countsStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE restaurant_id = ? AND status IN ('accepted', 'preparing', 'ready')
      GROUP BY status
    `);
    const countRows = countsStmt.all(restaurant.id) as { status: string; count: number }[];

    let acceptedCount = 0;
    let preparingCount = 0;
    let readyCount = 0;

    for (const row of countRows) {
      if (row.status === 'accepted') acceptedCount = row.count;
      if (row.status === 'preparing') preparingCount = row.count;
      if (row.status === 'ready') readyCount = row.count;
    }

    res.json({
      orders: hydratedOrders,
      acceptedCount,
      pendingCount: acceptedCount, // preserved for backward-compatibility
      preparingCount,
      readyCount,
      totalActive: acceptedCount + preparingCount + readyCount,
      restaurantName: restaurant.name,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching kitchen orders:', err);
    res.status(500).json({ error: 'Failed to retrieve kitchen orders.' });
  }
});

// ==========================================
// PART 7: TABLE OPERATIONAL STATUS WORKFLOW
// ==========================================

// Update table operational status (available, occupied, needs_service, needs_clearing)
apiRouter.patch('/tables/:id/operational-status', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!['restaurant_owner', 'waiter', 'manager'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Permission denied. Only waiters and owners can update table operational status.' });
      return;
    }

    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { id } = req.params;
    const { operational_status } = req.body;

    const allowed = ['available', 'occupied', 'needs_service', 'needs_clearing'];
    if (!operational_status || !allowed.includes(operational_status)) {
      res.status(400).json({ error: `Invalid operational status. Allowed values: ${allowed.join(', ')}` });
      return;
    }

    const tableStmt = db.prepare('SELECT id, table_number, operational_status FROM restaurant_tables WHERE id = ? AND restaurant_id = ?');
    const table = tableStmt.get(id, restaurant.id) as any;
    if (!table) {
      res.status(404).json({ error: 'Table not found in your restaurant.' });
      return;
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE restaurant_tables SET operational_status = ?, updated_at = ? WHERE id = ?');
    updateStmt.run(operational_status, now, id);

    broadcastTableStatusChanged(restaurant.id, id, operational_status, table.operational_status);

    res.json({
      message: `Table ${table.table_number} status set to ${operational_status}.`,
      table: { ...table, operational_status, updated_at: now },
    });
  } catch (err) {
    console.error('Error updating table operational status:', err);
    res.status(500).json({ error: 'Failed to update table operational status.' });
  }
});

// ==========================================
// PART 7: STAFF MANAGEMENT (OWNER ONLY)
// ==========================================

// 1. Get all staff members for current restaurant
apiRouter.get('/staff', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can view staff members.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const stmt = db.prepare(`
      SELECT id, name, email, role, status, restaurant_id, created_at, updated_at
      FROM users
      WHERE restaurant_id = ? AND role != 'restaurant_owner'
      ORDER BY created_at DESC
    `);
    const staff = stmt.all(restaurant.id);
    res.json({ staff });
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ error: 'Failed to retrieve staff members.' });
  }
});

// 2. Create a new staff account (Waiter or Kitchen Staff)
apiRouter.post('/staff', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can create staff.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { name, email, password, role } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Staff member name must be at least 2 characters.' });
      return;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const allowedRoles = ['waiter', 'kitchen_staff'];
    if (!role || !allowedRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role. Supported roles: waiter, kitchen_staff.' });
      return;
    }

    // Check unique email across system
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const newId = randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, restaurant_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `);
    insertStmt.run(newId, name.trim(), normalizedEmail, passwordHash, role, restaurant.id, now, now);

    const createdStaff = {
      id: newId,
      name: name.trim(),
      email: normalizedEmail,
      role,
      status: 'active',
      restaurant_id: restaurant.id,
      created_at: now,
      updated_at: now,
    };

    broadcastStaffUpdated(restaurant.id, newId, 'created');

    res.status(201).json({
      message: `Staff member ${name.trim()} (${role === 'waiter' ? 'Waiter' : 'Kitchen Staff'}) created successfully.`,
      staff: createdStaff,
    });
  } catch (err) {
    console.error('Error creating staff member:', err);
    res.status(500).json({ error: 'Failed to create staff member.' });
  }
});

// 3. Update staff status (Activate / Deactivate)
apiRouter.patch('/staff/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can update staff status.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (id === req.user!.id) {
      res.status(400).json({ error: 'You cannot deactivate your own owner account.' });
      return;
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      res.status(400).json({ error: 'Status must be "active" or "inactive".' });
      return;
    }

    // Verify staff belongs to this restaurant
    const staffStmt = db.prepare('SELECT id, name, role, status FROM users WHERE id = ? AND restaurant_id = ?');
    const existing = staffStmt.get(id, restaurant.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found in your restaurant.' });
      return;
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?');
    updateStmt.run(status, now, id);

    if (status === 'inactive') {
      disconnectStaffUser(id);
    }

    broadcastStaffUpdated(restaurant.id, id, status === 'active' ? 'activated' : 'deactivated');

    res.json({
      message: `Staff member ${existing.name} is now ${status}.`,
      staff: { ...existing, status, updated_at: now },
    });
  } catch (err) {
    console.error('Error updating staff status:', err);
    res.status(500).json({ error: 'Failed to update staff status.' });
  }
});

// 4. Update staff role (Waiter <-> Kitchen Staff)
apiRouter.patch('/staff/:id/role', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can change staff roles.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user!.id) {
      res.status(400).json({ error: 'You cannot change your own role.' });
      return;
    }

    const allowedRoles = ['waiter', 'kitchen_staff'];
    if (!role || !allowedRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role. Supported roles: waiter, kitchen_staff.' });
      return;
    }

    const staffStmt = db.prepare('SELECT id, name, role, status FROM users WHERE id = ? AND restaurant_id = ?');
    const existing = staffStmt.get(id, restaurant.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found in your restaurant.' });
      return;
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?');
    updateStmt.run(role, now, id);

    disconnectStaffUser(id);
    broadcastStaffUpdated(restaurant.id, id, 'role_updated');

    res.json({
      message: `Role for ${existing.name} updated to ${role === 'waiter' ? 'Waiter' : 'Kitchen Staff'}.`,
      staff: { ...existing, role, updated_at: now },
    });
  } catch (err) {
    console.error('Error changing staff role:', err);
    res.status(500).json({ error: 'Failed to change staff role.' });
  }
});

// 5. Reset staff password
apiRouter.patch('/staff/:id/password', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can reset staff passwords.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { id } = req.params;
    const password = req.body.password || req.body.new_password;

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const staffStmt = db.prepare('SELECT id, name FROM users WHERE id = ? AND restaurant_id = ?');
    const existing = staffStmt.get(id, restaurant.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found in your restaurant.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
    updateStmt.run(passwordHash, now, id);

    disconnectStaffUser(id);

    res.json({ message: `Password reset successfully for ${existing.name}.` });
  } catch (err) {
    console.error('Error resetting staff password:', err);
    res.status(500).json({ error: 'Failed to reset staff password.' });
  }
});

// 6. Delete staff account
apiRouter.delete('/staff/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.user!.role !== 'restaurant_owner') {
      res.status(403).json({ error: 'Permission denied. Only restaurant owners can remove staff.' });
      return;
    }
    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { id } = req.params;
    if (id === req.user!.id) {
      res.status(400).json({ error: 'You cannot delete your own owner account.' });
      return;
    }

    const staffStmt = db.prepare('SELECT id, name FROM users WHERE id = ? AND restaurant_id = ?');
    const existing = staffStmt.get(id, restaurant.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found in your restaurant.' });
      return;
    }

    disconnectStaffUser(id);
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    deleteStmt.run(id);

    broadcastStaffUpdated(restaurant.id, id, 'deleted');

    res.json({ message: `Staff account for ${existing.name} has been removed.` });
  } catch (err) {
    console.error('Error deleting staff member:', err);
    res.status(500).json({ error: 'Failed to delete staff member.' });
  }
});

// ==========================================
// PART 7: SERVICE REQUESTS & WAITER ASSISTANCE
// ==========================================

const VALID_SERVICE_REQUEST_TYPES = ['call_waiter', 'water', 'bill', 'cutlery', 'assistance'] as const;

// 1. Customer: Create service request from table
apiRouter.post('/public/r/:restaurantId/t/:tableId/service-requests', (req, res: Response): void => {
  try {
    const { restaurantId, tableId } = req.params;
    const { request_type, message } = req.body;

    // Verify restaurant
    const rest = db.prepare('SELECT id, name FROM restaurants WHERE id = ?').get(restaurantId) as any;
    if (!rest) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    // Verify table
    const table = db.prepare('SELECT id, table_number, is_active, operational_status FROM restaurant_tables WHERE id = ? AND restaurant_id = ?')
      .get(tableId, restaurantId) as any;
    if (!table) {
      res.status(404).json({ error: 'Table not found or does not belong to this restaurant.' });
      return;
    }

    if (table.is_active !== 1) {
      res.status(400).json({ error: 'This table is currently inactive. Service requests cannot be placed.' });
      return;
    }

    const normalizedType = typeof request_type === 'string' ? request_type.trim().toLowerCase() : 'call_waiter';
    if (!VALID_SERVICE_REQUEST_TYPES.includes(normalizedType as any)) {
      res.status(400).json({
        error: `Invalid request type "${request_type}". Allowed values: ${VALID_SERVICE_REQUEST_TYPES.join(', ')}`,
      });
      return;
    }

    // Prevent duplicate spam: If identical request is already pending or acknowledged created within last 3 minutes
    const duplicateStmt = db.prepare(`
      SELECT id, request_type, status, created_at, message
      FROM service_requests
      WHERE table_id = ? AND request_type = ? AND status IN ('pending', 'acknowledged')
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const existing = duplicateStmt.get(tableId, normalizedType) as any;

    if (existing) {
      res.status(200).json({
        success: true,
        alreadyActive: true,
        message: 'Your service request has already been sent to our staff and is being attended to.',
        request: existing,
      });
      return;
    }

    const requestId = randomUUID();
    const now = new Date().toISOString();
    const sanitizedMsg = typeof message === 'string' ? message.trim().slice(0, 300) : '';

    const insertStmt = db.prepare(`
      INSERT INTO service_requests (
        id, restaurant_id, table_id, table_number_snapshot, request_type, status, message, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    insertStmt.run(requestId, restaurantId, tableId, table.table_number, normalizedType, sanitizedMsg, now);

    // Update table operational state to 'needs_service'
    if (table.operational_status !== 'needs_service') {
      db.prepare('UPDATE restaurant_tables SET operational_status = ?, updated_at = ? WHERE id = ?')
        .run('needs_service', now, tableId);
      broadcastTableStatusChanged(restaurantId, tableId, 'needs_service', table.operational_status);
    }

    const createdRequest = {
      id: requestId,
      restaurant_id: restaurantId,
      table_id: tableId,
      table_number_snapshot: table.table_number,
      request_type: normalizedType,
      status: 'pending',
      message: sanitizedMsg,
      created_at: now,
    };

    broadcastServiceRequestCreated(restaurantId, createdRequest);

    res.status(201).json({
      success: true,
      message: 'Staff notified! A waiter will assist you shortly.',
      request: createdRequest,
    });
  } catch (err) {
    console.error('Error creating service request:', err);
    res.status(500).json({ error: 'Failed to create service request.' });
  }
});

// 2. Customer: Get active requests for table
apiRouter.get('/public/r/:restaurantId/t/:tableId/service-requests/active', (req, res: Response): void => {
  try {
    const { restaurantId, tableId } = req.params;

    const stmt = db.prepare(`
      SELECT id, request_type, status, message, created_at, acknowledged_at, acknowledged_by_name
      FROM service_requests
      WHERE restaurant_id = ? AND table_id = ? AND status IN ('pending', 'acknowledged')
      ORDER BY created_at ASC
    `);
    const requests = stmt.all(restaurantId, tableId);

    res.json({ requests });
  } catch (err) {
    console.error('Error fetching table service requests:', err);
    res.status(500).json({ error: 'Failed to check active requests.' });
  }
});

// 3. Staff: Get service requests (Owner & Waiter)
apiRouter.get('/service-requests', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!['restaurant_owner', 'waiter', 'manager'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Permission denied. Only waiters and owners can view service requests.' });
      return;
    }

    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { status, table_id } = req.query;

    let query = `
      SELECT 
        sr.id,
        sr.restaurant_id,
        sr.table_id,
        sr.table_number_snapshot,
        sr.request_type,
        sr.status,
        sr.message,
        sr.created_at,
        sr.acknowledged_at,
        sr.resolved_at,
        sr.acknowledged_by_name,
        sr.resolved_by_name,
        t.display_label as table_display_label,
        t.operational_status as table_operational_status
      FROM service_requests sr
      LEFT JOIN restaurant_tables t ON sr.table_id = t.id
      WHERE sr.restaurant_id = ?
    `;
    const params: any[] = [restaurant.id];

    if (status && status !== 'all') {
      if (status === 'active') {
        query += " AND sr.status IN ('pending', 'acknowledged')";
      } else {
        query += ' AND sr.status = ?';
        params.push(status);
      }
    }

    if (table_id) {
      query += ' AND sr.table_id = ?';
      params.push(table_id);
    }

    query += ' ORDER BY sr.created_at DESC LIMIT 100';

    const stmt = db.prepare(query);
    const requests = stmt.all(...params) as any[];

    // Calculate active counts
    const countStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM service_requests 
      WHERE restaurant_id = ? AND status IN ('pending', 'acknowledged')
      GROUP BY status
    `);
    const countRows = countStmt.all(restaurant.id) as { status: string; count: number }[];

    let pendingCount = 0;
    let acknowledgedCount = 0;
    for (const r of countRows) {
      if (r.status === 'pending') pendingCount = r.count;
      if (r.status === 'acknowledged') acknowledgedCount = r.count;
    }

    res.json({
      requests,
      pendingCount,
      acknowledgedCount,
      totalActive: pendingCount + acknowledgedCount,
    });
  } catch (err) {
    console.error('Error fetching service requests:', err);
    res.status(500).json({ error: 'Failed to retrieve service requests.' });
  }
});

// 4. Staff: Acknowledge service request
apiRouter.patch('/service-requests/:id/acknowledge', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!['restaurant_owner', 'waiter', 'manager'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Permission denied. Only waiters and owners can acknowledge requests.' });
      return;
    }

    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { id } = req.params;
    const reqStmt = db.prepare('SELECT * FROM service_requests WHERE id = ? AND restaurant_id = ?');
    const existing = reqStmt.get(id, restaurant.id) as any;

    if (!existing) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }

    if (existing.status === 'resolved') {
      res.status(400).json({ error: 'Cannot acknowledge a request that has already been resolved.' });
      return;
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE service_requests 
      SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by_id = ?, acknowledged_by_name = ?
      WHERE id = ?
    `);
    updateStmt.run(now, req.user!.id, req.user!.name, id);

    const updated = {
      ...existing,
      status: 'acknowledged',
      acknowledged_at: now,
      acknowledged_by_id: req.user!.id,
      acknowledged_by_name: req.user!.name,
    };

    broadcastServiceRequestUpdated(restaurant.id, updated);

    res.json({
      message: `Request from Table ${existing.table_number_snapshot} acknowledged.`,
      request: updated,
    });
  } catch (err) {
    console.error('Error acknowledging service request:', err);
    res.status(500).json({ error: 'Failed to acknowledge request.' });
  }
});

// 5. Staff: Resolve service request
apiRouter.patch('/service-requests/:id/resolve', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!['restaurant_owner', 'waiter', 'manager'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Permission denied. Only waiters and owners can resolve requests.' });
      return;
    }

    const restaurant = getUserRestaurant(req.user!);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const { id } = req.params;
    const reqStmt = db.prepare('SELECT * FROM service_requests WHERE id = ? AND restaurant_id = ?');
    const existing = reqStmt.get(id, restaurant.id) as any;

    if (!existing) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE service_requests 
      SET status = 'resolved', resolved_at = ?, resolved_by_id = ?, resolved_by_name = ?
      WHERE id = ?
    `);
    updateStmt.run(now, req.user!.id, req.user!.name, id);

    // Check remaining pending/acknowledged requests for this table
    const remainingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM service_requests 
      WHERE table_id = ? AND id != ? AND status IN ('pending', 'acknowledged')
    `);
    const remaining = (remainingStmt.get(existing.table_id, id) as any).count;

    if (remaining === 0) {
      // Revert table operational_status if it was 'needs_service'
      const activeOrdersStmt = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE table_id = ? AND status IN ('pending', 'preparing', 'ready')
      `);
      const activeOrdersCount = (activeOrdersStmt.get(existing.table_id) as any).count;
      const newStatus = activeOrdersCount > 0 ? 'occupied' : 'available';

      db.prepare('UPDATE restaurant_tables SET operational_status = ?, updated_at = ? WHERE id = ? AND operational_status = ?')
        .run(newStatus, now, existing.table_id, 'needs_service');

      broadcastTableStatusChanged(restaurant.id, existing.table_id, newStatus, 'needs_service');
    }

    const updated = {
      ...existing,
      status: 'resolved',
      resolved_at: now,
      resolved_by_id: req.user!.id,
      resolved_by_name: req.user!.name,
    };

    broadcastServiceRequestUpdated(restaurant.id, updated);

    res.json({
      message: `Request from Table ${existing.table_number_snapshot} resolved.`,
      request: updated,
    });
  } catch (err) {
    console.error('Error resolving service request:', err);
    res.status(500).json({ error: 'Failed to resolve request.' });
  }
});




