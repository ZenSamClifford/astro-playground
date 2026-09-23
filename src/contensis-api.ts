import { NodejsClient } from 'contensis-management-api/lib/client';
import { PUBLIC_PROJECT } from 'astro:env/client';
import { CONTENSIS_CLIENT_ID, CONTENSIS_CLIENT_SECRET } from 'astro:env/server';

export const MgmtApi = new NodejsClient({
  rootUrl: import.meta.env.CONTENSIS_API_URL as string,
  projectId: PUBLIC_PROJECT,
  clientType: "client_credentials",
  clientDetails: {
    clientId: CONTENSIS_CLIENT_ID as string,
    clientSecret: CONTENSIS_CLIENT_SECRET as string,
  },
});