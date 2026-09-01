import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { guardarRelatorioPdf } from "@/lib/storage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "ficheiro em falta" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "só são aceites ficheiros PDF" }, { status: 400 });

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const { path } = await guardarRelatorioPdf({ intakeId: id, filename: file.name, bytes, contentType: file.type });
    return NextResponse.json({ ok: true, path });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
