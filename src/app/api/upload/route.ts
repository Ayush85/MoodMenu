import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectImageContentType, uploadImage, type SupportedImageType } from "@/lib/storage";
import { withApiLogging } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const POST = withApiLogging(async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestLimit = checkRateLimit(`upload:${session.user.id}`, 30, 60 * 60 * 1000);
  if (!requestLimit.allowed) {
    return NextResponse.json({ error: "Upload limit reached. Please try again later." }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const detectedType = detectImageContentType(buffer);

  if (!detectedType || detectedType !== file.type) {
    return NextResponse.json({ error: "The uploaded file is not a valid image of the declared type." }, { status: 400 });
  }

  try {
    const url = await uploadImage(buffer, detectedType as SupportedImageType);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
});
