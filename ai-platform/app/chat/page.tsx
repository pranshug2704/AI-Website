import ClientChatPage from './client-page';
import { getCurrentUser } from '../lib/server-auth';

export default async function ChatPage() {
  // Check server-side authentication
  const user = await getCurrentUser();
  console.log("[ChatPage] Server-side auth check:", { 
    authenticated: !!user,
    userId: user?.id
  });
  
  return <ClientChatPage />;
}