import { NextRequest, NextResponse } from "next/server";

import { mutationErrorResponse } from "@/lib/http/api-error";
import {
  getStudioResource,
  getStudioResourceCount,
  getStudioResources,
} from "@/modules/resources/application/queries";
import { createGenericResource } from "@/modules/resources/application/resource-service";
import {
  resourceStatuses,
  resourceTypes,
  type ResourceStatus,
  type ResourceType,
} from "@/modules/resources/domain/types";


export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requestedTypes = params.get("types")?.split(",").filter(Boolean) ?? [];
    const types = requestedTypes.filter((type): type is ResourceType =>
      resourceTypes.includes(type as ResourceType)
    );
    const requestedStatus = params.get("status");
    const status = requestedStatus && resourceStatuses.includes(requestedStatus as ResourceStatus)
      ? requestedStatus as ResourceStatus
      : undefined;
    const limit = Number.parseInt(params.get("limit") || "50");
    const offset = Number.parseInt(params.get("offset") || "0");
    const search = params.get("search") || undefined;
    const options = { types: types.length ? types : undefined, status, search };
    const [items, total] = await Promise.all([
      getStudioResources({ ...options, limit, offset }),
      getStudioResourceCount(options),
    ]);
    return NextResponse.json({ resources: items, total, limit, offset });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const created = await createGenericResource(await request.json());
    return NextResponse.json(await getStudioResource(created.id), { status: 201 });
  } catch (error) {
    console.error("Error creating resource:", error);
    return mutationErrorResponse(error, "Failed to create resource");
  }
}
