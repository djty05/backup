import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { base64, filename, mimeType } = await req.json();

    if (!base64) {
      return Response.json({ error: 'No file data provided' }, { status: 400 });
    }

    // Decode base64 to binary
    const b64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const file = new File([bytes], filename || 'upload', { type: mimeType || 'application/octet-stream' });
    // Use service role so auth is not required from the caller
    const result = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ file_url: result.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});