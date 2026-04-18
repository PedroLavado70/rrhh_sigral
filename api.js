import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-app-name': 'sigral-netlify' } }
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function parsePath(pathname = '') {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '');
  const parts = cleaned.split('/');
  const apiIndex = parts.indexOf('api');
  return apiIndex >= 0 ? parts.slice(apiIndex + 1) : parts;
}

async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function mapEmployee(body = {}) {
  return {
    code: body.code,
    dni: body.dni ?? null,
    first_name: body.first_name ?? body.nombres ?? '',
    last_name: body.last_name ?? body.apellidos ?? '',
    email: body.email ?? null,
    phone: body.phone ?? body.telefono ?? null,
    profession: body.profession ?? body.profesion ?? null,
    specialty: body.specialty ?? body.especialidad ?? null,
    position: body.position ?? body.cargo ?? null,
    area: body.area ?? null,
    salary: body.salary ?? body.salario ?? null,
    status: body.status ?? body.estado ?? 'Activo',
    contract_type: body.contract_type ?? body.tipo_contrato ?? null,
    start_date: body.start_date ?? body.fecha_ingreso ?? null,
    contract_end_date: body.contract_end_date ?? body.fin_contrato ?? null,
    notes: body.notes ?? body.observaciones ?? null,
    updated_by: body.updated_by ?? null,
    created_by: body.created_by ?? null
  };
}

function mapProject(body = {}) {
  return {
    code: body.code,
    name: body.name ?? body.nombre ?? '',
    client: body.client ?? body.cliente ?? null,
    sector: body.sector ?? null,
    project_type: body.project_type ?? body.tipo ?? null,
    status: body.status ?? body.estado ?? 'Formulación',
    start_date: body.start_date ?? body.fecha_inicio ?? null,
    end_date: body.end_date ?? body.fecha_fin ?? null,
    amount: body.amount ?? body.monto ?? null,
    required_resources: body.required_resources ?? body.recursos_req ?? 0,
    location: body.location ?? body.ubicacion ?? null,
    manager_name: body.manager_name ?? body.gerente ?? null,
    description: body.description ?? body.descripcion ?? null,
    updated_by: body.updated_by ?? null,
    created_by: body.created_by ?? null
  };
}

function mapAssignment(body = {}) {
  return {
    project_id: body.project_id,
    employee_id: body.employee_id,
    role_name: body.role_name ?? body.puesto ?? null,
    participation_pct: body.participation_pct ?? body.pct_participacion ?? 100,
    start_date: body.start_date ?? body.fecha_inicio,
    end_date: body.end_date ?? body.fecha_fin ?? null,
    notes: body.notes ?? body.observaciones ?? null,
    updated_by: body.updated_by ?? null,
    created_by: body.created_by ?? null
  };
}

async function handleEmployees(method, id, req) {
  if (method === 'GET') {
    const { data, error } = id
      ? await supabase.from('employees').select('*').eq('id', id).single()
      : await supabase.from('employees').select('*').order('last_name').order('first_name');
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  const body = await readBody(req);

  if (method === 'POST') {
    const payload = mapEmployee(body);
    const { data, error } = await supabase.from('employees').insert(payload).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data }, 201);
  }

  if (method === 'PUT' && id) {
    const payload = mapEmployee(body);
    delete payload.created_by;
    const { data, error } = await supabase.from('employees').update(payload).eq('id', id).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  if (method === 'DELETE' && id) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: 'Unsupported employees operation' }, 405);
}

async function handleProjects(method, id, req) {
  if (method === 'GET') {
    const { data, error } = id
      ? await supabase.from('projects').select('*').eq('id', id).single()
      : await supabase.from('projects').select('*').order('start_date', { ascending: false, nullsFirst: false });
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  const body = await readBody(req);

  if (method === 'POST') {
    const payload = mapProject(body);
    const { data, error } = await supabase.from('projects').insert(payload).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data }, 201);
  }

  if (method === 'PUT' && id) {
    const payload = mapProject(body);
    delete payload.created_by;
    const { data, error } = await supabase.from('projects').update(payload).eq('id', id).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  if (method === 'DELETE' && id) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: 'Unsupported projects operation' }, 405);
}

async function handleAssignments(method, id, req) {
  if (method === 'GET') {
    const query = supabase
      .from('assignments')
      .select(`
        *,
        employee:employees(id, code, first_name, last_name, position, profession, status),
        project:projects(id, code, name, sector, status)
      `)
      .order('start_date', { ascending: false });

    const { data, error } = id ? await query.eq('id', id).single() : await query;
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  const body = await readBody(req);

  if (method === 'POST') {
    const payload = mapAssignment(body);
    const { data, error } = await supabase.from('assignments').insert(payload).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data }, 201);
  }

  if (method === 'PUT' && id) {
    const payload = mapAssignment(body);
    delete payload.created_by;
    const { data, error } = await supabase.from('assignments').update(payload).eq('id', id).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  if (method === 'DELETE' && id) {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: 'Unsupported assignments operation' }, 405);
}

async function handleDashboard() {
  const [{ count: employees }, { count: projects }, { count: assignments }] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('assignments').select('*', { count: 'exact', head: true })
  ]);
  return json({ data: { employees, projects, assignments } });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const parts = parsePath(new URL(req.url).pathname);
    const [resource, id] = parts;

    if (resource === 'employees') return handleEmployees(req.method, id, req);
    if (resource === 'projects') return handleProjects(req.method, id, req);
    if (resource === 'assignments') return handleAssignments(req.method, id, req);
    if (resource === 'dashboard') return handleDashboard();

    return json({
      ok: true,
      routes: [
        'GET /api/employees',
        'POST /api/employees',
        'PUT /api/employees/:id',
        'DELETE /api/employees/:id',
        'GET /api/projects',
        'POST /api/projects',
        'PUT /api/projects/:id',
        'DELETE /api/projects/:id',
        'GET /api/assignments',
        'POST /api/assignments',
        'PUT /api/assignments/:id',
        'DELETE /api/assignments/:id',
        'GET /api/dashboard'
      ]
    });
  } catch (error) {
    return json({ error: error.message ?? 'Unexpected server error' }, 500);
  }
};
