import { useEffect, useState } from "react";
import { UsageSummaryDto } from "@crm-chatbot/shared-types";
import { usageApi } from "../../api/endpoints";

export function UsageTab({ websiteId }: { websiteId: string }) {
  const [summary, setSummary] = useState<UsageSummaryDto | null>(null);

  useEffect(() => {
    usageApi.get(websiteId).then(setSummary);
  }, [websiteId]);

  if (!summary) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <h3>Usage</h3>
      <table>
        <tbody>
          <tr>
            <td>Chat sessions</td>
            <td>{summary.totalChatSessions}</td>
          </tr>
          <tr>
            <td>Messages</td>
            <td>{summary.totalMessages}</td>
          </tr>
          <tr>
            <td>Documents indexed</td>
            <td>{summary.documentsIndexed}</td>
          </tr>
          <tr>
            <td>URLs indexed</td>
            <td>{summary.urlsIndexed}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
