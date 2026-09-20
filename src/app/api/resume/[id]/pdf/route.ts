import { NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/session";
import { AuthorizationError, NotFoundError } from "@/server/auth/guards";
import { PdfService } from "@/services/pdf.service";

/** react-pdf needs the Node runtime; it does not run on the edge. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const { buffer, filename } = await PdfService.renderResume(user.id, id);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        // `inline` lets the browser preview it; the download attribute on the
        // link still saves it with this name.
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(buffer.byteLength),
        // A resume is personal, and it changes as the profile changes.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // Someone else's resume is reported as missing, not as forbidden, so ids
    // cannot be probed for existence.
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    console.error("[resume pdf]", error);
    return NextResponse.json(
      { error: "Could not generate that PDF." },
      { status: 500 },
    );
  }
}
