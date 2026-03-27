import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { id, slug } = await req.json();

    let report = null;

    if (id) {
      report = await base44.asServiceRole.entities.CampaignReport.get(id);
    } else if (slug) {
      const results = await base44.asServiceRole.entities.CampaignReport.filter({ report_slug: slug });
      report = results?.[0] || null;
    }

    if (!report) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});