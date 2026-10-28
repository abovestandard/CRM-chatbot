import { ChangeEvent, useEffect, useState } from "react";
import { DocumentDto } from "@crm-chatbot/shared-types";
import { documentsApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

export function DocumentsTab({ websiteId }: { websiteId: string }) {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    documentsApi.list(websiteId).then(setDocuments);
  }

  useEffect(refresh, [websiteId]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await documentsApi.upload(websiteId, file);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    await documentsApi.remove(websiteId, id);
    refresh();
  }

  return (
    <div className="card">
      <h3>Documents</h3>
      <p style={{ color: "#666", fontSize: 14 }}>
        Supported: PDF, DOC/DOCX, TXT, CSV. Parsing and indexing land in Phase 2 — uploads are
        stored and tracked as "Pending" for now.
      </p>
      <input type="file" accept=".pdf,.doc,.docx,.txt,.csv" onChange={handleUpload} disabled={uploading} />
      {error && <p className="error">{error}</p>}

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Type</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id}>
              <td>{d.filename}</td>
              <td>{d.fileType}</td>
              <td>
                <span className="badge">{d.status}</span>
              </td>
              <td>
                <button className="secondary" onClick={() => handleDelete(d.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
