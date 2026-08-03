import pool from "../config/db.js";

export const getCategoryByGroup = async (
  categoryGroup: string,
): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT category_id, category_value, is_active
     FROM category
     WHERE category_group = ?
     ORDER BY category_value ASC`,
    [categoryGroup],
  );
  return rows as any[];
};

export const getCategoryByGroupAndValue = async (
  categoryGroup: string,
  categoryValue: string,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT category_id, category_group, category_value, is_active
     FROM category
     WHERE category_group = ? AND category_value = ?`,
    [categoryGroup, categoryValue],
  );
  return rows[0] || null;
};

export const getCategoryById = async (
  categoryId: number,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT category_id, category_group, category_value, is_active
     FROM category
     WHERE category_id = ?`,
    [categoryId],
  );
  return rows[0] || null;
};

export const getAllCategories = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT category_id, category_group, category_value, is_active
     FROM category
     ORDER BY category_group ASC, category_value ASC`,
  );
  return rows as any[];
};

export const getCategoriesByGroups = async (
  categoryGroups: string[],
): Promise<any[]> => {
  const placeholders = categoryGroups.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT category_id, category_group, category_value, is_active
     FROM category
     WHERE category_group IN (${placeholders})
     ORDER BY category_group ASC, category_value ASC`,
    categoryGroups,
  );
  return rows as any[];
};

export const createCategory = async (
  categoryGroup: string,
  categoryValue: string,
): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO category (category_group, category_value, is_active) VALUES (?, ?, TRUE)`,
    [categoryGroup, categoryValue],
  );
  return result.insertId;
};

export const updateCategoryStatus = async (
  categoryId: number,
  isActive: boolean,
): Promise<void> => {
  await pool.query(`UPDATE category SET is_active = ? WHERE category_id = ?`, [
    isActive,
    categoryId,
  ]);
};
