import { createClient } from "@/lib/supabase/server";
import { generateFeedbackStream } from "@/lib/claude";
import type { FeedbackRequest } from "@/lib/claude";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body: FeedbackRequest = await request.json();

  // Validate required fields
  if (!body.referenceText || !body.transcript) {
    return new Response("Missing referenceText or transcript", { status: 400 });
  }

  // Stream Claude's response back to the client
  const stream = await generateFeedbackStream(body);

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of stream) {
          controller.enqueue(encoder.encode(token));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
