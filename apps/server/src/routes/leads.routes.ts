import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { leads } from "../db/schema.js";
import { eq, and, desc, or, ilike, count } from "drizzle-orm";
import { type AuthRequest, requireAuth, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { parseCsv } from "../services/csv-parser.service.js";
import { createLeadSchema, paginationSchema } from "@callo/shared";

const router = Router();

// All routes require auth and business
router.use(requireAuth);
router.use(requireBusiness);

// ── GET / ─ List leads (paginated, searchable, filterable) ──
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const { page, limit } = paginationSchema.parse(req.query);
    const { search, status, source } = req.query;

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(leads.businessId, businessId)];

    if (status && typeof status === "string") {
      conditions.push(eq(leads.status, status));
    }
    if (source && typeof source === "string") {
      conditions.push(eq(leads.source, source));
    }
    if (search && typeof search === "string") {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(leads.firstName, searchPattern),
          ilike(leads.lastName, searchPattern),
          ilike(leads.email, searchPattern),
          ilike(leads.phone, searchPattern),
          ilike(leads.company, searchPattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(leads)
      .where(whereClause);

    // Get paginated results
    const results = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error listing leads");
    throw error;
  }
});

// ── GET /:id ─ Get lead ──
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.businessId, businessId)))
      .limit(1);

    if (!lead) {
      throw new AppError(404, "Lead not found");
    }

    res.json({ data: lead });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting lead");
    throw error;
  }
});

// ── POST / ─ Create lead ──
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = createLeadSchema.parse(req.body);

    const [lead] = await db
      .insert(leads)
      .values({
        businessId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phone: body.phone,
        company: body.company,
        title: body.title,
        source: body.source,
        notes: body.notes,
        customFields: body.customFields ?? {},
      })
      .returning();

    logger.info({ leadId: lead.id, businessId }, "Lead created");
    res.status(201).json({ data: lead });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error creating lead");
    throw error;
  }
});

// ── PUT /:id ─ Update lead ──
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;
    const body = createLeadSchema.partial().parse(req.body);

    // Verify lead belongs to business
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Lead not found");
    }

    const [updated] = await db
      .update(leads)
      .set({
        ...body,
        email: body.email || undefined,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    logger.info({ leadId: id, businessId }, "Lead updated");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error updating lead");
    throw error;
  }
});

// ── DELETE /:id ─ Delete lead ──
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    // Verify lead belongs to business
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Lead not found");
    }

    await db.delete(leads).where(eq(leads.id, id));

    logger.info({ leadId: id, businessId }, "Lead deleted");
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error deleting lead");
    throw error;
  }
});

// ── POST /import ─ Bulk import leads from CSV ──
router.post("/import", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const { csvData, columnMapping, skipFirstRow } = req.body as {
      csvData: string;
      columnMapping: Record<string, string>;
      skipFirstRow: boolean;
    };

    if (!csvData || typeof csvData !== "string") {
      throw new AppError(400, "csvData is required and must be a string");
    }
    if (!columnMapping || typeof columnMapping !== "object") {
      throw new AppError(400, "columnMapping is required and must be an object");
    }

    // Parse the CSV.
    // parseCsv always treats the first row as headers and returns the rest
    // in `rows`. When skipFirstRow is true (the first row IS a header),
    // we use `rows` as-is. When false, we re-include the headers row as data.
    const parsed = parseCsv(csvData);
    const dataRows = skipFirstRow
      ? parsed.rows
      : [parsed.headers, ...parsed.rows];

    const validLeadFields = new Set([
      "firstName",
      "lastName",
      "phone",
      "email",
      "company",
      "title",
      "notes",
    ]);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const leadsToInsert: {
      businessId: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string;
      company: string | null;
      title: string | null;
      source: string;
      notes: string | null;
      customFields: Record<string, unknown>;
    }[] = [];

    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const row = dataRows[rowIdx];
      const record: Record<string, string> = {};

      // Map columns using the provided mapping
      for (const [colIndex, fieldName] of Object.entries(columnMapping)) {
        if (fieldName === "skip" || !validLeadFields.has(fieldName)) continue;
        const idx = parseInt(colIndex, 10);
        if (!isNaN(idx) && idx < row.length) {
          record[fieldName] = row[idx];
        }
      }

      // Validate: phone is required
      if (!record.phone || record.phone.trim() === "") {
        skipped++;
        errors.push(`Row ${rowIdx + 1}: missing phone number`);
        continue;
      }

      leadsToInsert.push({
        businessId,
        firstName: record.firstName?.trim() || null,
        lastName: record.lastName?.trim() || null,
        email: record.email?.trim() || null,
        phone: record.phone.trim(),
        company: record.company?.trim() || null,
        title: record.title?.trim() || null,
        source: "csv_import",
        notes: record.notes?.trim() || null,
        customFields: {},
      });
    }

    // Bulk insert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(leads).values(batch);
        imported += batch.length;
      } catch (err) {
        skipped += batch.length;
        const message = err instanceof Error ? err.message : "Insert failed";
        errors.push(`Batch starting at row ${i + 1}: ${message}`);
      }
    }

    logger.info(
      { businessId, imported, skipped, errorCount: errors.length },
      "Lead CSV import completed",
    );

    res.json({ data: { imported, skipped, errors } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error importing leads");
    throw error;
  }
});

export default router;
