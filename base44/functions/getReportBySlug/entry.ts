import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const { slug } = await req.json();

    if (!slug) {
      return Response.json({ error: 'No slug provided' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const results = await base44.asServiceRole.entities.CampaignReport.filter({ report_slug: slug });
    const report = results?.[0] || null;

    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    return Response.json({ report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});