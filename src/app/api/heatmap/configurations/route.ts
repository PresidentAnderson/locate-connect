import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  HeatMapConfiguration,
  HeatMapFilters,
  MapSettings,
  LayerVisibility,
} from "@/types/heatmap.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("heat_map_configurations")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching configurations:", error);
      return NextResponse.json(
        { error: "Failed to fetch configurations" },
        { status: 500 }
      );
    }

    const configurations: HeatMapConfiguration[] = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      configurationName: row.configuration_name,
      isDefault: row.is_default,
      filters: row.filters as HeatMapFilters,
      mapSettings: row.map_settings as MapSettings,
      visibleLayers: row.visible_layers as LayerVisibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ configurations });
  } catch (error) {
    console.error("Error in configurations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { configurationName, filters, mapSettings, visibleLayers, isDefault } = body;

    if (!configurationName) {
      return NextResponse.json(
        { error: "Configuration name is required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await supabase
        .from("heat_map_configurations")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { data, error } = await supabase
      .from("heat_map_configurations")
      .insert({
        user_id: user.id,
        configuration_name: configurationName,
        is_default: isDefault || false,
        filters: filters || getDefaultFilters(),
        map_settings: mapSettings || getDefaultMapSettings(),
        visible_layers: visibleLayers || getDefaultVisibleLayers(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A configuration with this name already exists" },
          { status: 409 }
        );
      }
      console.error("Error creating configuration:", error);
      return NextResponse.json(
        { error: "Failed to create configuration" },
        { status: 500 }
      );
    }

    const configuration: HeatMapConfiguration = {
      id: data.id,
      userId: data.user_id,
      configurationName: data.configuration_name,
      isDefault: data.is_default,
      filters: data.filters,
      mapSettings: data.map_settings,
      visibleLayers: data.visible_layers,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ configuration }, { status: 201 });
  } catch (error) {
    console.error("Error in configurations POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, configurationName, filters, mapSettings, visibleLayers, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("heat_map_configurations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await supabase
        .from("heat_map_configurations")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", id);
    }

    const updateData: Record<string, unknown> = {};
    if (configurationName) updateData.configuration_name = configurationName;
    if (filters) updateData.filters = filters;
    if (mapSettings) updateData.map_settings = mapSettings;
    if (visibleLayers) updateData.visible_layers = visibleLayers;
    if (typeof isDefault === "boolean") updateData.is_default = isDefault;

    const { data, error } = await supabase
      .from("heat_map_configurations")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating configuration:", error);
      return NextResponse.json(
        { error: "Failed to update configuration" },
        { status: 500 }
      );
    }

    const configuration: HeatMapConfiguration = {
      id: data.id,
      userId: data.user_id,
      configurationName: data.configuration_name,
      isDefault: data.is_default,
      filters: data.filters,
      mapSettings: data.map_settings,
      visibleLayers: data.visible_layers,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ configuration });
  } catch (error) {
    console.error("Error in configurations PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("heat_map_configurations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting configuration:", error);
      return NextResponse.json(
        { error: "Failed to delete configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in configurations DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getDefaultFilters(): HeatMapFilters {
  return {
    caseTypes: [],
    ageGroups: [],
    timeFrame: "all",
    dispositions: [],
    sources: [],
    dateRange: undefined,
  };
}

function getDefaultMapSettings(): MapSettings {
  return {
    centerLat: 46.8139,
    centerLng: -71.2082,
    zoomLevel: 6,
    mapStyle: "streets",
    heatMapIntensity: 0.7,
    heatMapRadius: 30,
    showClusters: true,
    showPatterns: true,
  };
}

function getDefaultVisibleLayers(): LayerVisibility {
  return {
    allResolutions: true,
    byDisposition: false,
    bySource: false,
    byTimePattern: false,
    byDemographic: false,
  };
}
