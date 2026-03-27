import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const reports = await base44.asServiceRole.entities.CampaignReport.list();
    return Response.json({ reports });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});