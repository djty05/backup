import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { campaignData, slug } = await req.json();

    const report = await base44.asServiceRole.entities.CampaignReport.create({
      ...campaignData,
      report_slug: slug,
      status: campaignData.status || "Processing",
    });

    return Response.json({ success: true, reportId: report.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});