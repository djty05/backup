import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportId } = await req.json();

    if (!reportId) {
      return Response.json({ error: 'No report ID provided' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.CampaignReport.get(reportId);
    if (existing?.status === 'Sent') {
      return Response.json({ error: 'Cannot delete a report that has been marked as Sent' }, { status: 403 });
    }

    await base44.asServiceRole.entities.CampaignReport.delete(reportId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});