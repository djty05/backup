import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { campaignName, brandName, creatorName, deliverableName, files } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Helper: create a Drive folder
    async function createFolder(name, parentId) {
      const meta = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {})
      };
      const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      });
      return await res.json();
    }

    // Helper: upload a file to Drive
    async function uploadFile(fileName, base64Data, mimeType, parentId) {
      // Strip the data URL prefix if present
      const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const metadata = JSON.stringify({ name: fileName, parents: [parentId] });
      const boundary = 'ga_boundary_' + Date.now();

      const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
      const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64}\r\n--${boundary}--`;
      const body = metaPart + filePart;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      });
      return await res.json();
    }

    // Build folder structure: GA Campaigns > {Campaign} - {Brand} > {Creator} > {Deliverable}
    const campaignFolderName = `${campaignName} - ${brandName}`;
    
    // Create campaign folder
    const campaignFolder = await createFolder(campaignFolderName);
    
    // Create creator subfolder
    const creatorFolder = await createFolder(creatorName, campaignFolder.id);
    
    // Create deliverable subfolder
    const deliverableFolder = await createFolder(deliverableName, creatorFolder.id);

    // Upload all files
    const uploadedFiles = [];
    for (const file of files || []) {
      const uploaded = await uploadFile(file.name, file.base64, file.mimeType || 'image/jpeg', deliverableFolder.id);
      uploadedFiles.push(uploaded);
    }

    return Response.json({
      success: true,
      campaignFolderUrl: campaignFolder.webViewLink,
      creatorFolderUrl: creatorFolder.webViewLink,
      deliverableFolderUrl: deliverableFolder.webViewLink,
      filesUploaded: uploadedFiles.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});