import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/query.js';
import { audit } from '../lib/audit.js';
import { pagedResponse, pagination } from '../lib/pagination.js';
import { validateId } from '../middleware/auth.js';

export const incidentsRouter = Router();

const optStr = z.string().trim().max(255).optional().nullable();

const incidentSchema = z.object({
  // Step 1 — Basic Info
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)'),
  incidentTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (expected HH:MM)'),
  status: z.enum(['Pending Review', 'Active', 'Closed']).default('Pending Review'),
  approvalStatus: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
  subSite: optStr,
  zone: optStr,
  severityLevel: z.string().trim().max(50).optional().nullable(),
  primaryCategory: z.string().trim().max(100).optional().nullable(),
  additionalCategories: z.array(z.string().trim().max(100)).optional().nullable(),
  isConfidential: z.boolean().optional().nullable(),
  narrative: z.string().trim().min(1, 'Narrative is required'),
  // Step 2 — Address / Location
  roomStreet: optStr,
  building: optStr,
  floor: optStr,
  department: optStr,
  areaType: optStr,
  areaSecured: z.boolean().optional().nullable(),
  shiftSupervisor: optStr,
  officerAtLocation: z.boolean().optional().nullable(),
  officerPost: optStr,
  reportingPhone: optStr,
});

function buildIncidentFilters(req) {
  const params = [];
  const filters = [];
  if (req.query.fromDate) {
    params.push(req.query.fromDate);
    filters.push(`incident_date >= $${params.length}`);
  }
  if (req.query.toDate) {
    params.push(req.query.toDate);
    filters.push(`incident_date <= $${params.length}`);
  }
  if (req.query.category) {
    params.push(req.query.category);
    filters.push(`primary_category = $${params.length}`);
  }
  if (req.query.severity) {
    params.push(req.query.severity);
    filters.push(`severity_level = $${params.length}`);
  }
  if (req.query.status) {
    params.push(req.query.status);
    filters.push(`(status = $${params.length} or approval_status = $${params.length})`);
  }
  if (req.query.subSite) {
    params.push(req.query.subSite);
    filters.push(`sub_site = $${params.length}`);
  }
  if (req.query.keyword) {
    params.push(`%${String(req.query.keyword).toLowerCase()}%`);
    filters.push(`(lower(incident_number) like $${params.length} or lower(coalesce(location, '')) like $${params.length})`);
  }
  if (req.query.narrative) {
    params.push(`%${String(req.query.narrative).toLowerCase()}%`);
    filters.push(`lower(narrative) like $${params.length}`);
  }
  return { params, where: filters.length ? `where ${filters.join(' and ')}` : '' };
}

incidentsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = pagination(req);
    const { params, where } = buildIncidentFilters(req);
    const count = await query(`select count(*)::int as total from incidents ${where}`, params);
    params.push(limit, offset);
    const result = await query(
      `select i.*, u.email as officer_email
       from incidents i
       left join users u on u.id = i.reporting_officer_id
       ${where}
       order by i.incident_date desc nulls last, i.incident_time desc nulls last, i.created_at desc
       limit $${params.length - 1} offset $${params.length}`,
      params,
    );
    res.json(pagedResponse(result.rows, count.rows[0].total, page, limit));
  } catch (error) {
    next(error);
  }
});

incidentsRouter.get('/:id', validateId, async (req, res, next) => {
  try {
    const result = await query(
      `select i.*, u.email as officer_email
       from incidents i
       left join users u on u.id = i.reporting_officer_id
       where i.incident_id = $1`,
      [req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    res.json({ incident: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

incidentsRouter.post('/', async (req, res, next) => {
  try {
    const input = incidentSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      const sequence = await client.query(
        `select count(*)::int + 1 as n
         from incidents
         where incident_date = $1`,
        [input.incidentDate],
      );
      const compactDate = input.incidentDate.replaceAll('-', '');
      const incidentNumber = `${compactDate}-${String(sequence.rows[0].n).padStart(3, '0')}`;

      const inserted = await client.query(
        `insert into incidents (
           incident_number, reporting_officer_id, status, approval_status, created_at,
           sub_site, zone, severity_level, narrative, primary_category, additional_categories,
           is_confidential, incident_date, incident_time,
           room_street, building, floor, department, area_type, area_secured,
           shift_supervisor, officer_at_location, officer_post, reporting_phone
         )
         values ($1,$2,$3,$4,now(),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         returning *`,
        [
          incidentNumber,
          req.user.sub,
          input.status,
          input.approvalStatus,
          input.subSite || null,
          input.zone || null,
          input.severityLevel || null,
          input.narrative,
          input.primaryCategory || null,
          input.additionalCategories && input.additionalCategories.length ? input.additionalCategories : null,
          input.isConfidential || false,
          input.incidentDate,
          input.incidentTime,
          input.roomStreet || null,
          input.building || null,
          input.floor || null,
          input.department || null,
          input.areaType || null,
          input.areaSecured || false,
          input.shiftSupervisor || null,
          input.officerAtLocation || false,
          input.officerPost || null,
          input.reportingPhone || null,
        ],
      );
      return inserted;
    });

    await audit(req, 'create', 'incidents', result.rows[0].incident_id);
    res.status(201).json({ incident: result.rows[0] });
  } catch (error) {
    next(error);
  }
});
